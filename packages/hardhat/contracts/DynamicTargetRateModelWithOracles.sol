// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DynamicTargetRateModel.sol";
import "./mocks/MockAggregatorV3.sol";
import "./interfaces/IOracleSecurityManager.sol";
import "./oracles/SecureAggregatorV3.sol";

/**
 * @title DynamicTargetRateModelWithOracles
 * @dev Enhanced rate model that integrates with Chainlink oracles for real-time market data
 */
contract DynamicTargetRateModelWithOracles is DynamicTargetRateModel {
    // Oracle interfaces (legacy support)
    AggregatorV3Interface public ethUsdFeed;
    AggregatorV3Interface public volatilityFeed;
    AggregatorV3Interface public liquidityFeed;
    AggregatorV3Interface public defiRateFeed;

    // New security-enhanced oracle system
    IOracleSecurityManager public oracleSecurityManager;
    SecureAggregatorV3 public secureEthUsdFeed;
    SecureAggregatorV3 public secureVolatilityFeed;
    SecureAggregatorV3 public secureLiquidityFeed;
    SecureAggregatorV3 public secureDefiRateFeed;

    // Oracle configuration
    uint256 public constant STALENESS_THRESHOLD = 1 hours;
    uint256 public constant MAX_VOLATILITY_MULTIPLIER = 300; // 3x max
    uint256 public constant MIN_VOLATILITY_MULTIPLIER = 50; // 0.5x min

    bool public useOracles = false; // Toggle for testing
    bool public useSecureOracles = false; // Toggle for secure oracle system
    bool public autoUpdateEnabled = false; // Auto-update market conditions

    // Historical price data for volatility calculation
    struct PriceHistory {
        int256 price;
        uint256 timestamp;
    }

    PriceHistory[24] public priceHistory; // Last 24 data points
    uint256 public priceHistoryIndex = 0;

    // Events
    event OracleDataUpdated(string feedType, int256 price, uint256 timestamp);
    event MarketConditionsAutoUpdated(uint256 volatilityMultiplier, uint256 liquidityPremium, uint256 riskPremium);
    event VolatilityCalculated(uint256 volatility, uint256 priceCount);
    event SecureOracleSystemEnabled(bool enabled);
    event SecurityManagerUpdated(address oldManager, address newManager);
    event CircuitBreakerTriggered(string reason);

    constructor() DynamicTargetRateModel() {}

    /**
     * @dev Initialize oracles (for testing with mocks)
     */
    function initializeOracles(
        address _ethUsdFeed,
        address _volatilityFeed,
        address _liquidityFeed,
        address _defiRateFeed
    ) external onlyOwner {
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
        volatilityFeed = AggregatorV3Interface(_volatilityFeed);
        liquidityFeed = AggregatorV3Interface(_liquidityFeed);
        defiRateFeed = AggregatorV3Interface(_defiRateFeed);

        // Initialize price history with current price
        if (address(ethUsdFeed) != address(0)) {
            try ethUsdFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256, uint80) {
                for (uint256 i = 0; i < priceHistory.length; i++) {
                    priceHistory[i] = PriceHistory(price, block.timestamp);
                }
            } catch {
                // If oracle fails, use default values
            }
        }

        useOracles = true;
        emit OracleDataUpdated("oracles_initialized", 0, block.timestamp);
    }

    /**
     * @dev Toggle oracle usage for testing
     */
    function setUseOracles(bool _useOracles) external onlyOwner {
        useOracles = _useOracles;
    }

    /**
     * @dev Enable/disable automatic market condition updates
     */
    function setAutoUpdateEnabled(bool _enabled) external onlyOwner {
        autoUpdateEnabled = _enabled;
    }

    /**
     * @dev Override market conditions with oracle data
     */
    function _applyMarketConditions(uint256 baseRate) internal view override returns (uint256) {
        // Check for circuit breaker or system pause
        if (useSecureOracles && address(oracleSecurityManager) != address(0)) {
            if (oracleSecurityManager.isPaused() || oracleSecurityManager.isCircuitBreakerActive()) {
                // Fall back to manual market conditions when secure oracles are unavailable
                return super._applyMarketConditions(baseRate);
            }
        }

        if (!useOracles && !useSecureOracles) {
            return super._applyMarketConditions(baseRate);
        }

        MarketConditions memory conditions = _getOracleMarketConditions();
        uint256 adjustedRate = baseRate;

        // Apply volatility multiplier with bounds checking
        uint256 volatilityMultiplier = conditions.volatilityMultiplier;
        if (volatilityMultiplier > MAX_VOLATILITY_MULTIPLIER) {
            volatilityMultiplier = MAX_VOLATILITY_MULTIPLIER;
        }
        if (volatilityMultiplier < MIN_VOLATILITY_MULTIPLIER) {
            volatilityMultiplier = MIN_VOLATILITY_MULTIPLIER;
        }
        
        adjustedRate = (adjustedRate * volatilityMultiplier) / 100;

        // Add liquidity premium with bounds
        uint256 liquidityPremium = conditions.liquidityPremium;
        if (liquidityPremium > 1000) { // Max 10% premium
            liquidityPremium = 1000;
        }
        adjustedRate += liquidityPremium;

        // Add risk premium with bounds
        uint256 riskPremium = conditions.riskPremium;
        if (riskPremium > 1000) { // Max 10% premium
            riskPremium = 1000;
        }
        adjustedRate += riskPremium;

        return adjustedRate;
    }

    /**
     * @dev Get market conditions from oracles
     */
    function _getOracleMarketConditions() internal view returns (MarketConditions memory) {
        uint256 volatilityMultiplier = _calculateVolatilityMultiplier();
        uint256 liquidityPremium = _getLiquidityPremium();
        uint256 riskPremium = _getRiskPremium();

        return
            MarketConditions({
                volatilityMultiplier: volatilityMultiplier,
                liquidityPremium: liquidityPremium,
                riskPremium: riskPremium,
                lastUpdateTime: block.timestamp
            });
    }

    /**
     * @dev Calculate volatility multiplier from ETH price and volatility feed
     */
    function _calculateVolatilityMultiplier() internal view returns (uint256) {
        // Method 1: Use dedicated volatility feed if available
        if (address(volatilityFeed) != address(0)) {
            try volatilityFeed.latestRoundData() returns (
                uint80,
                int256 volatility,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (block.timestamp - updatedAt <= STALENESS_THRESHOLD && volatility > 0) {
                    uint256 volatilityMultiplier = uint256(volatility);
                    // Ensure within bounds
                    if (volatilityMultiplier > MAX_VOLATILITY_MULTIPLIER) {
                        return MAX_VOLATILITY_MULTIPLIER;
                    }
                    if (volatilityMultiplier < MIN_VOLATILITY_MULTIPLIER) {
                        return MIN_VOLATILITY_MULTIPLIER;
                    }
                    return volatilityMultiplier;
                }
            } catch {}
        }

        // Method 2: Calculate from ETH price movements
        if (address(ethUsdFeed) != address(0)) {
            uint256 calculatedVolatility = _calculateVolatilityFromPriceHistory();
            if (calculatedVolatility > 0) {
                return calculatedVolatility;
            }
        }

        // Fallback to current market conditions
        return marketConditions.volatilityMultiplier;
    }

    /**
     * @dev Calculate volatility from historical price data
     */
    function _calculateVolatilityFromPriceHistory() internal view returns (uint256) {
        uint256 validPrices = 0;
        int256 totalChange = 0;

        for (uint256 i = 1; i < priceHistory.length; i++) {
            if (priceHistory[i].price > 0 && priceHistory[i - 1].price > 0) {
                int256 priceChange = ((priceHistory[i].price - priceHistory[i - 1].price) * 10000) /
                    priceHistory[i - 1].price;
                totalChange += priceChange > 0 ? priceChange : -priceChange; // Absolute value
                validPrices++;
            }
        }

        if (validPrices == 0) return 100; // Normal volatility

        uint256 avgVolatility = uint256(totalChange) / validPrices;

        // Convert to multiplier (basis points to percentage)
        if (avgVolatility < 200) {
            // < 2% average change
            return 80; // Low volatility
        } else if (avgVolatility < 500) {
            // < 5% average change
            return 100; // Normal volatility
        } else if (avgVolatility < 1000) {
            // < 10% average change
            return 150; // High volatility
        } else {
            return 200; // Very high volatility
        }
    }

    /**
     * @dev Get liquidity premium from oracle
     */
    function _getLiquidityPremium() internal view returns (uint256) {
        if (address(liquidityFeed) != address(0)) {
            try liquidityFeed.latestRoundData() returns (uint80, int256 premium, uint256, uint256 updatedAt, uint80) {
                if (block.timestamp - updatedAt <= STALENESS_THRESHOLD) {
                    return premium >= 0 ? uint256(premium) : 0;
                }
            } catch {}
        }

        // Calculate from DeFi rate comparison if available
        if (address(defiRateFeed) != address(0)) {
            try defiRateFeed.latestRoundData() returns (uint80, int256 defiRate, uint256, uint256 updatedAt, uint80) {
                if (block.timestamp - updatedAt <= STALENESS_THRESHOLD && defiRate > 0) {
                    // If DeFi rates are high, increase liquidity premium
                    uint256 defiRateUint = uint256(defiRate);
                    if (defiRateUint > 1000) {
                        // > 10%
                        return 300; // 3% premium
                    } else if (defiRateUint > 500) {
                        // > 5%
                        return 100; // 1% premium
                    }
                }
            } catch {}
        }

        return marketConditions.liquidityPremium;
    }

    /**
     * @dev Get risk premium (enhanced calculation)
     */
    function _getRiskPremium() internal view returns (uint256) {
        uint256 baseRiskPremium = marketConditions.riskPremium;

        // Increase risk premium based on volatility
        uint256 volatilityMultiplier = _calculateVolatilityMultiplier();
        if (volatilityMultiplier > 150) {
            baseRiskPremium += 50; // Add 0.5% for high volatility
        }
        if (volatilityMultiplier > 200) {
            baseRiskPremium += 100; // Add another 1% for very high volatility
        }

        return baseRiskPremium;
    }

    /**
     * @dev Update price history for volatility calculation
     */
    function updatePriceHistory() external {
        if (address(ethUsdFeed) == address(0)) return;

        try ethUsdFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256 updatedAt, uint80) {
            if (price > 0 && block.timestamp - updatedAt <= STALENESS_THRESHOLD) {
                priceHistory[priceHistoryIndex] = PriceHistory(price, updatedAt);
                priceHistoryIndex = (priceHistoryIndex + 1) % priceHistory.length;

                emit OracleDataUpdated("eth_price", price, updatedAt);

                // Auto-update market conditions if enabled
                if (autoUpdateEnabled) {
                    _autoUpdateMarketConditions();
                }
            }
        } catch {}
    }

    /**
     * @dev Automatically update market conditions based on oracle data
     */
    function _autoUpdateMarketConditions() internal {
        MarketConditions memory newConditions = _getOracleMarketConditions();

        marketConditions.volatilityMultiplier = newConditions.volatilityMultiplier;
        marketConditions.liquidityPremium = newConditions.liquidityPremium;
        marketConditions.riskPremium = newConditions.riskPremium;
        marketConditions.lastUpdateTime = block.timestamp;

        emit MarketConditionsAutoUpdated(
            newConditions.volatilityMultiplier,
            newConditions.liquidityPremium,
            newConditions.riskPremium
        );
    }

    /**
     * @dev Manual update market conditions from oracles
     */
    function updateMarketConditionsFromOracles() external {
        require(useOracles, "Oracles not enabled");
        _autoUpdateMarketConditions();
    }

    /**
     * @dev Get current oracle data for display
     */
    function getOracleData()
        external
        view
        returns (
            int256 ethPrice,
            uint256 ethPriceTimestamp,
            int256 volatilityData,
            uint256 volatilityTimestamp,
            int256 liquidityData,
            uint256 liquidityTimestamp,
            int256 defiRateData,
            uint256 defiRateTimestamp,
            bool oraclesActive
        )
    {
        oraclesActive = useOracles;

        if (!useOracles) {
            return (0, 0, 0, 0, 0, 0, 0, 0, false);
        }

        // ETH Price
        if (address(ethUsdFeed) != address(0)) {
            try ethUsdFeed.latestRoundData() returns (uint80, int256 price, uint256, uint256 updatedAt, uint80) {
                ethPrice = price;
                ethPriceTimestamp = updatedAt;
            } catch {}
        }

        // Volatility Data
        if (address(volatilityFeed) != address(0)) {
            try volatilityFeed.latestRoundData() returns (uint80, int256 vol, uint256, uint256 updatedAt, uint80) {
                volatilityData = vol;
                volatilityTimestamp = updatedAt;
            } catch {}
        }

        // Liquidity Data
        if (address(liquidityFeed) != address(0)) {
            try liquidityFeed.latestRoundData() returns (uint80, int256 liq, uint256, uint256 updatedAt, uint80) {
                liquidityData = liq;
                liquidityTimestamp = updatedAt;
            } catch {}
        }

        // DeFi Rate Data
        if (address(defiRateFeed) != address(0)) {
            try defiRateFeed.latestRoundData() returns (uint80, int256 rate, uint256, uint256 updatedAt, uint80) {
                defiRateData = rate;
                defiRateTimestamp = updatedAt;
            } catch {}
        }
    }

    /**
     * @dev Get enhanced rate components with oracle data
     */
    function getCurrentRateComponentsWithOracles(
        uint256 creditScore,
        uint256 utilization
    )
        external
        view
        returns (
            uint256 baseUtilizationRate,
            uint256 creditAdjustedRate,
            uint256 marketAdjustedRate,
            uint256 finalRate,
            uint256 oracleVolatilityMultiplier,
            uint256 oracleLiquidityPremium,
            uint256 oracleRiskPremium
        )
    {
        baseUtilizationRate = _calculateUtilizationRate(utilization);
        creditAdjustedRate = _applyCreditRiskAdjustment(baseUtilizationRate, creditScore);

        if (useOracles) {
            MarketConditions memory oracleConditions = _getOracleMarketConditions();
            oracleVolatilityMultiplier = oracleConditions.volatilityMultiplier;
            oracleLiquidityPremium = oracleConditions.liquidityPremium;
            oracleRiskPremium = oracleConditions.riskPremium;

            marketAdjustedRate = _applyMarketConditions(creditAdjustedRate);
        } else {
            marketAdjustedRate = super._applyMarketConditions(creditAdjustedRate);
            oracleVolatilityMultiplier = marketConditions.volatilityMultiplier;
            oracleLiquidityPremium = marketConditions.liquidityPremium;
            oracleRiskPremium = marketConditions.riskPremium;
        }

        finalRate = _enforceBounds(_applyPerformanceAdjustments(marketAdjustedRate));
    }

    /**
     * @dev Get oracle feed addresses for verification
     */
    function getOracleFeedAddresses()
        external
        view
        returns (address ethUsd, address volatility, address liquidity, address defiRate)
    {
        return (address(ethUsdFeed), address(volatilityFeed), address(liquidityFeed), address(defiRateFeed));
    }

    /**
     * @dev Emergency function to disable oracles
     */
    function emergencyDisableOracles() external onlyOwner {
        useOracles = false;
        useSecureOracles = false;
        autoUpdateEnabled = false;
        emit OracleDataUpdated("emergency_disabled", 0, block.timestamp);
    }

    // ==================== SECURE ORACLE SYSTEM FUNCTIONS ====================

    /**
     * @dev Initialize secure oracle system
     */
    function initializeSecureOracleSystem(
        address _securityManager,
        address _secureEthUsdFeed,
        address _secureVolatilityFeed,
        address _secureLiquidityFeed,
        address _secureDefiRateFeed
    ) external onlyOwner {
        require(_securityManager != address(0), "Invalid security manager");
        
        oracleSecurityManager = IOracleSecurityManager(_securityManager);
        
        if (_secureEthUsdFeed != address(0)) {
            secureEthUsdFeed = SecureAggregatorV3(_secureEthUsdFeed);
        }
        if (_secureVolatilityFeed != address(0)) {
            secureVolatilityFeed = SecureAggregatorV3(_secureVolatilityFeed);
        }
        if (_secureLiquidityFeed != address(0)) {
            secureLiquidityFeed = SecureAggregatorV3(_secureLiquidityFeed);
        }
        if (_secureDefiRateFeed != address(0)) {
            secureDefiRateFeed = SecureAggregatorV3(_secureDefiRateFeed);
        }

        emit SecurityManagerUpdated(address(0), _securityManager);
    }

    /**
     * @dev Enable/disable secure oracle system
     */
    function setUseSecureOracles(bool _useSecureOracles) external onlyOwner {
        require(address(oracleSecurityManager) != address(0), "Secure oracle system not initialized");
        useSecureOracles = _useSecureOracles;
        emit SecureOracleSystemEnabled(_useSecureOracles);
    }

    /**
     * @dev Update security manager
     */
    function updateSecurityManager(address _newSecurityManager) external onlyOwner {
        require(_newSecurityManager != address(0), "Invalid security manager");
        address oldManager = address(oracleSecurityManager);
        oracleSecurityManager = IOracleSecurityManager(_newSecurityManager);
        emit SecurityManagerUpdated(oldManager, _newSecurityManager);
    }

    /**
     * @dev Get secure price with validation
     */
    function getSecurePrice(string calldata priceType) external view returns (
        bool isValid,
        int256 price,
        uint256 confidence,
        string memory reason
    ) {
        if (!useSecureOracles || address(oracleSecurityManager) == address(0)) {
            return (false, 0, 0, "Secure oracles not enabled");
        }

        try oracleSecurityManager.getSecurePrice(priceType) returns (
            IOracleSecurityManager.ValidationResult memory result
        ) {
            return (result.isValid, result.validatedPrice, result.confidence, result.reason);
        } catch {
            return (false, 0, 0, "Oracle security manager call failed");
        }
    }

    /**
     * @dev Override volatility calculation to use secure oracles
     */
    function _calculateVolatilityMultiplier() internal view override returns (uint256) {
        // Try secure oracle system first
        if (useSecureOracles && address(secureVolatilityFeed) != address(0)) {
            try secureVolatilityFeed.latestRoundData() returns (
                uint80,
                int256 volatility,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (block.timestamp - updatedAt <= STALENESS_THRESHOLD && volatility > 0) {
                    uint256 volatilityMultiplier = uint256(volatility);
                    // Ensure within bounds
                    if (volatilityMultiplier > MAX_VOLATILITY_MULTIPLIER) {
                        return MAX_VOLATILITY_MULTIPLIER;
                    }
                    if (volatilityMultiplier < MIN_VOLATILITY_MULTIPLIER) {
                        return MIN_VOLATILITY_MULTIPLIER;
                    }
                    return volatilityMultiplier;
                }
            } catch {
                // Fall through to legacy system
            }
        }

        // Fall back to original implementation
        return super._calculateVolatilityMultiplier();
    }

    /**
     * @dev Override liquidity premium to use secure oracles
     */
    function _getLiquidityPremium() internal view override returns (uint256) {
        // Try secure oracle system first
        if (useSecureOracles && address(secureLiquidityFeed) != address(0)) {
            try secureLiquidityFeed.latestRoundData() returns (
                uint80,
                int256 premium,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                if (block.timestamp - updatedAt <= STALENESS_THRESHOLD) {
                    uint256 liquidityPremium = premium >= 0 ? uint256(premium) : 0;
                    // Cap at 10%
                    return liquidityPremium > 1000 ? 1000 : liquidityPremium;
                }
            } catch {
                // Fall through to legacy system
            }
        }

        // Fall back to original implementation
        return super._getLiquidityPremium();
    }

    /**
     * @dev Check market conditions and trigger circuit breaker if needed
     */
    function checkMarketConditionsAndTriggerCircuitBreaker() external {
        if (!useSecureOracles || address(oracleSecurityManager) == address(0)) {
            return;
        }

        // Check ETH price volatility
        try oracleSecurityManager.checkAndTriggerCircuitBreaker("ETH_USD") {
            // Circuit breaker check completed
        } catch {
            // Check failed, but continue
        }

        // Get current security status
        if (oracleSecurityManager.isCircuitBreakerActive()) {
            emit CircuitBreakerTriggered("Oracle security manager triggered circuit breaker");
        }
    }

    /**
     * @dev Get comprehensive oracle status
     */
    function getOracleSystemStatus() external view returns (
        bool legacyOraclesEnabled,
        bool secureOraclesEnabled,
        bool securityManagerActive,
        bool circuitBreakerActive,
        bool systemPaused,
        string memory status
    ) {
        legacyOraclesEnabled = useOracles;
        secureOraclesEnabled = useSecureOracles;
        securityManagerActive = address(oracleSecurityManager) != address(0);
        
        if (securityManagerActive) {
            circuitBreakerActive = oracleSecurityManager.isCircuitBreakerActive();
            systemPaused = oracleSecurityManager.isPaused();
        }

        // Determine overall status
        if (systemPaused) {
            status = "System paused";
        } else if (circuitBreakerActive) {
            status = "Circuit breaker active";
        } else if (secureOraclesEnabled) {
            status = "Secure oracles active";
        } else if (legacyOraclesEnabled) {
            status = "Legacy oracles active";
        } else {
            status = "Manual mode";
        }
    }

    /**
     * @dev Emergency circuit breaker trigger
     */
    function emergencyTriggerCircuitBreaker(string calldata reason) external onlyOwner {
        if (address(oracleSecurityManager) != address(0)) {
            try oracleSecurityManager.triggerCircuitBreaker(reason) {
                emit CircuitBreakerTriggered(reason);
            } catch {
                // If security manager call fails, disable oracles
                useOracles = false;
                useSecureOracles = false;
                emit CircuitBreakerTriggered(string(abi.encodePacked("Emergency: ", reason)));
            }
        } else {
            // No security manager, just disable oracles
            useOracles = false;
            useSecureOracles = false;
            emit CircuitBreakerTriggered(string(abi.encodePacked("Emergency (no security manager): ", reason)));
        }
    }
}
