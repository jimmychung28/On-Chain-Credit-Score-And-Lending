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
        uint256 score; // Credit score (300-850)
        uint256 totalVolume; // Total transaction volume in wei
        uint256 transactionCount; // Total number of transactions
        uint256 avgTransactionValue; // Average transaction value
        uint256 accountAge; // Age of account in blocks
        uint256 lastUpdated; // Last score update timestamp
        bool isActive; // Whether the profile is active
        uint256 loanCount; // Number of loans taken
        uint256 repaidLoans; // Number of successfully repaid loans
        uint256 defaultedLoans; // Number of defaulted loans
        // Enhanced factors
        uint256 totalGasPaid; // Total gas fees paid (indicates transaction urgency/value)
        uint256 uniqueProtocols; // Number of unique protocols interacted with
        uint256 stablecoinRatio; // Percentage of holdings in stablecoins (0-100)
        uint256 assetDiversity; // Number of different tokens held
        uint256 avgHoldingPeriod; // Average time assets are held (in blocks)
        uint256 liquidityProvided; // Total liquidity provided to DEXs
        uint256 stakingRewards; // Total staking rewards earned
        uint256 governanceVotes; // Number of governance proposals voted on
        uint256 nftInteractions; // Number of NFT transactions
        uint256 socialScore; // Social/reputation score from attestations
    }

    struct TransactionData {
        uint256 volume;
        uint256 gasUsed;
        uint256 timestamp;
        address counterparty;
        bytes4 methodSignature; // Function signature called
        uint8 transactionType; // 0=transfer, 1=DeFi, 2=NFT, 3=governance, etc.
    }

    struct ProtocolInteraction {
        address protocol;
        uint256 interactionCount;
        uint256 totalVolume;
        uint256 firstInteraction;
        uint256 lastInteraction;
    }

    struct AssetHolding {
        address token;
        uint256 amount;
        uint256 acquisitionTime;
        bool isStablecoin;
    }

    // Mappings
    mapping(address => CreditProfile) public creditProfiles;
    mapping(address => TransactionData[]) public userTransactions;
    mapping(address => bool) public verifiedAddresses;
    mapping(address => uint256) public stakingBalances;

    // Enhanced tracking mappings
    mapping(address => mapping(address => ProtocolInteraction)) public protocolInteractions;
    mapping(address => AssetHolding[]) public assetHoldings;
    mapping(address => mapping(bytes32 => bool)) public attestations;
    mapping(address => uint256) public liquidityPositions;
    mapping(address => uint256) public governanceParticipation;
    mapping(address => uint256) public nftActivity;

    // Constants for scoring algorithm
    uint256 public constant MAX_SCORE = 850;
    uint256 public constant MIN_SCORE = 300;
    uint256 public constant SCORE_PRECISION = 100;

    // Enhanced scoring weights (sum should equal 100)
    uint256 public transactionalWeight = 20; // 20% - Transaction volume & frequency
    uint256 public behavioralWeight = 15; // 15% - Gas patterns & protocol diversity
    uint256 public assetWeight = 15; // 15% - Asset holdings & diversity
    uint256 public defiWeight = 20; // 20% - DeFi participation & liquidity provision
    uint256 public repaymentWeight = 20; // 20% - Loan repayment history
    uint256 public governanceWeight = 5; // 5% - DAO participation
    uint256 public socialWeight = 5; // 5% - Social attestations & reputation

    // Events
    event CreditScoreUpdated(address indexed user, uint256 newScore, uint256 timestamp);
    event UserRegistered(address indexed user, uint256 timestamp);
    event TransactionRecorded(address indexed user, uint256 volume, uint256 gasUsed, uint8 txType);
    event LoanRecorded(address indexed borrower, uint256 amount, bool repaid);
    event StakeDeposited(address indexed user, uint256 amount);
    event StakeWithdrawn(address indexed user, uint256 amount);
    event ProtocolInteractionRecorded(address indexed user, address indexed protocol, uint256 volume);
    event AssetHoldingUpdated(address indexed user, address indexed token, uint256 amount);
    event AttestationAdded(address indexed user, bytes32 indexed attestationType);
    event GovernanceParticipation(address indexed user, uint256 proposalCount);

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
            defaultedLoans: 0,
            totalGasPaid: 0,
            uniqueProtocols: 0,
            stablecoinRatio: 0,
            assetDiversity: 0,
            avgHoldingPeriod: 0,
            liquidityProvided: 0,
            stakingRewards: 0,
            governanceVotes: 0,
            nftInteractions: 0,
            socialScore: 0
        });

        emit UserRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Record a sophisticated transaction for credit scoring
     */
    function recordTransaction(
        address user,
        uint256 volume,
        uint256 gasUsed,
        address counterparty,
        bytes4 methodSignature,
        uint8 transactionType
    ) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(msg.sender == user || verifiedAddresses[msg.sender], "Unauthorized");

        userTransactions[user].push(
            TransactionData({
                volume: volume,
                gasUsed: gasUsed,
                timestamp: block.timestamp,
                counterparty: counterparty,
                methodSignature: methodSignature,
                transactionType: transactionType
            })
        );

        // Update profile
        CreditProfile storage profile = creditProfiles[user];
        profile.totalVolume = profile.totalVolume + (volume);
        profile.transactionCount = profile.transactionCount + (1);
        profile.avgTransactionValue = profile.totalVolume / (profile.transactionCount);
        profile.totalGasPaid = profile.totalGasPaid + (gasUsed);

        // Update protocol interaction if it's a contract call
        if (counterparty != address(0) && counterparty.code.length > 0) {
            _updateProtocolInteraction(user, counterparty, volume);
        }

        // Update specific activity counters
        if (transactionType == 2) {
            // NFT transaction
            profile.nftInteractions = profile.nftInteractions + (1);
        }

        emit TransactionRecorded(user, volume, gasUsed, transactionType);

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
        profile.loanCount = profile.loanCount + (1);

        if (repaid) {
            profile.repaidLoans = profile.repaidLoans + (1);
        } else {
            profile.defaultedLoans = profile.defaultedLoans + (1);
        }

        emit LoanRecorded(borrower, amount, repaid);
        _updateCreditScore(borrower);
    }

    /**
     * @dev Deposit ETH as stake (ONLY for yield, not for credit scoring)
     * This function is kept for backward compatibility but staking no longer affects credit score
     */
    function depositStake() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        require(creditProfiles[msg.sender].isActive, "User not registered");

        stakingBalances[msg.sender] = stakingBalances[msg.sender] + (msg.value);
        emit StakeDeposited(msg.sender, msg.value);

        // NOTE: No longer updates credit score - staking is purely for yield now
        // _updateCreditScore(msg.sender);
    }

    /**
     * @dev Withdraw staked ETH (no longer affects credit score)
     */
    function withdrawStake(uint256 amount) external nonReentrant {
        require(stakingBalances[msg.sender] >= amount, "Insufficient stake balance");

        stakingBalances[msg.sender] = stakingBalances[msg.sender] - (amount);

        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "Transfer failed");

        emit StakeWithdrawn(msg.sender, amount);
        // NOTE: No longer updates credit score - staking is purely for yield now
        // _updateCreditScore(msg.sender);
    }

    /**
     * @dev Internal function to calculate and update sophisticated credit score
     */
    function _updateCreditScore(address user) internal {
        CreditProfile storage profile = creditProfiles[user];

        // Calculate individual score components
        uint256 transactionalScore = _calculateTransactionalScore(profile);
        uint256 behavioralScore = _calculateBehavioralScore(profile);
        uint256 assetScore = _calculateAssetScore(profile);
        uint256 defiScore = _calculateDeFiScore(profile);
        uint256 repaymentScore = _calculateRepaymentScore(profile.repaidLoans, profile.defaultedLoans);
        uint256 governanceScore = _calculateGovernanceScore(profile);
        uint256 socialScore = _calculateSocialScore(profile);

        // Calculate weighted score
        uint256 weightedScore = (transactionalScore *
            transactionalWeight +
            behavioralScore *
            behavioralWeight +
            assetScore *
            assetWeight +
            defiScore *
            defiWeight +
            repaymentScore *
            repaymentWeight +
            governanceScore *
            governanceWeight +
            socialScore *
            socialWeight) / 100;

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
     * @dev Calculate transactional behavior score (volume + frequency + account age)
     */
    function _calculateTransactionalScore(CreditProfile memory profile) internal view returns (uint256) {
        uint256 volumeScore = _calculateVolumeScore(profile.totalVolume);
        uint256 frequencyScore = _calculateFrequencyScore(profile.transactionCount);
        uint256 ageScore = _calculateAgeScore(block.number - profile.accountAge);

        // Weighted average of transactional factors
        return (volumeScore * 40 + frequencyScore * 30 + ageScore * 30) / 100;
    }

    /**
     * @dev Calculate behavioral patterns score (gas usage + protocol diversity)
     */
    function _calculateBehavioralScore(CreditProfile memory profile) internal pure returns (uint256) {
        uint256 gasScore = _calculateGasEfficiencyScore(profile.totalGasPaid, profile.transactionCount);
        uint256 diversityScore = _calculateProtocolDiversityScore(profile.uniqueProtocols);

        return (gasScore * 60 + diversityScore * 40) / 100;
    }

    /**
     * @dev Calculate asset management score
     */
    function _calculateAssetScore(CreditProfile memory profile) internal pure returns (uint256) {
        uint256 diversityScore = _calculateAssetDiversityScore(profile.assetDiversity);
        uint256 stabilityScore = _calculateStabilityScore(profile.stablecoinRatio);
        uint256 holdingScore = _calculateHoldingPatternScore(profile.avgHoldingPeriod);

        return (diversityScore * 40 + stabilityScore * 30 + holdingScore * 30) / 100;
    }

    /**
     * @dev Calculate DeFi participation score
     */
    function _calculateDeFiScore(CreditProfile memory profile) internal pure returns (uint256) {
        uint256 liquidityScore = _calculateLiquidityScore(profile.liquidityProvided);
        uint256 stakingScore = _calculateStakingRewardsScore(profile.stakingRewards);

        return (liquidityScore * 70 + stakingScore * 30) / 100;
    }

    /**
     * @dev Calculate governance participation score
     */
    function _calculateGovernanceScore(CreditProfile memory profile) internal pure returns (uint256) {
        if (profile.governanceVotes == 0) return MIN_SCORE;
        if (profile.governanceVotes >= 50) return MAX_SCORE;

        return MIN_SCORE + ((profile.governanceVotes * 550) / 50);
    }

    /**
     * @dev Calculate social reputation score
     */
    function _calculateSocialScore(CreditProfile memory profile) internal pure returns (uint256) {
        // Social score based on attestations and NFT interactions
        uint256 baseScore = MIN_SCORE;
        uint256 socialFactor = profile.socialScore + (profile.nftInteractions * 5);

        if (socialFactor >= 100) return MAX_SCORE;
        return baseScore + ((socialFactor * 550) / 100);
    }

    // Helper functions for individual components
    function _calculateVolumeScore(uint256 totalVolume) internal pure returns (uint256) {
        if (totalVolume == 0) return MIN_SCORE;
        uint256 volumeInEth = totalVolume / 1 ether;
        if (volumeInEth >= 1000) return MAX_SCORE;
        return MIN_SCORE + ((volumeInEth * 550) / 1000);
    }

    function _calculateFrequencyScore(uint256 transactionCount) internal pure returns (uint256) {
        if (transactionCount == 0) return MIN_SCORE;
        if (transactionCount >= 200) return MAX_SCORE;
        return MIN_SCORE + ((transactionCount * 550) / 200);
    }

    function _calculateAgeScore(uint256 accountAgeBlocks) internal pure returns (uint256) {
        if (accountAgeBlocks == 0) return MIN_SCORE;
        if (accountAgeBlocks >= 2425846) return MAX_SCORE; // ~1 year
        return MIN_SCORE + ((accountAgeBlocks * 550) / 2425846);
    }

    function _calculateGasEfficiencyScore(uint256 totalGas, uint256 txCount) internal pure returns (uint256) {
        if (txCount == 0) return MIN_SCORE;
        uint256 avgGas = totalGas / txCount;
        // Higher gas suggests more complex/valuable transactions
        if (avgGas >= 500000) return MAX_SCORE;
        return MIN_SCORE + ((avgGas * 550) / 500000);
    }

    function _calculateProtocolDiversityScore(uint256 uniqueProtocols) internal pure returns (uint256) {
        if (uniqueProtocols == 0) return MIN_SCORE;
        if (uniqueProtocols >= 20) return MAX_SCORE;
        return MIN_SCORE + ((uniqueProtocols * 550) / 20);
    }

    function _calculateAssetDiversityScore(uint256 assetCount) internal pure returns (uint256) {
        if (assetCount == 0) return MIN_SCORE;
        if (assetCount >= 15) return MAX_SCORE;
        return MIN_SCORE + ((assetCount * 550) / 15);
    }

    function _calculateStabilityScore(uint256 stablecoinRatio) internal pure returns (uint256) {
        // Optimal ratio is around 20-40% stablecoins
        if (stablecoinRatio >= 20 && stablecoinRatio <= 40) return MAX_SCORE;
        uint256 deviation = stablecoinRatio > 40 ? stablecoinRatio - 40 : 20 - stablecoinRatio;
        if (deviation >= 60) return MIN_SCORE;
        return MAX_SCORE - ((deviation * 550) / 60);
    }

    function _calculateHoldingPatternScore(uint256 avgHoldingPeriod) internal pure returns (uint256) {
        // Longer holding periods indicate stability
        if (avgHoldingPeriod >= 1000000) return MAX_SCORE; // ~1 month
        return MIN_SCORE + ((avgHoldingPeriod * 550) / 1000000);
    }

    function _calculateLiquidityScore(uint256 liquidityProvided) internal pure returns (uint256) {
        if (liquidityProvided == 0) return MIN_SCORE;
        uint256 liquidityInEth = liquidityProvided / 1 ether;
        if (liquidityInEth >= 100) return MAX_SCORE;
        return MIN_SCORE + ((liquidityInEth * 550) / 100);
    }

    function _calculateStakingRewardsScore(uint256 stakingRewards) internal pure returns (uint256) {
        if (stakingRewards == 0) return MIN_SCORE;
        uint256 rewardsInEth = stakingRewards / 1 ether;
        if (rewardsInEth >= 10) return MAX_SCORE;
        return MIN_SCORE + ((rewardsInEth * 550) / 10);
    }

    /**
     * @dev Calculate repayment history score component
     */
    function _calculateRepaymentScore(uint256 repaidLoans, uint256 defaultedLoans) internal pure returns (uint256) {
        uint256 totalLoans = repaidLoans + (defaultedLoans);
        if (totalLoans == 0) return MIN_SCORE + ((550 * 50) / 100); // Neutral 50% score for no history

        uint256 repaymentRate = (repaidLoans * (100)) / (totalLoans);
        return MIN_SCORE + (((repaymentRate * (550)) / (100)));
    }

    /**
     * @dev Calculate staking score component
     */
    function _calculateStakingScore(uint256 stakedAmount) internal pure returns (uint256) {
        if (stakedAmount == 0) return MIN_SCORE;

        uint256 stakedInEth = stakedAmount / (1 ether);
        if (stakedInEth >= 10) return MAX_SCORE;

        return MIN_SCORE + (((stakedInEth * (550)) / (10)));
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

    // ==================== NEW SOPHISTICATED RECORDING FUNCTIONS ====================

    /**
     * @dev Record protocol interaction
     */
    function recordProtocolInteraction(address user, address protocol, uint256 volume) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(verifiedAddresses[msg.sender], "Unauthorized");

        _updateProtocolInteraction(user, protocol, volume);
        _updateCreditScore(user);
    }

    /**
     * @dev Record asset holding update
     */
    function recordAssetHolding(address user, address token, uint256 amount, bool isStablecoin) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(verifiedAddresses[msg.sender], "Unauthorized");

        _updateAssetHolding(user, token, amount, isStablecoin);
        emit AssetHoldingUpdated(user, token, amount);
        _updateCreditScore(user);
    }

    /**
     * @dev Record liquidity provision
     */
    function recordLiquidityProvision(address user, uint256 amount) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(verifiedAddresses[msg.sender], "Unauthorized");

        creditProfiles[user].liquidityProvided += amount;
        _updateCreditScore(user);
    }

    /**
     * @dev Record staking rewards earned
     */
    function recordStakingRewards(address user, uint256 rewards) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(verifiedAddresses[msg.sender], "Unauthorized");

        creditProfiles[user].stakingRewards += rewards;
        _updateCreditScore(user);
    }

    /**
     * @dev Record governance participation
     */
    function recordGovernanceVote(address user) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(verifiedAddresses[msg.sender], "Unauthorized");

        creditProfiles[user].governanceVotes += 1;
        governanceParticipation[user] += 1;
        emit GovernanceParticipation(user, creditProfiles[user].governanceVotes);
        _updateCreditScore(user);
    }

    /**
     * @dev Add social attestation
     */
    function addAttestation(address user, bytes32 attestationType, uint256 scoreBonus) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(verifiedAddresses[msg.sender], "Unauthorized");

        attestations[user][attestationType] = true;
        creditProfiles[user].socialScore += scoreBonus;
        emit AttestationAdded(user, attestationType);
        _updateCreditScore(user);
    }

    // ==================== INTERNAL HELPER FUNCTIONS ====================

    function _updateProtocolInteraction(address user, address protocol, uint256 volume) internal {
        ProtocolInteraction storage interaction = protocolInteractions[user][protocol];

        if (interaction.protocol == address(0)) {
            // New protocol interaction
            interaction.protocol = protocol;
            interaction.firstInteraction = block.timestamp;
            creditProfiles[user].uniqueProtocols += 1;
        }

        interaction.interactionCount += 1;
        interaction.totalVolume += volume;
        interaction.lastInteraction = block.timestamp;

        emit ProtocolInteractionRecorded(user, protocol, volume);
    }

    function _updateAssetHolding(address user, address token, uint256 amount, bool isStablecoin) internal {
        AssetHolding[] storage holdings = assetHoldings[user];

        // Find existing holding or create new one
        bool found = false;
        for (uint i = 0; i < holdings.length; i++) {
            if (holdings[i].token == token) {
                holdings[i].amount = amount;
                found = true;
                break;
            }
        }

        if (!found && amount > 0) {
            holdings.push(
                AssetHolding({
                    token: token,
                    amount: amount,
                    acquisitionTime: block.timestamp,
                    isStablecoin: isStablecoin
                })
            );
            creditProfiles[user].assetDiversity += 1;
        }

        // Recalculate stablecoin ratio and average holding period
        _recalculateAssetMetrics(user);
    }

    function _recalculateAssetMetrics(address user) internal {
        AssetHolding[] storage holdings = assetHoldings[user];
        uint256 totalValue = 0;
        uint256 stablecoinValue = 0;
        uint256 totalHoldingTime = 0;
        uint256 activeHoldings = 0;

        for (uint i = 0; i < holdings.length; i++) {
            if (holdings[i].amount > 0) {
                totalValue += holdings[i].amount;
                if (holdings[i].isStablecoin) {
                    stablecoinValue += holdings[i].amount;
                }
                totalHoldingTime += (block.timestamp - holdings[i].acquisitionTime);
                activeHoldings += 1;
            }
        }

        creditProfiles[user].stablecoinRatio = totalValue > 0 ? (stablecoinValue * 100) / totalValue : 0;
        creditProfiles[user].avgHoldingPeriod = activeHoldings > 0 ? totalHoldingTime / activeHoldings : 0;
        creditProfiles[user].assetDiversity = activeHoldings;
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
     * @dev Update sophisticated scoring weights (only owner)
     */
    function updateWeights(
        uint256 _transactionalWeight,
        uint256 _behavioralWeight,
        uint256 _assetWeight,
        uint256 _defiWeight,
        uint256 _repaymentWeight,
        uint256 _governanceWeight,
        uint256 _socialWeight
    ) external onlyOwner {
        require(
            _transactionalWeight +
                _behavioralWeight +
                _assetWeight +
                _defiWeight +
                _repaymentWeight +
                _governanceWeight +
                _socialWeight ==
                100,
            "Weights must sum to 100"
        );

        transactionalWeight = _transactionalWeight;
        behavioralWeight = _behavioralWeight;
        assetWeight = _assetWeight;
        defiWeight = _defiWeight;
        repaymentWeight = _repaymentWeight;
        governanceWeight = _governanceWeight;
        socialWeight = _socialWeight;
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

    // ==================== NEW GETTER FUNCTIONS ====================

    /**
     * @dev Get protocol interaction data
     */
    function getProtocolInteraction(address user, address protocol) external view returns (ProtocolInteraction memory) {
        return protocolInteractions[user][protocol];
    }

    /**
     * @dev Get user's asset holdings count
     */
    function getAssetHoldingsCount(address user) external view returns (uint256) {
        return assetHoldings[user].length;
    }

    /**
     * @dev Get specific asset holding
     */
    function getAssetHolding(address user, uint256 index) external view returns (AssetHolding memory) {
        require(index < assetHoldings[user].length, "Asset index out of bounds");
        return assetHoldings[user][index];
    }

    /**
     * @dev Check if user has specific attestation
     */
    function hasAttestation(address user, bytes32 attestationType) external view returns (bool) {
        return attestations[user][attestationType];
    }

    /**
     * @dev Get detailed score breakdown
     */
    function getScoreBreakdown(
        address user
    )
        external
        view
        returns (
            uint256 transactional,
            uint256 behavioral,
            uint256 asset,
            uint256 defi,
            uint256 repayment,
            uint256 governance,
            uint256 social
        )
    {
        require(creditProfiles[user].isActive, "User not registered");

        CreditProfile memory profile = creditProfiles[user];

        transactional = _calculateTransactionalScore(profile);
        behavioral = _calculateBehavioralScore(profile);
        asset = _calculateAssetScore(profile);
        defi = _calculateDeFiScore(profile);
        repayment = _calculateRepaymentScore(profile.repaidLoans, profile.defaultedLoans);
        governance = _calculateGovernanceScore(profile);
        social = _calculateSocialScore(profile);
    }

    /**
     * @dev Get enhanced profile data
     */
    function getEnhancedProfile(
        address user
    )
        external
        view
        returns (
            uint256 totalGasPaid,
            uint256 uniqueProtocols,
            uint256 stablecoinRatio,
            uint256 assetDiversity,
            uint256 avgHoldingPeriod,
            uint256 liquidityProvided,
            uint256 stakingRewards,
            uint256 governanceVotes,
            uint256 nftInteractions,
            uint256 socialScore
        )
    {
        require(creditProfiles[user].isActive, "User not registered");

        CreditProfile memory profile = creditProfiles[user];

        return (
            profile.totalGasPaid,
            profile.uniqueProtocols,
            profile.stablecoinRatio,
            profile.assetDiversity,
            profile.avgHoldingPeriod,
            profile.liquidityProvided,
            profile.stakingRewards,
            profile.governanceVotes,
            profile.nftInteractions,
            profile.socialScore
        );
    }

    // ==================== BACKWARD COMPATIBILITY ====================

    /**
     * @dev Simple transaction recording (backward compatible)
     */
    function recordSimpleTransaction(address user, uint256 volume, address counterparty) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(msg.sender == user || verifiedAddresses[msg.sender], "Unauthorized");

        userTransactions[user].push(
            TransactionData({
                volume: volume,
                gasUsed: 21000, // Default gas
                timestamp: block.timestamp,
                counterparty: counterparty,
                methodSignature: bytes4(0), // Default empty signature
                transactionType: 0 // Default transfer type
            })
        );

        // Update profile
        CreditProfile storage profile = creditProfiles[user];
        profile.totalVolume = profile.totalVolume + (volume);
        profile.transactionCount = profile.transactionCount + (1);
        profile.avgTransactionValue = profile.totalVolume / (profile.transactionCount);
        profile.totalGasPaid = profile.totalGasPaid + (21000);

        emit TransactionRecorded(user, volume, 21000, 0);

        // Trigger score update
        _updateCreditScore(user);
    }

    // ==================== TESTING FUNCTIONS ====================

    /**
     * @dev Set test credit profile data (only owner) - FOR TESTING ONLY
     */
    function setTestCreditProfile(
        address user,
        uint256 totalVolume,
        uint256 transactionCount,
        uint256 accountAgeBlocks,
        uint256 repaidLoans,
        uint256 defaultedLoans
    ) external onlyOwner {
        require(creditProfiles[user].isActive, "User not registered");

        CreditProfile storage profile = creditProfiles[user];
        profile.totalVolume = totalVolume;
        profile.transactionCount = transactionCount;
        profile.avgTransactionValue = transactionCount > 0 ? totalVolume / transactionCount : 0;

        // Set account age to an earlier block (current block - accountAgeBlocks)
        // This ensures block.number - profile.accountAge = accountAgeBlocks
        if (block.number >= accountAgeBlocks) {
            profile.accountAge = block.number - accountAgeBlocks;
        } else {
            // If accountAgeBlocks is larger than current block, just set it to block 1
            profile.accountAge = 1;
        }

        profile.repaidLoans = repaidLoans;
        profile.defaultedLoans = defaultedLoans;
        profile.loanCount = repaidLoans + defaultedLoans;

        // Recalculate score with new data
        _updateCreditScore(user);
    }

    /**
     * @dev Create test user with good credit profile (only owner) - FOR TESTING ONLY
     */
    function createTestUser(address user) external onlyOwner {
        require(!creditProfiles[user].isActive, "User already registered");

        // Register user first
        creditProfiles[user] = CreditProfile({
            score: MIN_SCORE,
            totalVolume: 0,
            transactionCount: 0,
            avgTransactionValue: 0,
            accountAge: block.number,
            lastUpdated: block.timestamp,
            isActive: true,
            loanCount: 0,
            repaidLoans: 0,
            defaultedLoans: 0,
            totalGasPaid: 0,
            uniqueProtocols: 0,
            stablecoinRatio: 0,
            assetDiversity: 0,
            avgHoldingPeriod: 0,
            liquidityProvided: 0,
            stakingRewards: 0,
            governanceVotes: 0,
            nftInteractions: 0,
            socialScore: 0
        });

        // Set good test data for high credit score manually
        CreditProfile storage profile = creditProfiles[user];
        profile.totalVolume = 100 ether;
        profile.transactionCount = 50;
        profile.avgTransactionValue = profile.totalVolume / profile.transactionCount;

        // Set account age to simulate old account (current block - 1000)
        if (block.number >= 1000) {
            profile.accountAge = block.number - 1000;
        } else {
            profile.accountAge = 1;
        }

        profile.repaidLoans = 5;
        profile.defaultedLoans = 0;
        profile.loanCount = 5;

        // Recalculate score with new data
        _updateCreditScore(user);

        emit UserRegistered(user, block.timestamp);
    }

    /**
     * @dev Batch create test users with varying credit scores (only owner) - FOR TESTING ONLY
     */
    function createTestUsers() external onlyOwner {
        address[5] memory testAddresses = [
            0x2c827c3E27744B1D83df71000F6c3B7FC59Fa0A1, // Your address - Excellent credit
            0x742D35CC6C6C8b5B2C8A4D15c9C3f47b4E5F1234, // Test address 1 - Good credit
            0x8ba1f109551BD432803012645FAc136c22c87654, // Test address 2 - Fair credit
            0x1234567890AbcdEF1234567890aBcdef12345678, // Test address 3 - Poor credit
            0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD // Test address 4 - Bad credit
        ];

        // Create excellent credit user (750+ score)
        if (!creditProfiles[testAddresses[0]].isActive) {
            creditProfiles[testAddresses[0]] = CreditProfile({
                score: MIN_SCORE,
                totalVolume: 200 ether,
                transactionCount: 80,
                avgTransactionValue: 0,
                accountAge: block.number >= 1000 ? block.number - 1000 : 1,
                lastUpdated: block.timestamp,
                isActive: true,
                loanCount: 10,
                repaidLoans: 10,
                defaultedLoans: 0,
                totalGasPaid: 1000000,
                uniqueProtocols: 5,
                stablecoinRatio: 30,
                assetDiversity: 8,
                avgHoldingPeriod: 500000,
                liquidityProvided: 20 ether,
                stakingRewards: 2 ether,
                governanceVotes: 15,
                nftInteractions: 5,
                socialScore: 75
            });
            creditProfiles[testAddresses[0]].avgTransactionValue =
                creditProfiles[testAddresses[0]].totalVolume /
                creditProfiles[testAddresses[0]].transactionCount;
            _updateCreditScore(testAddresses[0]);
        }

        // Create good credit user (700-749 score)
        if (!creditProfiles[testAddresses[1]].isActive) {
            creditProfiles[testAddresses[1]] = CreditProfile({
                score: MIN_SCORE,
                totalVolume: 50 ether,
                transactionCount: 40,
                avgTransactionValue: 0,
                accountAge: block.number >= 2000 ? block.number - 2000 : 1,
                lastUpdated: block.timestamp,
                isActive: true,
                loanCount: 9,
                repaidLoans: 8,
                defaultedLoans: 1,
                totalGasPaid: 600000,
                uniqueProtocols: 3,
                stablecoinRatio: 25,
                assetDiversity: 5,
                avgHoldingPeriod: 300000,
                liquidityProvided: 8 ether,
                stakingRewards: 0.8 ether,
                governanceVotes: 8,
                nftInteractions: 2,
                socialScore: 45
            });
            creditProfiles[testAddresses[1]].avgTransactionValue =
                creditProfiles[testAddresses[1]].totalVolume /
                creditProfiles[testAddresses[1]].transactionCount;
            _updateCreditScore(testAddresses[1]);
        }

        // Create fair credit user (650-699 score)
        if (!creditProfiles[testAddresses[2]].isActive) {
            creditProfiles[testAddresses[2]] = CreditProfile({
                score: MIN_SCORE,
                totalVolume: 20 ether,
                transactionCount: 25,
                avgTransactionValue: 0,
                accountAge: block.number >= 3000 ? block.number - 3000 : 1,
                lastUpdated: block.timestamp,
                isActive: true,
                loanCount: 7,
                repaidLoans: 5,
                defaultedLoans: 2,
                totalGasPaid: 400000,
                uniqueProtocols: 2,
                stablecoinRatio: 20,
                assetDiversity: 3,
                avgHoldingPeriod: 200000,
                liquidityProvided: 3 ether,
                stakingRewards: 0.3 ether,
                governanceVotes: 3,
                nftInteractions: 1,
                socialScore: 25
            });
            creditProfiles[testAddresses[2]].avgTransactionValue =
                creditProfiles[testAddresses[2]].totalVolume /
                creditProfiles[testAddresses[2]].transactionCount;
            _updateCreditScore(testAddresses[2]);
        }

        // Create poor credit user (600-649 score)
        if (!creditProfiles[testAddresses[3]].isActive) {
            creditProfiles[testAddresses[3]] = CreditProfile({
                score: MIN_SCORE,
                totalVolume: 5 ether,
                transactionCount: 15,
                avgTransactionValue: 0,
                accountAge: block.number >= 4000 ? block.number - 4000 : 1,
                lastUpdated: block.timestamp,
                isActive: true,
                loanCount: 6,
                repaidLoans: 3,
                defaultedLoans: 3,
                totalGasPaid: 200000,
                uniqueProtocols: 1,
                stablecoinRatio: 15,
                assetDiversity: 2,
                avgHoldingPeriod: 100000,
                liquidityProvided: 1 ether,
                stakingRewards: 0.1 ether,
                governanceVotes: 1,
                nftInteractions: 0,
                socialScore: 10
            });
            creditProfiles[testAddresses[3]].avgTransactionValue =
                creditProfiles[testAddresses[3]].totalVolume /
                creditProfiles[testAddresses[3]].transactionCount;
            _updateCreditScore(testAddresses[3]);
        }

        // Create bad credit user (500-599 score)
        if (!creditProfiles[testAddresses[4]].isActive) {
            creditProfiles[testAddresses[4]] = CreditProfile({
                score: MIN_SCORE,
                totalVolume: 1 ether,
                transactionCount: 8,
                avgTransactionValue: 0,
                accountAge: block.number >= 5000 ? block.number - 5000 : 1,
                lastUpdated: block.timestamp,
                isActive: true,
                loanCount: 6,
                repaidLoans: 2,
                defaultedLoans: 4,
                totalGasPaid: 80000,
                uniqueProtocols: 1,
                stablecoinRatio: 10,
                assetDiversity: 1,
                avgHoldingPeriod: 50000,
                liquidityProvided: 0,
                stakingRewards: 0,
                governanceVotes: 0,
                nftInteractions: 0,
                socialScore: 5
            });
            creditProfiles[testAddresses[4]].avgTransactionValue =
                creditProfiles[testAddresses[4]].totalVolume /
                creditProfiles[testAddresses[4]].transactionCount;
            _updateCreditScore(testAddresses[4]);
        }
    }
}
