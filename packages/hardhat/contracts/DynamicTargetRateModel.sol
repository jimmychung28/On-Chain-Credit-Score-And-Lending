// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title DynamicTargetRateModel
 * @dev Advanced interest rate model that dynamically adjusts rates based on multiple factors
 */
contract DynamicTargetRateModel is Ownable {
    using Math for uint256;

    // Rate precision (basis points: 1% = 100, 0.01% = 1)
    uint256 public constant RATE_PRECISION = 10000;
    uint256 public constant UTILIZATION_PRECISION = 10000; // 100% = 10000

    // Model Parameters
    struct RateModel {
        uint256 baseRate; // Base rate when utilization = 0 (in bp)
        uint256 targetUtilization; // Optimal utilization rate (in bp, e.g., 8000 = 80%)
        uint256 slope1; // Rate slope below target utilization (in bp)
        uint256 slope2; // Rate slope above target utilization (in bp)
        uint256 maxRate; // Maximum possible rate (in bp)
    }

    struct MarketConditions {
        uint256 volatilityMultiplier; // Current market volatility (100 = normal, 200 = 2x)
        uint256 liquidityPremium; // Premium for low liquidity (in bp)
        uint256 riskPremium; // Risk premium for market conditions (in bp)
        uint256 lastUpdateTime; // Last time conditions were updated
    }

    struct CreditRiskTier {
        uint256 minScore; // Minimum credit score for tier
        uint256 maxScore; // Maximum credit score for tier
        uint256 riskMultiplier; // Risk multiplier (100 = 1x, 150 = 1.5x)
        uint256 basePremium; // Base premium for this tier (in bp)
    }

    // State Variables
    RateModel public rateModel;
    MarketConditions public marketConditions;
    CreditRiskTier[8] public creditRiskTiers;

    // Historical tracking
    uint256 public totalLoansOriginated;
    uint256 public totalDefaults;

    // Events
    event RateModelUpdated(uint256 baseRate, uint256 targetUtilization, uint256 slope1, uint256 slope2);
    event MarketConditionsUpdated(uint256 volatilityMultiplier, uint256 liquidityPremium, uint256 riskPremium);
    event InterestRateCalculated(address indexed borrower, uint256 creditScore, uint256 utilization, uint256 finalRate);

    constructor() Ownable(msg.sender) {
        // Initialize with conservative default parameters
        rateModel = RateModel({
            baseRate: 200, // 2% base rate
            targetUtilization: 8000, // 80% target utilization
            slope1: 400, // 4% slope below target
            slope2: 6000, // 60% slope above target
            maxRate: 10000 // 100% max rate
        });

        // Initialize market conditions
        marketConditions = MarketConditions({
            volatilityMultiplier: 100, // Normal volatility
            liquidityPremium: 0, // No liquidity premium initially
            riskPremium: 50, // 0.5% base risk premium
            lastUpdateTime: block.timestamp
        });

        // Initialize credit risk tiers
        _initializeCreditRiskTiers();
    }

    /**
     * @dev Calculate dynamic interest rate based on multiple factors
     */
    function calculateInterestRate(
        uint256 creditScore,
        uint256 poolUtilization,
        uint256 loanAmount,
        uint256 loanDuration
    ) external view returns (uint256) {
        require(creditScore >= 300 && creditScore <= 850, "Invalid credit score");
        require(poolUtilization <= UTILIZATION_PRECISION, "Invalid utilization rate");

        // 1. Calculate base utilization rate
        uint256 utilizationRate = _calculateUtilizationRate(poolUtilization);

        // 2. Apply credit score risk adjustment
        uint256 creditRiskRate = _applyCreditRiskAdjustment(utilizationRate, creditScore);

        // 3. Apply market condition adjustments
        uint256 marketAdjustedRate = _applyMarketConditions(creditRiskRate);

        // 4. Apply loan-specific adjustments
        uint256 loanAdjustedRate = _applyLoanSpecificAdjustments(marketAdjustedRate, loanAmount, loanDuration);

        // 5. Apply performance adjustments
        uint256 finalRate = _applyPerformanceAdjustments(loanAdjustedRate);

        // 6. Ensure rate is within bounds
        finalRate = _enforceBounds(finalRate);

        return finalRate;
    }

    /**
     * @dev Calculate base utilization-based rate using kinked rate model
     */
    function _calculateUtilizationRate(uint256 utilization) internal view returns (uint256) {
        if (utilization <= rateModel.targetUtilization) {
            // Below target: linear increase from base rate
            uint256 utilizationRatio = (utilization * RATE_PRECISION) / rateModel.targetUtilization;
            uint256 rateIncrease = (rateModel.slope1 * utilizationRatio) / RATE_PRECISION;
            return rateModel.baseRate + rateIncrease;
        } else {
            // Above target: steeper increase
            uint256 excessUtilization = utilization - rateModel.targetUtilization;
            uint256 maxExcessUtilization = UTILIZATION_PRECISION - rateModel.targetUtilization;
            uint256 excessRatio = (excessUtilization * RATE_PRECISION) / maxExcessUtilization;

            uint256 baseRateAtTarget = rateModel.baseRate + rateModel.slope1;
            uint256 additionalRate = (rateModel.slope2 * excessRatio) / RATE_PRECISION;

            return baseRateAtTarget + additionalRate;
        }
    }

    /**
     * @dev Apply credit score risk adjustment
     */
    function _applyCreditRiskAdjustment(uint256 baseRate, uint256 creditScore) internal view returns (uint256) {
        CreditRiskTier memory tier = _getCreditRiskTier(creditScore);

        // Apply risk multiplier
        uint256 adjustedRate = (baseRate * tier.riskMultiplier) / 100;

        // Add base premium for the tier
        adjustedRate += tier.basePremium;

        return adjustedRate;
    }

    /**
     * @dev Apply market condition adjustments
     */
    function _applyMarketConditions(uint256 baseRate) internal view virtual returns (uint256) {
        uint256 adjustedRate = baseRate;

        // Apply volatility multiplier
        adjustedRate = (adjustedRate * marketConditions.volatilityMultiplier) / 100;

        // Add liquidity premium
        adjustedRate += marketConditions.liquidityPremium;

        // Add risk premium
        adjustedRate += marketConditions.riskPremium;

        return adjustedRate;
    }

    /**
     * @dev Apply loan-specific adjustments
     */
    function _applyLoanSpecificAdjustments(
        uint256 baseRate,
        uint256 loanAmount,
        uint256 loanDuration
    ) internal pure returns (uint256) {
        uint256 adjustedRate = baseRate;

        // Larger loans get slightly better rates (economies of scale)
        if (loanAmount >= 10 ether) {
            adjustedRate = (adjustedRate * 95) / 100; // 5% discount
        } else if (loanAmount >= 1 ether) {
            adjustedRate = (adjustedRate * 98) / 100; // 2% discount
        }

        // Longer loans get slightly higher rates (more risk)
        if (loanDuration > 90 days) {
            adjustedRate = (adjustedRate * 110) / 100; // 10% premium
        } else if (loanDuration > 60 days) {
            adjustedRate = (adjustedRate * 105) / 100; // 5% premium
        }

        return adjustedRate;
    }

    /**
     * @dev Apply performance-based adjustments
     */
    function _applyPerformanceAdjustments(uint256 baseRate) internal view returns (uint256) {
        if (totalLoansOriginated == 0) return baseRate;

        // Calculate default rate
        uint256 defaultRate = (totalDefaults * RATE_PRECISION) / totalLoansOriginated;

        // Adjust rate based on default performance
        if (defaultRate > 1000) {
            // > 10% default rate
            return (baseRate * 120) / 100; // 20% premium
        } else if (defaultRate > 500) {
            // > 5% default rate
            return (baseRate * 110) / 100; // 10% premium
        } else if (defaultRate < 100) {
            // < 1% default rate
            return (baseRate * 95) / 100; // 5% discount
        }

        return baseRate;
    }

    /**
     * @dev Get credit risk tier for a given credit score
     */
    function _getCreditRiskTier(uint256 creditScore) internal view returns (CreditRiskTier memory) {
        for (uint256 i = 0; i < creditRiskTiers.length; i++) {
            if (creditScore >= creditRiskTiers[i].minScore && creditScore <= creditRiskTiers[i].maxScore) {
                return creditRiskTiers[i];
            }
        }
        // Default to highest risk tier if not found
        return creditRiskTiers[creditRiskTiers.length - 1];
    }

    /**
     * @dev Initialize credit risk tiers
     */
    function _initializeCreditRiskTiers() internal {
        creditRiskTiers[0] = CreditRiskTier(750, 850, 80, 0); // Excellent: 0.8x multiplier, 0bp premium
        creditRiskTiers[1] = CreditRiskTier(700, 749, 90, 50); // Very Good: 0.9x multiplier, 0.5bp premium
        creditRiskTiers[2] = CreditRiskTier(650, 699, 100, 100); // Good: 1.0x multiplier, 1bp premium
        creditRiskTiers[3] = CreditRiskTier(600, 649, 120, 200); // Fair: 1.2x multiplier, 2bp premium
        creditRiskTiers[4] = CreditRiskTier(500, 599, 150, 400); // Poor: 1.5x multiplier, 4bp premium
        creditRiskTiers[5] = CreditRiskTier(450, 499, 200, 800); // Bad: 2.0x multiplier, 8bp premium
        creditRiskTiers[6] = CreditRiskTier(400, 449, 300, 1500); // Very Bad: 3.0x multiplier, 15bp premium
        creditRiskTiers[7] = CreditRiskTier(300, 399, 500, 3000); // Terrible: 5.0x multiplier, 30bp premium
    }

    /**
     * @dev Enforce rate bounds
     */
    function _enforceBounds(uint256 rate) internal view returns (uint256) {
        if (rate > rateModel.maxRate) {
            return rateModel.maxRate;
        }
        if (rate < rateModel.baseRate) {
            return rateModel.baseRate;
        }
        return rate;
    }

    // Admin functions
    function updateRateModel(
        uint256 _baseRate,
        uint256 _targetUtilization,
        uint256 _slope1,
        uint256 _slope2,
        uint256 _maxRate
    ) external onlyOwner {
        require(_targetUtilization <= UTILIZATION_PRECISION, "Invalid target utilization");
        require(_maxRate >= _baseRate, "Max rate must be >= base rate");

        rateModel = RateModel({
            baseRate: _baseRate,
            targetUtilization: _targetUtilization,
            slope1: _slope1,
            slope2: _slope2,
            maxRate: _maxRate
        });

        emit RateModelUpdated(_baseRate, _targetUtilization, _slope1, _slope2);
    }

    function updateMarketConditions(
        uint256 _volatilityMultiplier,
        uint256 _liquidityPremium,
        uint256 _riskPremium
    ) external onlyOwner {
        marketConditions.volatilityMultiplier = _volatilityMultiplier;
        marketConditions.liquidityPremium = _liquidityPremium;
        marketConditions.riskPremium = _riskPremium;
        marketConditions.lastUpdateTime = block.timestamp;

        emit MarketConditionsUpdated(_volatilityMultiplier, _liquidityPremium, _riskPremium);
    }

    function recordLoanPerformance(bool successful) external {
        totalLoansOriginated++;
        if (!successful) {
            totalDefaults++;
        }
    }

    // View functions
    function getCurrentRateComponents(
        uint256 creditScore,
        uint256 utilization
    )
        external
        view
        returns (uint256 baseUtilizationRate, uint256 creditAdjustedRate, uint256 marketAdjustedRate, uint256 finalRate)
    {
        baseUtilizationRate = _calculateUtilizationRate(utilization);
        creditAdjustedRate = _applyCreditRiskAdjustment(baseUtilizationRate, creditScore);
        marketAdjustedRate = _applyMarketConditions(creditAdjustedRate);
        finalRate = _enforceBounds(_applyPerformanceAdjustments(marketAdjustedRate));
    }

    function getModelParameters() external view returns (RateModel memory) {
        return rateModel;
    }

    function getMarketConditions() external view returns (MarketConditions memory) {
        return marketConditions;
    }

    function getCreditRiskTier(uint256 creditScore) external view returns (CreditRiskTier memory) {
        return _getCreditRiskTier(creditScore);
    }

    function getPerformanceStats()
        external
        view
        returns (uint256 totalOriginated, uint256 totalDefaulted, uint256 defaultRate)
    {
        totalOriginated = totalLoansOriginated;
        totalDefaulted = totalDefaults;
        defaultRate = totalOriginated > 0 ? (totalDefaults * RATE_PRECISION) / totalOriginated : 0;
    }
}
