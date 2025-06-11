// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../CreditScoring.sol";
import "../Groth16Verifier.sol";
import "../DynamicTargetRateModel.sol";
import "./CrossChainCreditAggregator.sol";
import "../layerzero/LzApp.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainZKCreditLending
 * @dev Enhanced lending contract with cross-chain credit aggregation
 * @notice Provides loans based on universal credit scores across multiple chains
 */
contract CrossChainZKCreditLending is Ownable, ReentrancyGuard, LzApp {
    
    // Core contracts
    CreditScoring public creditScoring;
    Groth16Verifier public groth16Verifier;
    DynamicTargetRateModel public rateModel;
    
    // Loan structure
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 interestRate;
        uint256 startTime;
        uint256 duration;
        bool isRepaid;
        uint256 repaidAmount;
        uint256 collateralAmount;
        uint8 privacyLevel;
    }
    
    // State variables
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    uint256 public nextLoanId = 1;
    uint256 public totalBorrowed = 0;
    
    // Events
    event LoanCreated(address indexed borrower, uint256 indexed loanId, uint256 amount, uint256 interestRate);
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    /// @notice Cross-chain credit aggregator contract
    CrossChainCreditAggregator public crossChainAggregator;
    
    /// @notice Cross-chain loan configurations
    struct CrossChainLoanConfig {
        bool enableUniversalScoring;     // Whether to use cross-chain scores
        uint256 universalScoreBonus;     // Bonus for universal scores (basis points)
        uint256 maxCrossChainDiscount;   // Maximum discount for multi-chain users
        uint256 fallbackToLocalThreshold; // Fallback if universal score unavailable
    }
    
    CrossChainLoanConfig public crossChainConfig;
    
    /// @notice Mapping to track which loans use universal scoring
    mapping(uint256 => bool) public loanUsesUniversalScore;
    
    /// @notice Pending cross-chain loan applications
    mapping(address => PendingCrossChainLoan) public pendingCrossChainLoans;
    
    struct PendingCrossChainLoan {
        uint256 requestedAmount;
        uint256 timestamp;
        bytes32 scoreRequestId;
        bool isActive;
    }
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event CrossChainLoanRequested(
        address indexed borrower,
        uint256 requestedAmount,
        bytes32 scoreRequestId,
        uint256 timestamp
    );
    
    event CrossChainLoanApproved(
        address indexed borrower,
        uint256 loanId,
        uint256 amount,
        uint256 universalScore,
        uint256 interestRate
    );
    
    event UniversalScoreUsed(
        address indexed borrower,
        uint256 loanId,
        uint256 universalScore,
        uint256 localScore,
        uint256 scoreDifference
    );
    
    event CrossChainConfigUpdated(
        bool enableUniversalScoring,
        uint256 universalScoreBonus,
        uint256 maxCrossChainDiscount
    );
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(
        address _creditScoring,
        address _groth16Verifier,
        address _rateModel,
        address _lzEndpoint,
        address _crossChainAggregator
    ) 
        LzApp(_lzEndpoint)
    {
        creditScoring = CreditScoring(_creditScoring);
        groth16Verifier = Groth16Verifier(_groth16Verifier);
        rateModel = DynamicTargetRateModel(_rateModel);
        crossChainAggregator = CrossChainCreditAggregator(_crossChainAggregator);
        
        // Initialize default cross-chain configuration
        crossChainConfig = CrossChainLoanConfig({
            enableUniversalScoring: true,
            universalScoreBonus: 200,        // 2% bonus for universal scores
            maxCrossChainDiscount: 500,      // 5% maximum discount
            fallbackToLocalThreshold: 600    // Fallback to local if universal < 600
        });
    }
    
    // =============================================================================
    // ENHANCED LOAN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Request loan with cross-chain credit scoring
     * @param _amount Loan amount requested
     * @param _useUniversalScore Whether to request universal credit score
     * @return loanId The ID of the created loan (0 if pending cross-chain)
     */
    function requestCrossChainLoan(
        uint256 _amount,
        bool _useUniversalScore
    ) 
        external 
        payable 
        nonReentrant 
        returns (uint256 loanId) 
    {
        require(_amount > 0, "Amount must be positive");
        require(pendingCrossChainLoans[msg.sender].isActive == false, "Pending loan exists");
        
        if (!_useUniversalScore || !crossChainConfig.enableUniversalScoring) {
            // Use local scoring only
            return _createBasicLoan(_amount, false);
        }
        
        // Check if universal score is already available and recent
        (uint256 universalScore, uint256 timestamp, bool isStale) = 
            crossChainAggregator.getUniversalScore(msg.sender);
        
        if (universalScore > 0 && !isStale) {
            // Use existing universal score
            return _createLoanWithUniversalScore(msg.sender, _amount, universalScore);
        }
        
        // Request new universal score calculation
        bytes32 scoreRequestId = crossChainAggregator.requestUniversalScore{value: msg.value}(msg.sender);
        
        // Store pending loan request
        pendingCrossChainLoans[msg.sender] = PendingCrossChainLoan({
            requestedAmount: _amount,
            timestamp: block.timestamp,
            scoreRequestId: scoreRequestId,
            isActive: true
        });
        
        emit CrossChainLoanRequested(msg.sender, _amount, scoreRequestId, block.timestamp);
        
        return 0; // Indicates pending cross-chain processing
    }
    
    /**
     * @notice Process pending cross-chain loan after universal score calculation
     * @param _borrower Address of the borrower
     * @return loanId The ID of the created loan
     */
    function processPendingCrossChainLoan(address _borrower) 
        external 
        nonReentrant 
        returns (uint256 loanId) 
    {
        PendingCrossChainLoan memory pendingLoan = pendingCrossChainLoans[_borrower];
        require(pendingLoan.isActive, "No pending loan");
        
        // Check if universal score is now available
        (uint256 universalScore, , bool isStale) = 
            crossChainAggregator.getUniversalScore(_borrower);
        
        require(universalScore > 0 && !isStale, "Universal score not ready");
        
        // Clear pending loan
        delete pendingCrossChainLoans[_borrower];
        
        // Create loan with universal score
        loanId = _createLoanWithUniversalScore(_borrower, pendingLoan.requestedAmount, universalScore);
        
        return loanId;
    }
    
    /**
     * @notice Create loan using universal credit score
     */
    function _createLoanWithUniversalScore(
        address _borrower,
        uint256 _amount,
        uint256 _universalScore
    ) internal returns (uint256 loanId) {
        // Get local score for comparison
        uint256 localScore = creditScoring.getCreditScore(_borrower);
        
        // Use universal score if it's better or above threshold
        uint256 scoreToUse = _universalScore;
        bool useUniversal = true;
        
        if (_universalScore < crossChainConfig.fallbackToLocalThreshold && localScore > _universalScore) {
            scoreToUse = localScore;
            useUniversal = false;
        }
        
        require(scoreToUse >= 300, "Credit score too low");
        
        // Calculate enhanced interest rate with cross-chain benefits
        uint256 baseRate = rateModel.calculateInterestRate(
            scoreToUse,
            5000, // 50% utilization
            _amount,
            30 days // 30 day loan
        );
        uint256 finalRate = _calculateCrossChainAdjustedRate(
            baseRate, 
            scoreToUse, 
            _universalScore,
            localScore,
            useUniversal
        );
        
        // Create the loan
        loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: _borrower,
            amount: _amount,
            interestRate: finalRate,
            startTime: block.timestamp,
            duration: 30 days, // Default duration
            isRepaid: false,
            repaidAmount: 0,
            collateralAmount: 0,
            privacyLevel: 3 // Default privacy level
        });
        
        borrowerLoans[_borrower].push(loanId);
        loanUsesUniversalScore[loanId] = useUniversal;
        
        // Transfer loan amount
        require(address(this).balance >= _amount, "Insufficient lending pool");
        payable(_borrower).transfer(_amount);
        
        // Update utilization
        totalBorrowed += _amount;
        
        if (useUniversal) {
            emit UniversalScoreUsed(
                _borrower, 
                loanId, 
                _universalScore, 
                localScore,
                _universalScore > localScore ? _universalScore - localScore : localScore - _universalScore
            );
        }
        
        emit CrossChainLoanApproved(_borrower, loanId, _amount, scoreToUse, finalRate);
        emit LoanCreated(_borrower, loanId, _amount, finalRate);
        
        return loanId;
    }
    
    /**
     * @notice Calculate interest rate with cross-chain adjustments
     */
    function _calculateCrossChainAdjustedRate(
        uint256 _baseRate,
        uint256 _scoreUsed,
        uint256 _universalScore,
        uint256 _localScore,
        bool _useUniversal
    ) internal view returns (uint256) {
        uint256 adjustedRate = _baseRate;
        
        if (_useUniversal && crossChainConfig.enableUniversalScoring) {
            // Apply universal score bonus
            uint256 bonus = (adjustedRate * crossChainConfig.universalScoreBonus) / 10000;
            if (bonus < adjustedRate) {
                adjustedRate -= bonus;
            }
            
            // Additional discount for significant score improvement
            if (_universalScore > _localScore + 50) {
                uint256 improvementDiscount = ((adjustedRate * 100) / 10000); // 1% discount
                if (improvementDiscount < adjustedRate) {
                    adjustedRate -= improvementDiscount;
                }
            }
            
            // Cap the maximum discount
            uint256 maxDiscount = (_baseRate * crossChainConfig.maxCrossChainDiscount) / 10000;
            uint256 totalDiscount = _baseRate - adjustedRate;
            if (totalDiscount > maxDiscount) {
                adjustedRate = _baseRate - maxDiscount;
            }
        }
        
        return adjustedRate;
    }
    
    // =============================================================================
    // ENHANCED ZK PROOF FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Request loan using universal ZK proof
     * @param _amount Loan amount
     * @param _proof ZK proof bytes
     * @param _publicSignals Public signals for verification
     * @return loanId The ID of the created loan
     */
    function requestUniversalZKLoan(
        uint256 _amount,
        bytes calldata _proof,
        uint256[4] calldata _publicSignals
    ) external nonReentrant returns (uint256 loanId) {
        require(_amount > 0, "Amount must be positive");
        
        // Verify universal credit eligibility
        bool isEligible = crossChainAggregator.verifyUniversalCreditEligibility(_proof, _publicSignals);
        require(isEligible, "ZK proof verification failed");
        
        // Extract privacy level and other parameters from public signals
        uint8 privacyLevel = uint8(_publicSignals[2]);
        require(privacyLevel >= 1 && privacyLevel <= 5, "Invalid privacy level");
        
        // Calculate privacy-adjusted rate
        uint256 baseRate = rateModel.calculateInterestRate(
            700, // Default score for ZK proofs
            5000, // 50% utilization
            _amount,
            30 days // 30 day loan
        );
        uint256 privacyAdjustedRate = _calculatePrivacyAdjustedRate(baseRate, privacyLevel);
        
        // Create loan without revealing actual score
        loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: _amount,
            interestRate: privacyAdjustedRate,
            startTime: block.timestamp,
            duration: 30 days,
            isRepaid: false,
            repaidAmount: 0,
            collateralAmount: 0,
            privacyLevel: privacyLevel
        });
        
        borrowerLoans[msg.sender].push(loanId);
        loanUsesUniversalScore[loanId] = true;
        
        // Transfer loan amount
        require(address(this).balance >= _amount, "Insufficient lending pool");
        payable(msg.sender).transfer(_amount);
        
        totalBorrowed += _amount;
        
        emit LoanCreated(msg.sender, loanId, _amount, privacyAdjustedRate);
        
        return loanId;
    }
    
    // =============================================================================
    // LAYERZERO INTEGRATION
    // =============================================================================
    
    /**
     * @notice Handle cross-chain messages related to lending
     */
    function _blockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        (uint16 messageType, bytes memory data) = abi.decode(_payload, (uint16, bytes));
        
        if (messageType == 1) {
            // Cross-chain loan status update
            _handleLoanStatusUpdate(_srcChainId, data);
        } else if (messageType == 2) {
            // Cross-chain repayment notification
            _handleRepaymentNotification(_srcChainId, data);
        } else if (messageType == 3) {
            // Cross-chain default notification
            _handleDefaultNotification(_srcChainId, data);
        }
    }
    
    function _handleLoanStatusUpdate(uint16 _srcChainId, bytes memory _data) internal {
        // Implementation for handling loan status updates from other chains
        // This would update cross-chain loan tracking
    }
    
    function _handleRepaymentNotification(uint16 _srcChainId, bytes memory _data) internal {
        // Implementation for handling repayment notifications from other chains
        // This would update credit scores based on cross-chain repayments
    }
    
    function _handleDefaultNotification(uint16 _srcChainId, bytes memory _data) internal {
        // Implementation for handling default notifications from other chains
        // This would update credit scores based on cross-chain defaults
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update cross-chain configuration
     */
    function updateCrossChainConfig(
        bool _enableUniversalScoring,
        uint256 _universalScoreBonus,
        uint256 _maxCrossChainDiscount,
        uint256 _fallbackToLocalThreshold
    ) external onlyOwner {
        crossChainConfig = CrossChainLoanConfig({
            enableUniversalScoring: _enableUniversalScoring,
            universalScoreBonus: _universalScoreBonus,
            maxCrossChainDiscount: _maxCrossChainDiscount,
            fallbackToLocalThreshold: _fallbackToLocalThreshold
        });
        
        emit CrossChainConfigUpdated(
            _enableUniversalScoring,
            _universalScoreBonus,
            _maxCrossChainDiscount
        );
    }
    
    /**
     * @notice Update cross-chain aggregator address
     */
    function updateCrossChainAggregator(address _newAggregator) external onlyOwner {
        require(_newAggregator != address(0), "Invalid aggregator address");
        crossChainAggregator = CrossChainCreditAggregator(_newAggregator);
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get cross-chain loan information
     */
    function getCrossChainLoanInfo(uint256 _loanId) 
        external 
        view 
        returns (
            bool usesUniversalScore,
            uint256 universalScore,
            uint256 localScore,
            uint256 crossChainDiscount
        ) 
    {
        require(_loanId < nextLoanId, "Loan does not exist");
        
        Loan memory loan = loans[_loanId];
        usesUniversalScore = loanUsesUniversalScore[_loanId];
        
        if (usesUniversalScore) {
            (universalScore, , ) = crossChainAggregator.getUniversalScore(loan.borrower);
            localScore = creditScoring.getCreditScore(loan.borrower);
            
            // Calculate what the discount was
            uint256 baseRate = rateModel.calculateInterestRate(
                universalScore > 0 ? universalScore : localScore,
                5000, // 50% utilization
                loan.amount,
                30 days // 30 day loan
            );
            crossChainDiscount = baseRate > loan.interestRate ? baseRate - loan.interestRate : 0;
        }
    }
    
    /**
     * @notice Get pending cross-chain loan details
     */
    function getPendingCrossChainLoan(address _borrower) 
        external 
        view 
        returns (
            uint256 requestedAmount,
            uint256 timestamp,
            bytes32 scoreRequestId,
            bool isActive
        ) 
    {
        PendingCrossChainLoan memory pendingLoan = pendingCrossChainLoans[_borrower];
        return (
            pendingLoan.requestedAmount,
            pendingLoan.timestamp,
            pendingLoan.scoreRequestId,
            pendingLoan.isActive
        );
    }
    
    /**
     * @notice Estimate cross-chain loan terms
     */
    function estimateCrossChainLoanTerms(address _borrower, uint256 _amount) 
        external 
        view 
        returns (
            uint256 localRate,
            uint256 universalRate,
            uint256 potentialSavings,
            bool universalAvailable
        ) 
    {
        uint256 localScore = creditScoring.getCreditScore(_borrower);
        uint256 baseRate = rateModel.calculateInterestRate(
            localScore > 0 ? localScore : 650, // Default credit score
            5000, // 50% utilization
            _amount,
            30 days // 30 day loan
        );
        localRate = baseRate;
        
        (uint256 universalScore, , bool isStale) = 
            crossChainAggregator.getUniversalScore(_borrower);
        
        universalAvailable = universalScore > 0 && !isStale;
        
        if (universalAvailable) {
            universalRate = _calculateCrossChainAdjustedRate(
                baseRate,
                universalScore,
                universalScore,
                localScore,
                true
            );
            potentialSavings = localRate > universalRate ? localRate - universalRate : 0;
        }
    }
    
    /**
     * @notice Get cross-chain configuration
     */
    function getCrossChainConfig() 
        external 
        view 
        returns (CrossChainLoanConfig memory) 
    {
        return crossChainConfig;
    }
    
    // =============================================================================
    // INTERNAL HELPER FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Create a basic loan using local scoring
     */
    function _createBasicLoan(uint256 _amount, bool _useUniversal) internal returns (uint256 loanId) {
        require(_amount > 0, "Amount must be positive");
        
        // Get local credit score
        uint256 localScore = creditScoring.getCreditScore(msg.sender);
        require(localScore >= 300, "Credit score too low");
        
        // Calculate interest rate
        uint256 baseRate = rateModel.calculateInterestRate(
            localScore > 0 ? localScore : 650, // Default credit score
            5000, // 50% utilization
            _amount,
            30 days // 30 day loan
        );
        
        // Create the loan
        loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: _amount,
            interestRate: baseRate,
            startTime: block.timestamp,
            duration: 30 days,
            isRepaid: false,
            repaidAmount: 0,
            collateralAmount: 0,
            privacyLevel: 3
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        // Transfer loan amount
        require(address(this).balance >= _amount, "Insufficient lending pool");
        payable(msg.sender).transfer(_amount);
        
        totalBorrowed += _amount;
        
        emit LoanCreated(msg.sender, loanId, _amount, baseRate);
        
        return loanId;
    }
    
    /**
     * @notice Calculate privacy-adjusted interest rate
     */
    function _calculatePrivacyAdjustedRate(uint256 _baseRate, uint8 _privacyLevel) internal pure returns (uint256) {
        // Privacy level 5: No premium (privacy is free!)
        // Privacy level 4: 0.5% premium
        // Privacy level 3: 1% premium
        // Privacy level 2: 1.5% premium  
        // Privacy level 1: 2% premium
        
        uint256 premium = 0;
        if (_privacyLevel == 4) {
            premium = 50; // 0.5%
        } else if (_privacyLevel == 3) {
            premium = 100; // 1%
        } else if (_privacyLevel == 2) {
            premium = 150; // 1.5%
        } else if (_privacyLevel == 1) {
            premium = 200; // 2%
        }
        
        return _baseRate + premium;
    }
    
    /**
     * @notice Receive ETH for lending pool
     */
    receive() external payable {
        // Allow contract to receive ETH for lending pool
    }
}