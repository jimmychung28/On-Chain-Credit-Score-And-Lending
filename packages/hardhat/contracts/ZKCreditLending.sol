// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ZKCreditScoring.sol";
import "./DynamicTargetRateModel.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ZKCreditLending
 * @dev Privacy-preserving lending protocol that uses ZK credit scores
 * All users benefit from privacy by default
 */
contract ZKCreditLending is Ownable, ReentrancyGuard {

    ZKCreditScoring public zkCreditScoring;
    DynamicTargetRateModel public rateModel;

    struct Loan {
        uint256 amount;           // Loan amount in wei
        uint256 interestRate;     // Interest rate in basis points (1% = 100)
        uint256 duration;         // Loan duration in seconds
        uint256 startTime;        // Loan start timestamp
        uint256 dueDate;          // Loan due date
        bool isActive;            // Whether loan is active
        bool isRepaid;            // Whether loan is fully repaid
        uint256 amountRepaid;     // Amount repaid so far
        address borrower;         // Borrower address
        uint8 privacyLevel;       // Privacy level used for this loan
        uint256 transparencyPremium;  // Transparency premium applied
    }

    struct LendingPool {
        uint256 totalFunds;       // Total funds in the pool
        uint256 availableFunds;   // Available funds for lending
        uint256 totalLoaned;      // Total amount currently loaned out
        uint256 totalInterestEarned; // Total interest earned
        mapping(address => uint256) lenderShares; // Lender share amounts
        address[] lenders;        // Array of lender addresses
    }

    // Mappings
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    
    LendingPool public pool;
    uint256 public nextLoanId = 1;
    
    // Lending parameters
    uint256 public constant MAX_LOAN_AMOUNT = 100 ether;
    uint256 public constant MIN_CREDIT_SCORE = 300;
    uint256 public constant MAX_INTEREST_RATE = 10000; // 100%
    uint256 public constant MIN_INTEREST_RATE = 300;  // 3%
    uint256 public constant LOAN_DURATION = 30 days;
    uint256 public constant ORIGINATION_FEE = 50; // 0.5%

    // Events (privacy-preserving)
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint8 privacyLevel);
    event LoanApproved(uint256 indexed loanId, uint256 interestRate, uint256 privacyDiscount);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId);
    event FundsDeposited(address indexed lender, uint256 amount);
    event FundsWithdrawn(address indexed lender, uint256 amount);
    event InterestDistributed(uint256 totalInterest);
    event TransparencyPremiumApplied(uint256 indexed loanId, uint8 privacyLevel, uint256 premium);

    modifier onlyActiveLoan(uint256 loanId) {
        require(loans[loanId].isActive && !loans[loanId].isRepaid, "Loan not active");
        _;
    }

    constructor(address _zkCreditScoring, address _rateModel) Ownable(msg.sender) {
        zkCreditScoring = ZKCreditScoring(_zkCreditScoring);
        rateModel = DynamicTargetRateModel(_rateModel);
    }

    /**
     * @dev Stake ETH to earn yield (same as depositing to pool)
     */
    function stakeETH() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        
        if (pool.lenderShares[msg.sender] == 0) {
            pool.lenders.push(msg.sender);
        }
        
        pool.lenderShares[msg.sender] += msg.value;
        pool.totalFunds += msg.value;
        pool.availableFunds += msg.value;
        
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Deposit funds to the lending pool (same as staking)
     */
    function depositToPool() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        
        if (pool.lenderShares[msg.sender] == 0) {
            pool.lenders.push(msg.sender);
        }
        
        pool.lenderShares[msg.sender] += msg.value;
        pool.totalFunds += msg.value;
        pool.availableFunds += msg.value;
        
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Unstake ETH (same as withdrawing from pool)
     */
    function unstakeETH(uint256 amount) external nonReentrant {
        require(pool.lenderShares[msg.sender] >= amount, "Insufficient staked amount");
        require(pool.availableFunds >= amount, "Insufficient pool funds");
        
        pool.lenderShares[msg.sender] -= amount;
        pool.totalFunds -= amount;
        pool.availableFunds -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Withdraw funds from the lending pool (same as unstaking)
     */
    function withdrawFromPool(uint256 amount) external nonReentrant {
        require(pool.lenderShares[msg.sender] >= amount, "Insufficient share");
        require(pool.availableFunds >= amount, "Insufficient pool funds");
        
        pool.lenderShares[msg.sender] -= amount;
        pool.totalFunds -= amount;
        pool.availableFunds -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Request a loan with ZK privacy benefits
     */
    function requestLoan(uint256 amount) external returns (uint256) {
        require(amount > 0 && amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        require(pool.availableFunds >= amount, "Insufficient pool funds");
        
        uint256 creditScore = zkCreditScoring.getCreditScore(msg.sender);
        require(creditScore >= MIN_CREDIT_SCORE, "Credit score too low");
        
        (, , bool isActive, uint8 privacyLevel, bool isVerified) = zkCreditScoring.getCreditProfile(msg.sender);
        require(isActive && isVerified, "Invalid credit profile");
        
        // Calculate rates with transparency premium
        uint256 poolUtilization = _calculatePoolUtilization();
        uint256 baseRate = rateModel.calculateInterestRate(creditScore, poolUtilization, amount, LOAN_DURATION);
        uint256 transparencyPremium = zkCreditScoring.getTransparencyPremium(msg.sender);
        uint256 finalRate = baseRate + transparencyPremium; // Add premium for transparency
        
        // Create loan
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            amount: amount,
            interestRate: finalRate,
            duration: LOAN_DURATION,
            startTime: block.timestamp,
            dueDate: block.timestamp + LOAN_DURATION,
            isActive: true,
            isRepaid: false,
            amountRepaid: 0,
            borrower: msg.sender,
            privacyLevel: privacyLevel,
            transparencyPremium: transparencyPremium
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        // Update pool and transfer
        pool.availableFunds -= amount;
        pool.totalLoaned += amount;
        
        uint256 netAmount = amount - (amount * ORIGINATION_FEE / 10000);
        (bool success, ) = msg.sender.call{value: netAmount}("");
        require(success, "Transfer failed");
        
        emit LoanRequested(loanId, msg.sender, privacyLevel);
        emit LoanApproved(loanId, finalRate, transparencyPremium);
        emit TransparencyPremiumApplied(loanId, privacyLevel, transparencyPremium);
        
        return loanId;
    }

    /**
     * @dev Repay a loan
     */
    function repayLoan(uint256 loanId) external payable onlyActiveLoan(loanId) {
        require(loans[loanId].borrower == msg.sender, "Not your loan");
        
        Loan storage loan = loans[loanId];
        
        // Calculate total amount due
        uint256 interestAmount = _calculateInterest(loan.amount, loan.interestRate, loan.duration);
        uint256 totalDue = loan.amount + interestAmount;
        uint256 remainingDue = totalDue - loan.amountRepaid;
        
        require(msg.value >= remainingDue, "Insufficient payment");
        
        // Mark as repaid
        loan.amountRepaid = totalDue;
        loan.isRepaid = true;
        loan.isActive = false;
        
        // Update pool
        pool.availableFunds += loan.amount;
        pool.totalLoaned -= loan.amount;
        pool.totalInterestEarned += interestAmount;
        
        // Record in ZK credit scoring
        zkCreditScoring.recordLoan(msg.sender, loan.amount, true);
        
        // Distribute interest to lenders
        _distributeInterest(interestAmount);
        
        emit LoanRepaid(loanId, msg.value);
        
        // Return excess payment
        if (msg.value > remainingDue) {
            (bool success, ) = msg.sender.call{value: msg.value - remainingDue}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Check loan eligibility with privacy benefits
     */
    function checkLoanEligibility(address borrower, uint256 amount) external view returns (
        bool eligible,
        uint256 maxAmount,
        uint256 estimatedRate,
        uint8 privacyLevel,
        uint256 transparencyPremium
    ) {
        // Get user profile
        (uint256 score, , bool isActive, uint8 userPrivacyLevel, bool isVerified) = zkCreditScoring.getCreditProfile(borrower);
        
        eligible = isActive && isVerified && score >= MIN_CREDIT_SCORE;
        privacyLevel = userPrivacyLevel;
        
        if (eligible) {
            maxAmount = _calculateMaxLoanAmount(score);
            if (maxAmount > MAX_LOAN_AMOUNT) maxAmount = MAX_LOAN_AMOUNT;
            
            uint256 poolUtilization = _calculatePoolUtilization();
            uint256 baseRate = rateModel.calculateInterestRate(score, poolUtilization, amount, LOAN_DURATION);
            
            transparencyPremium = zkCreditScoring.getTransparencyPremium(borrower);
            estimatedRate = baseRate + transparencyPremium; // Add premium for transparency
        }
    }

    /**
     * @dev Get loan details with privacy information
     */
    function getLoanDetails(uint256 loanId) external view returns (
        uint256 amount,
        uint256 interestRate,
        uint256 dueDate,
        bool isActive,
        bool isRepaid,
        uint8 privacyLevel,
        uint256 transparencyPremium
    ) {
        Loan memory loan = loans[loanId];
        return (
            loan.amount,
            loan.interestRate,
            loan.dueDate,
            loan.isActive,
            loan.isRepaid,
            loan.privacyLevel,
            loan.transparencyPremium
        );
    }

    /**
     * @dev Calculate maximum loan amount based on credit score
     */
    function _calculateMaxLoanAmount(uint256 creditScore) internal pure returns (uint256) {
        if (creditScore >= 750) return 50 ether;      // Excellent credit
        if (creditScore >= 650) return 25 ether;      // Good credit
        if (creditScore >= 550) return 10 ether;      // Fair credit
        if (creditScore >= 450) return 5 ether;       // Poor credit
        return 1 ether;                               // Very poor credit
    }

    /**
     * @dev Calculate pool utilization rate
     */
    function _calculatePoolUtilization() internal view returns (uint256) {
        if (pool.totalFunds == 0) return 0;
        return (pool.totalLoaned * 10000) / pool.totalFunds; // In basis points
    }

    /**
     * @dev Calculate interest amount
     */
    function _calculateInterest(uint256 principal, uint256 rate, uint256 duration) internal pure returns (uint256) {
        return (principal * rate * duration) / (10000 * 365 days);
    }

    /**
     * @dev Distribute interest to lenders
     */
    function _distributeInterest(uint256 totalInterest) internal {
        if (pool.totalFunds == 0) return;
        
        for (uint i = 0; i < pool.lenders.length; i++) {
            address lender = pool.lenders[i];
            uint256 share = pool.lenderShares[lender];
            if (share > 0) {
                uint256 lenderInterest = (totalInterest * share) / pool.totalFunds;
                pool.lenderShares[lender] += lenderInterest;
            }
        }
        
        emit InterestDistributed(totalInterest);
    }

    /**
     * @dev Handle loan default
     */
    function handleDefault(uint256 loanId) external onlyOwner onlyActiveLoan(loanId) {
        Loan storage loan = loans[loanId];
        require(block.timestamp > loan.dueDate, "Loan not overdue");
        
        loan.isActive = false;
        
        // Record default in credit scoring
        zkCreditScoring.recordLoan(loan.borrower, loan.amount, false);
        
        emit LoanDefaulted(loanId);
    }

    /**
     * @dev Get pool information
     */
    function getPoolInfo() external view returns (
        uint256 totalFunds,
        uint256 availableFunds,
        uint256 totalLoaned,
        uint256 utilization,
        uint256 totalInterestEarned
    ) {
        return (
            pool.totalFunds,
            pool.availableFunds,
            pool.totalLoaned,
            _calculatePoolUtilization(),
            pool.totalInterestEarned
        );
    }

    /**
     * @dev Get lender information
     */
    function getLenderInfo(address lender) external view returns (
        uint256 totalShares,
        uint256 sharePercentage
    ) {
        totalShares = pool.lenderShares[lender];
        sharePercentage = pool.totalFunds > 0 ? (totalShares * 10000) / pool.totalFunds : 0;
    }

    /**
     * @dev Get all loan IDs for a borrower
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    /**
     * @dev Get borrower loan count
     */
    function getBorrowerLoanCount(address borrower) external view returns (uint256) {
        return borrowerLoans[borrower].length;
    }
} 