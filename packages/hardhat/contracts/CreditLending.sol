// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CreditScoring.sol";
import "./DynamicTargetRateModel.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CreditLending
 * @dev Lending protocol that uses on-chain credit scores to determine loan eligibility and rates
 */
contract CreditLending is Ownable, ReentrancyGuard {

    CreditScoring public creditScoringContract;
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
        address lender;           // Lender address (can be contract or user)
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
    uint256 public constant MIN_CREDIT_SCORE = 300; // Allow anyone with minimum possible credit score
    uint256 public constant MAX_INTEREST_RATE = 10000; // 100% for extremely risky borrowers
    uint256 public constant MIN_INTEREST_RATE = 300;  // 3%
    uint256 public constant LOAN_DURATION = 30 days;
    uint256 public constant ORIGINATION_FEE = 50; // 0.5%

    // Events
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanApproved(uint256 indexed loanId, uint256 interestRate);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId);
    event FundsDeposited(address indexed lender, uint256 amount);
    event FundsWithdrawn(address indexed lender, uint256 amount);
    event InterestDistributed(uint256 totalInterest);

    modifier onlyActiveLoan(uint256 loanId) {
        require(loans[loanId].isActive && !loans[loanId].isRepaid, "Loan not active");
        _;
    }

    constructor(address _creditScoringContract, address _rateModel) Ownable(msg.sender) {
        creditScoringContract = CreditScoring(_creditScoringContract);
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
        
        pool.lenderShares[msg.sender] = pool.lenderShares[msg.sender]+(msg.value);
        pool.totalFunds = pool.totalFunds+(msg.value);
        pool.availableFunds = pool.availableFunds+(msg.value);
        
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
        
        pool.lenderShares[msg.sender] = pool.lenderShares[msg.sender]+(msg.value);
        pool.totalFunds = pool.totalFunds+(msg.value);
        pool.availableFunds = pool.availableFunds+(msg.value);
        
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Unstake ETH (same as withdrawing from pool)
     */
    function unstakeETH(uint256 amount) external nonReentrant {
        require(pool.lenderShares[msg.sender] >= amount, "Insufficient staked amount");
        require(pool.availableFunds >= amount, "Insufficient pool funds");
        
        pool.lenderShares[msg.sender] = pool.lenderShares[msg.sender]-(amount);
        pool.totalFunds = pool.totalFunds-(amount);
        pool.availableFunds = pool.availableFunds-(amount);
        
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
        
        pool.lenderShares[msg.sender] = pool.lenderShares[msg.sender]-(amount);
        pool.totalFunds = pool.totalFunds-(amount);
        pool.availableFunds = pool.availableFunds-(amount);
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Request a loan
     */
    function requestLoan(uint256 amount) external returns (uint256) {
        require(amount > 0 && amount <= MAX_LOAN_AMOUNT, "Invalid loan amount");
        require(pool.availableFunds >= amount, "Insufficient pool funds");
        
        // Check credit score
        uint256 creditScore = creditScoringContract.getCreditScore(msg.sender);
        require(creditScore >= MIN_CREDIT_SCORE, "Credit score too low");
        
        // Calculate dynamic interest rate based on multiple factors
        uint256 poolUtilization = _calculatePoolUtilization();
        uint256 interestRate = rateModel.calculateInterestRate(
            creditScore,
            poolUtilization,
            amount,
            LOAN_DURATION
        );
        
        // Create loan
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            amount: amount,
            interestRate: interestRate,
            duration: LOAN_DURATION,
            startTime: block.timestamp,
            dueDate: block.timestamp+(LOAN_DURATION),
            isActive: true,
            isRepaid: false,
            amountRepaid: 0,
            borrower: msg.sender,
            lender: address(this) // Pool lending
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        // Update pool funds
        pool.availableFunds = pool.availableFunds-(amount);
        pool.totalLoaned = pool.totalLoaned+(amount);
        
        // Calculate origination fee
        uint256 originationFee = amount*(ORIGINATION_FEE)/(10000);
        uint256 netAmount = amount-(originationFee);
        
        // Transfer funds to borrower
        (bool success, ) = msg.sender.call{value: netAmount}("");
        require(success, "Transfer failed");
        
        emit LoanRequested(loanId, msg.sender, amount);
        emit LoanApproved(loanId, interestRate);
        
        return loanId;
    }

    /**
     * @dev Repay a loan
     */
    function repayLoan(uint256 loanId) external payable onlyActiveLoan(loanId) {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Not loan borrower");
        require(msg.value > 0, "Must send some ETH");
        
        uint256 totalOwed = getTotalOwed(loanId);
        uint256 remainingOwed = totalOwed-(loan.amountRepaid);
        
        uint256 paymentAmount = msg.value > remainingOwed ? remainingOwed : msg.value;
        loan.amountRepaid = loan.amountRepaid+(paymentAmount);
        
        // Check if loan is fully repaid
        bool isFullyRepaid = loan.amountRepaid >= totalOwed;
        if (isFullyRepaid) {
            loan.isRepaid = true;
            loan.isActive = false;
            
            // Record successful repayment in credit scoring and rate model
            creditScoringContract.recordLoan(msg.sender, loan.amount, true);
            rateModel.recordLoanPerformance(true);
            
            // Update pool
            pool.totalLoaned = pool.totalLoaned-(loan.amount);
            uint256 interest = totalOwed-(loan.amount);
            pool.totalInterestEarned = pool.totalInterestEarned+(interest);
            pool.availableFunds = pool.availableFunds+(totalOwed);
        } else {
            // Partial repayment
            pool.availableFunds = pool.availableFunds+(paymentAmount);
        }
        
        emit LoanRepaid(loanId, paymentAmount);
        
        // Return excess payment if any
        if (msg.value > paymentAmount) {
            uint256 excess = msg.value-(paymentAmount);
            (bool success, ) = msg.sender.call{value: excess}("");
            require(success, "Excess refund failed");
        }
    }

    /**
     * @dev Mark loan as defaulted (callable by anyone after due date)
     */
    function markAsDefaulted(uint256 loanId) external onlyActiveLoan(loanId) {
        Loan storage loan = loans[loanId];
        require(block.timestamp > loan.dueDate, "Loan not yet due");
        
        loan.isActive = false;
        
        // Record default in credit scoring and rate model
        creditScoringContract.recordLoan(loan.borrower, loan.amount, false);
        rateModel.recordLoanPerformance(false);
        
        // Update pool (loss of principal)
        pool.totalLoaned = pool.totalLoaned-(loan.amount);
        
        emit LoanDefaulted(loanId);
    }

    /**
     * @dev Calculate current pool utilization rate
     */
    function _calculatePoolUtilization() internal view returns (uint256) {
        if (pool.totalFunds == 0) return 0;
        return (pool.totalLoaned * 10000) / pool.totalFunds; // Return in basis points
    }

    /**
     * @dev Calculate total amount owed including time-based interest
     */
    function getTotalOwed(uint256 loanId) public view returns (uint256) {
        Loan memory loan = loans[loanId];
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 dailyRate = loan.interestRate / 365; // Annual rate to daily
        uint256 timeBasedInterest = loan.amount * dailyRate * timeElapsed / (1 days) / 10000;
        return loan.amount + timeBasedInterest;
    }

    /**
     * @dev Get remaining amount owed for a loan
     */
    function getRemainingOwed(uint256 loanId) public view returns (uint256) {
        Loan memory loan = loans[loanId];
        if (!loan.isActive || loan.isRepaid) {
            return 0;
        }
        uint256 totalOwed = getTotalOwed(loanId);
        return totalOwed > loan.amountRepaid ? totalOwed - loan.amountRepaid : 0;
    }

    /**
     * @dev Get user's active loans with remaining balances
     */
    function getUserActiveLoans(address user) external view returns (
        uint256[] memory loanIds,
        uint256[] memory remainingBalances,
        uint256[] memory dueDates,
        uint256[] memory interestRates
    ) {
        uint256[] memory userLoans = borrowerLoans[user];
        
        // Count active loans first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < userLoans.length; i++) {
            if (loans[userLoans[i]].isActive && !loans[userLoans[i]].isRepaid) {
                activeCount++;
            }
        }
        
        // Initialize arrays
        loanIds = new uint256[](activeCount);
        remainingBalances = new uint256[](activeCount);
        dueDates = new uint256[](activeCount);
        interestRates = new uint256[](activeCount);
        
        // Fill arrays with active loan data
        uint256 index = 0;
        for (uint256 i = 0; i < userLoans.length; i++) {
            uint256 loanId = userLoans[i];
            Loan memory loan = loans[loanId];
            
            if (loan.isActive && !loan.isRepaid) {
                loanIds[index] = loanId;
                remainingBalances[index] = getRemainingOwed(loanId);
                dueDates[index] = loan.dueDate;
                interestRates[index] = loan.interestRate;
                index++;
            }
        }
    }

    /**
     * @dev Get user's total outstanding debt
     */
    function getUserTotalDebt(address user) external view returns (
        uint256 totalOutstanding,
        uint256 activeLoanCount,
        uint256 overdueLoanCount
    ) {
        uint256[] memory userLoans = borrowerLoans[user];
        
        for (uint256 i = 0; i < userLoans.length; i++) {
            uint256 loanId = userLoans[i];
            Loan memory loan = loans[loanId];
            
            if (loan.isActive && !loan.isRepaid) {
                totalOutstanding += getRemainingOwed(loanId);
                activeLoanCount++;
                
                if (block.timestamp > loan.dueDate) {
                    overdueLoanCount++;
                }
            }
        }
    }

    /**
     * @dev Get detailed loan information including payment status
     */
    function getLoanDetails(uint256 loanId) external view returns (
        address borrower,
        uint256 originalAmount,
        uint256 interestRate,
        uint256 totalOwed,
        uint256 remainingOwed,
        uint256 amountPaid,
        uint256 dueDate,
        bool isActive,
        bool isOverdue,
        bool isRepaid
    ) {
        Loan memory loan = loans[loanId];
        
        borrower = loan.borrower;
        originalAmount = loan.amount;
        interestRate = loan.interestRate;
        totalOwed = getTotalOwed(loanId);
        remainingOwed = getRemainingOwed(loanId);
        amountPaid = loan.amountRepaid;
        dueDate = loan.dueDate;
        isActive = loan.isActive;
        isOverdue = loan.isActive && !loan.isRepaid && block.timestamp > loan.dueDate;
        isRepaid = loan.isRepaid;
    }

    /**
     * @dev Get loan payment history summary for a user
     */
    function getUserLoanSummary(address user) external view returns (
        uint256 totalLoansCount,
        uint256 activeLoansCount,
        uint256 repaidLoansCount,
        uint256 defaultedLoansCount,
        uint256 totalAmountBorrowed,
        uint256 totalAmountRepaid,
        uint256 currentOutstandingDebt
    ) {
        uint256[] memory userLoans = borrowerLoans[user];
        
        for (uint256 i = 0; i < userLoans.length; i++) {
            uint256 loanId = userLoans[i];
            Loan memory loan = loans[loanId];
            
            totalLoansCount++;
            totalAmountBorrowed += loan.amount;
            totalAmountRepaid += loan.amountRepaid;
            
            if (loan.isActive && !loan.isRepaid) {
                activeLoansCount++;
                currentOutstandingDebt += getRemainingOwed(loanId);
            } else if (loan.isRepaid) {
                repaidLoansCount++;
            } else if (!loan.isActive && !loan.isRepaid) {
                defaultedLoansCount++;
            }
        }
    }

    /**
     * @dev Get loan details
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @dev Get borrower's loan IDs
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    /**
     * @dev Get pool information
     */
    function getPoolInfo() external view returns (
        uint256 totalFunds,
        uint256 availableFunds,
        uint256 totalLoaned,
        uint256 totalInterestEarned,
        uint256 lenderCount
    ) {
        return (
            pool.totalFunds,
            pool.availableFunds,
            pool.totalLoaned,
            pool.totalInterestEarned,
            pool.lenders.length
        );
    }

    /**
     * @dev Get lender's share in the pool
     */
    function getLenderShare(address lender) external view returns (uint256) {
        return pool.lenderShares[lender];
    }

    /**
     * @dev Check loan eligibility for an address
     */
    function checkLoanEligibility(address borrower, uint256 amount) external view returns (
        bool eligible,
        uint256 creditScore,
        uint256 interestRate,
        string memory reason
    ) {
        try creditScoringContract.getCreditScore(borrower) returns (uint256 score) {
            creditScore = score;
            
            if (score < MIN_CREDIT_SCORE) {
                return (false, score, 0, "Credit score too low");
            }
            
            if (amount > MAX_LOAN_AMOUNT) {
                return (false, score, 0, "Loan amount too high");
            }
            
            if (pool.availableFunds < amount) {
                return (false, score, 0, "Insufficient pool funds");
            }
            
            uint256 poolUtilization = _calculatePoolUtilization();
            interestRate = rateModel.calculateInterestRate(score, poolUtilization, amount, LOAN_DURATION);
            return (true, score, interestRate, "Eligible for loan");
            
        } catch {
            return (false, 0, 0, "User not registered in credit system");
        }
    }

    /**
     * @dev Distribute interest earnings to lenders proportionally
     */
    function distributeInterest() external {
        require(pool.totalInterestEarned > 0, "No interest to distribute");
        require(pool.totalFunds > 0, "No lenders in pool");
        
        uint256 interestToDistribute = pool.totalInterestEarned;
        pool.totalInterestEarned = 0;
        
        for (uint256 i = 0; i < pool.lenders.length; i++) {
            address lender = pool.lenders[i];
            uint256 lenderShare = pool.lenderShares[lender];
            
            if (lenderShare > 0) {
                uint256 lenderInterest = interestToDistribute*(lenderShare)/(pool.totalFunds);
                pool.lenderShares[lender] = lenderShare+(lenderInterest);
                pool.totalFunds = pool.totalFunds+(lenderInterest);
                pool.availableFunds = pool.availableFunds+(lenderInterest);
            }
        }
        
        emit InterestDistributed(interestToDistribute);
    }

    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Emergency withdraw failed");
    }

    /**
     * @dev Update credit scoring contract address (only owner)
     */
    function updateCreditScoringContract(address newContract) external onlyOwner {
        creditScoringContract = CreditScoring(newContract);
    }

    /**
     * @dev Update rate model contract address (only owner)
     */
    function updateRateModel(address newRateModel) external onlyOwner {
        rateModel = DynamicTargetRateModel(newRateModel);
    }

    /**
     * @dev Get current pool utilization rate
     */
    function getCurrentUtilization() external view returns (uint256) {
        return _calculatePoolUtilization();
    }

    /**
     * @dev Get dynamic rate components for a potential loan
     */
    function getRateComponents(address borrower, uint256 amount) external view returns (
        uint256 creditScore,
        uint256 poolUtilization,
        uint256 baseUtilizationRate,
        uint256 creditAdjustedRate,
        uint256 marketAdjustedRate,
        uint256 finalRate
    ) {
        try creditScoringContract.getCreditScore(borrower) returns (uint256 score) {
            creditScore = score;
            poolUtilization = _calculatePoolUtilization();
            
            (baseUtilizationRate, creditAdjustedRate, marketAdjustedRate, finalRate) = 
                rateModel.getCurrentRateComponents(creditScore, poolUtilization);
        } catch {
            // Return zeros if user not registered
            creditScore = 0;
            poolUtilization = _calculatePoolUtilization();
            baseUtilizationRate = 0;
            creditAdjustedRate = 0;
            marketAdjustedRate = 0;
            finalRate = 0;
        }
    }

    /**
     * @dev Get rate model performance statistics
     */
    function getRateModelStats() external view returns (
        uint256 totalOriginated,
        uint256 totalDefaulted,
        uint256 defaultRate
    ) {
        return rateModel.getPerformanceStats();
    }
} 