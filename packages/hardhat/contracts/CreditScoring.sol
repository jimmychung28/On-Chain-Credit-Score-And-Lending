// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CreditScoring
 * @dev On-chain credit scoring protocol that calculates creditworthiness based on blockchain data
 */
contract CreditScoring is Ownable, ReentrancyGuard {

    struct CreditProfile {
        uint256 score;           // Credit score (0-850)
        uint256 totalVolume;     // Total transaction volume in wei
        uint256 transactionCount; // Total number of transactions
        uint256 avgTransactionValue; // Average transaction value
        uint256 accountAge;      // Age of account in blocks
        uint256 lastUpdated;     // Last score update timestamp
        bool isActive;           // Whether the profile is active
        uint256 loanCount;       // Number of loans taken
        uint256 repaidLoans;     // Number of successfully repaid loans
        uint256 defaultedLoans;  // Number of defaulted loans
    }

    struct TransactionData {
        uint256 volume;
        uint256 frequency;
        uint256 timestamp;
        address counterparty;
    }

    // Mappings
    mapping(address => CreditProfile) public creditProfiles;
    mapping(address => TransactionData[]) public userTransactions;
    mapping(address => bool) public verifiedAddresses;
    mapping(address => uint256) public stakingBalances;
    
    // Constants for scoring algorithm
    uint256 public constant MAX_SCORE = 850;
    uint256 public constant MIN_SCORE = 300;
    uint256 public constant SCORE_PRECISION = 100;
    
    // Weights for different factors (sum should equal 100)
    uint256 public volumeWeight = 25;       // 25%
    uint256 public frequencyWeight = 20;    // 20%
    uint256 public ageWeight = 15;          // 15%
    uint256 public repaymentWeight = 30;    // 30%
    uint256 public stakingWeight = 10;      // 10%

    // Events
    event CreditScoreUpdated(address indexed user, uint256 newScore, uint256 timestamp);
    event UserRegistered(address indexed user, uint256 timestamp);
    event TransactionRecorded(address indexed user, uint256 volume, uint256 timestamp);
    event LoanRecorded(address indexed borrower, uint256 amount, bool repaid);
    event StakeDeposited(address indexed user, uint256 amount);
    event StakeWithdrawn(address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a new user in the credit scoring system
     */
    function registerUser() external {
        require(!creditProfiles[msg.sender].isActive, "User already registered");
        
        creditProfiles[msg.sender] = CreditProfile({
            score: MIN_SCORE,
            totalVolume: 0,
            transactionCount: 0,
            avgTransactionValue: 0,
            accountAge: block.number,
            lastUpdated: block.timestamp,
            isActive: true,
            loanCount: 0,
            repaidLoans: 0,
            defaultedLoans: 0
        });

        emit UserRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Record a transaction for credit scoring (called by user or authorized contracts)
     */
    function recordTransaction(address user, uint256 volume, address counterparty) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(msg.sender == user || verifiedAddresses[msg.sender], "Unauthorized");

        userTransactions[user].push(TransactionData({
            volume: volume,
            frequency: 1,
            timestamp: block.timestamp,
            counterparty: counterparty
        }));

        // Update profile
        CreditProfile storage profile = creditProfiles[user];
        profile.totalVolume = profile.totalVolume+(volume);
        profile.transactionCount = profile.transactionCount+(1);
        profile.avgTransactionValue = profile.totalVolume/(profile.transactionCount);

        emit TransactionRecorded(user, volume, block.timestamp);
        
        // Trigger score update
        _updateCreditScore(user);
    }

    /**
     * @dev Record loan information
     */
    function recordLoan(address borrower, uint256 amount, bool repaid) external {
        require(verifiedAddresses[msg.sender], "Only verified contracts can record loans");
        require(creditProfiles[borrower].isActive, "Borrower not registered");

        CreditProfile storage profile = creditProfiles[borrower];
        profile.loanCount = profile.loanCount+(1);
        
        if (repaid) {
            profile.repaidLoans = profile.repaidLoans+(1);
        } else {
            profile.defaultedLoans = profile.defaultedLoans+(1);
        }

        emit LoanRecorded(borrower, amount, repaid);
        _updateCreditScore(borrower);
    }

    /**
     * @dev Deposit ETH as stake to improve credit score
     */
    function depositStake() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        require(creditProfiles[msg.sender].isActive, "User not registered");

        stakingBalances[msg.sender] = stakingBalances[msg.sender]+(msg.value);
        emit StakeDeposited(msg.sender, msg.value);
        
        _updateCreditScore(msg.sender);
    }

    /**
     * @dev Withdraw staked ETH
     */
    function withdrawStake(uint256 amount) external nonReentrant {
        require(stakingBalances[msg.sender] >= amount, "Insufficient stake balance");
        
        stakingBalances[msg.sender] = stakingBalances[msg.sender]-(amount);
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit StakeWithdrawn(msg.sender, amount);
        _updateCreditScore(msg.sender);
    }

    /**
     * @dev Internal function to calculate and update credit score
     */
    function _updateCreditScore(address user) internal {
        CreditProfile storage profile = creditProfiles[user];
        
        uint256 volumeScore = _calculateVolumeScore(profile.totalVolume);
        uint256 frequencyScore = _calculateFrequencyScore(profile.transactionCount);
        uint256 ageScore = _calculateAgeScore(block.number-(profile.accountAge));
        uint256 repaymentScore = _calculateRepaymentScore(profile.repaidLoans, profile.defaultedLoans);
        uint256 stakingScore = _calculateStakingScore(stakingBalances[user]);

        uint256 weightedScore = (volumeScore*(volumeWeight)
            +(frequencyScore*(frequencyWeight))
            +(ageScore*(ageWeight))
            +(repaymentScore*(repaymentWeight))
            +(stakingScore*(stakingWeight)))
            /(100);

        // Ensure score is within bounds
        if (weightedScore > MAX_SCORE) {
            weightedScore = MAX_SCORE;
        } else if (weightedScore < MIN_SCORE) {
            weightedScore = MIN_SCORE;
        }

        profile.score = weightedScore;
        profile.lastUpdated = block.timestamp;

        emit CreditScoreUpdated(user, weightedScore, block.timestamp);
    }

    /**
     * @dev Calculate volume-based score component
     */
    function _calculateVolumeScore(uint256 totalVolume) internal pure returns (uint256) {
        // Convert volume to score (0-850 range)
        // Higher volume = higher score, with diminishing returns
        if (totalVolume == 0) return MIN_SCORE;
        
        uint256 volumeInEth = totalVolume/(1 ether);
        if (volumeInEth >= 1000) return MAX_SCORE;
        
        return MIN_SCORE+((volumeInEth*(550)/(1000))); // Scale to 300-850 range
    }

    /**
     * @dev Calculate frequency-based score component
     */
    function _calculateFrequencyScore(uint256 transactionCount) internal pure returns (uint256) {
        if (transactionCount == 0) return MIN_SCORE;
        if (transactionCount >= 100) return MAX_SCORE;
        
        return MIN_SCORE+((transactionCount*(550)/(100)));
    }

    /**
     * @dev Calculate age-based score component
     */
    function _calculateAgeScore(uint256 accountAgeBlocks) internal pure returns (uint256) {
        // Assuming ~13.12 seconds per block, 1 year ≈ 2,425,846 blocks
        if (accountAgeBlocks == 0) return MIN_SCORE;
        if (accountAgeBlocks >= 2425846) return MAX_SCORE; // 1 year+
        
        return MIN_SCORE+((accountAgeBlocks*(550)/(2425846)));
    }

    /**
     * @dev Calculate repayment history score component
     */
    function _calculateRepaymentScore(uint256 repaidLoans, uint256 defaultedLoans) internal pure returns (uint256) {
        uint256 totalLoans = repaidLoans+(defaultedLoans);
        if (totalLoans == 0) return MIN_SCORE+(550*50/100); // Neutral 50% score for no history
        
        uint256 repaymentRate = repaidLoans*(100)/(totalLoans);
        return MIN_SCORE+((repaymentRate*(550)/(100)));
    }

    /**
     * @dev Calculate staking score component
     */
    function _calculateStakingScore(uint256 stakedAmount) internal pure returns (uint256) {
        if (stakedAmount == 0) return MIN_SCORE;
        
        uint256 stakedInEth = stakedAmount/(1 ether);
        if (stakedInEth >= 10) return MAX_SCORE;
        
        return MIN_SCORE+((stakedInEth*(550)/(10)));
    }

    /**
     * @dev Get credit score for a user
     */
    function getCreditScore(address user) external view returns (uint256) {
        require(creditProfiles[user].isActive, "User not registered");
        return creditProfiles[user].score;
    }

    /**
     * @dev Get complete credit profile
     */
    function getCreditProfile(address user) external view returns (CreditProfile memory) {
        require(creditProfiles[user].isActive, "User not registered");
        return creditProfiles[user];
    }

    /**
     * @dev Check if user is eligible for a loan based on minimum credit score
     */
    function isEligibleForLoan(address user, uint256 minScore) external view returns (bool) {
        if (!creditProfiles[user].isActive) return false;
        return creditProfiles[user].score >= minScore;
    }

    /**
     * @dev Add verified address (only owner)
     */
    function addVerifiedAddress(address addr) external onlyOwner {
        verifiedAddresses[addr] = true;
    }

    /**
     * @dev Remove verified address (only owner)
     */
    function removeVerifiedAddress(address addr) external onlyOwner {
        verifiedAddresses[addr] = false;
    }

    /**
     * @dev Update scoring weights (only owner)
     */
    function updateWeights(
        uint256 _volumeWeight,
        uint256 _frequencyWeight,
        uint256 _ageWeight,
        uint256 _repaymentWeight,
        uint256 _stakingWeight
    ) external onlyOwner {
        require(
            _volumeWeight+(_frequencyWeight)+(_ageWeight)+(_repaymentWeight)+(_stakingWeight) == 100,
            "Weights must sum to 100"
        );
        
        volumeWeight = _volumeWeight;
        frequencyWeight = _frequencyWeight;
        ageWeight = _ageWeight;
        repaymentWeight = _repaymentWeight;
        stakingWeight = _stakingWeight;
    }

    /**
     * @dev Get user's transaction history length
     */
    function getTransactionHistoryLength(address user) external view returns (uint256) {
        return userTransactions[user].length;
    }

    /**
     * @dev Get specific transaction data
     */
    function getTransaction(address user, uint256 index) external view returns (TransactionData memory) {
        require(index < userTransactions[user].length, "Transaction index out of bounds");
        return userTransactions[user][index];
    }
} 