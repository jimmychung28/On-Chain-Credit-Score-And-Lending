// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IOracleSecurityManager.sol";
import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title OracleSecurityManager
 * @dev Advanced oracle security system with manipulation protection
 */
contract OracleSecurityManager is IOracleSecurityManager, Ownable, ReentrancyGuard, Pausable {
    // State variables
    SecurityParameters public securityParams;
    mapping(address => OracleConfig) public oracles;
    mapping(string => address[]) public priceTypeOracles; // e.g., "ETH_USD" => [oracle1, oracle2, oracle3]
    mapping(address => mapping(uint256 => int256)) public priceHistory; // oracle => timestamp => price
    
    address[] public activeOracles;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant CONFIDENCE_THRESHOLD = 80; // 80% confidence required
    
    // Price tracking for volatility calculation
    struct PriceSnapshot {
        int256 price;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    mapping(string => PriceSnapshot[]) public priceSnapshots; // priceType => snapshots
    mapping(string => uint256) public snapshotIndex; // Current snapshot index for circular buffer
    uint256 public constant MAX_SNAPSHOTS = 100; // Keep last 100 price snapshots
    
    // Circuit breaker state
    bool public circuitBreakerActive;
    uint256 public circuitBreakerTriggeredAt;
    string public circuitBreakerReason;
    
    modifier onlyWhenNotPaused() {
        require(!paused() && !circuitBreakerActive, "System is paused or circuit breaker active");
        _;
    }
    
    modifier validOracle(address oracle) {
        require(oracles[oracle].isActive, "Oracle not active");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Initialize with conservative security parameters
        securityParams = SecurityParameters({
            maxPriceDeviationBps: 2000, // 20% max deviation
            circuitBreakerThresholdBps: 5000, // 50% volatility triggers circuit breaker
            gracePeriodSeconds: 900, // 15 minutes grace period
            minOracleCount: 1, // Start with 1, increase as more oracles are added
            maxStalenessSeconds: 3600, // 1 hour staleness threshold
            circuitBreakerActive: false
        });
    }

    /**
     * @dev Validate a price from a specific oracle
     */
    function validatePrice(address oracle, int256 newPrice) 
        external 
        view 
        override 
        validOracle(oracle) 
        returns (ValidationResult memory) 
    {
        if (newPrice <= 0) {
            return ValidationResult({
                isValid: false,
                validatedPrice: 0,
                reason: "Price must be positive",
                confidence: 0
            });
        }

        // Get latest valid price for comparison
        int256 lastValidPrice = _getLastValidPrice(oracle);
        
        if (lastValidPrice > 0) {
            uint256 deviationBps = _calculateDeviationBps(lastValidPrice, newPrice);
            
            // Check against oracle-specific max deviation
            if (deviationBps > oracles[oracle].maxDeviationBps) {
                return ValidationResult({
                    isValid: false,
                    validatedPrice: lastValidPrice,
                    reason: "Price deviation exceeds oracle limit",
                    confidence: 0
                });
            }
            
            // Check against global max deviation
            if (deviationBps > securityParams.maxPriceDeviationBps) {
                return ValidationResult({
                    isValid: false,
                    validatedPrice: lastValidPrice,
                    reason: "Price deviation exceeds global limit",
                    confidence: 0
                });
            }
        }

        // Calculate confidence based on how close the price is to recent average
        uint256 confidence = _calculatePriceConfidence(oracle, newPrice);
        
        return ValidationResult({
            isValid: true,
            validatedPrice: newPrice,
            reason: "Price validation successful",
            confidence: confidence
        });
    }

    /**
     * @dev Get secure aggregated price for a specific price type
     */
    function getSecurePrice(string calldata priceType) 
        external 
        view 
        override 
        onlyWhenNotPaused 
        returns (ValidationResult memory) 
    {
        address[] memory typeOracles = priceTypeOracles[priceType];
        
        if (typeOracles.length < securityParams.minOracleCount) {
            return ValidationResult({
                isValid: false,
                validatedPrice: 0,
                reason: "Insufficient active oracles",
                confidence: 0
            });
        }

        // Collect valid prices from all oracles
        int256[] memory validPrices = new int256[](typeOracles.length);
        uint256[] memory weights = new uint256[](typeOracles.length);
        uint256 validCount = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < typeOracles.length; i++) {
            address oracle = typeOracles[i];
            
            if (!oracles[oracle].isActive) continue;
            
            try AggregatorV3Interface(oracle).latestRoundData() returns (
                uint80,
                int256 price,
                uint256,
                uint256 updatedAt,
                uint80
            ) {
                // Check staleness
                if (block.timestamp - updatedAt > securityParams.maxStalenessSeconds) {
                    continue;
                }
                
                // Validate price
                ValidationResult memory validation = this.validatePrice(oracle, price);
                if (validation.isValid) {
                    validPrices[validCount] = price;
                    weights[validCount] = oracles[oracle].weight;
                    totalWeight += oracles[oracle].weight;
                    validCount++;
                }
            } catch {
                // Oracle call failed, skip this oracle
                continue;
            }
        }

        if (validCount < securityParams.minOracleCount) {
            return ValidationResult({
                isValid: false,
                validatedPrice: 0,
                reason: "Insufficient valid oracle responses",
                confidence: 0
            });
        }

        // Calculate weighted median price
        int256 aggregatedPrice = _calculateWeightedMedian(validPrices, weights, validCount);
        
        // Check for suspicious consensus (all oracles reporting very similar prices could indicate manipulation)
        uint256 consensus = _calculateConsensusScore(validPrices, validCount, aggregatedPrice);
        
        if (consensus < CONFIDENCE_THRESHOLD) {
            return ValidationResult({
                isValid: false,
                validatedPrice: aggregatedPrice,
                reason: "Low consensus among oracles",
                confidence: consensus
            });
        }

        return ValidationResult({
            isValid: true,
            validatedPrice: aggregatedPrice,
            reason: "Secure price aggregation successful",
            confidence: consensus
        });
    }

    /**
     * @dev Check if circuit breaker is currently active
     */
    function isCircuitBreakerActive() external view override returns (bool) {
        return circuitBreakerActive || paused();
    }

    /**
     * @dev Add a new oracle to the system
     */
    function addOracle(address oracle, uint256 weight, uint256 maxDeviationBps) 
        external 
        override 
        onlyOwner 
    {
        require(oracle != address(0), "Invalid oracle address");
        require(!oracles[oracle].isActive, "Oracle already exists");
        require(weight > 0 && weight <= 10000, "Invalid weight");
        require(maxDeviationBps > 0 && maxDeviationBps <= 10000, "Invalid max deviation");

        oracles[oracle] = OracleConfig({
            oracle: oracle,
            weight: weight,
            isActive: true,
            maxDeviationBps: maxDeviationBps,
            lastUpdateTime: block.timestamp,
            failureCount: 0
        });

        activeOracles.push(oracle);

        // Increase minimum oracle count as we add more oracles
        if (activeOracles.length >= 3 && securityParams.minOracleCount < 2) {
            securityParams.minOracleCount = 2;
        }

        emit OracleAdded(oracle, weight);
    }

    /**
     * @dev Remove an oracle from the system
     */
    function removeOracle(address oracle) external override onlyOwner validOracle(oracle) {
        oracles[oracle].isActive = false;

        // Remove from active oracles array
        for (uint256 i = 0; i < activeOracles.length; i++) {
            if (activeOracles[i] == oracle) {
                activeOracles[i] = activeOracles[activeOracles.length - 1];
                activeOracles.pop();
                break;
            }
        }

        emit OracleRemoved(oracle);
    }

    /**
     * @dev Update oracle weight
     */
    function updateOracleWeight(address oracle, uint256 newWeight) 
        external 
        override 
        onlyOwner 
        validOracle(oracle) 
    {
        require(newWeight > 0 && newWeight <= 10000, "Invalid weight");
        oracles[oracle].weight = newWeight;
    }

    /**
     * @dev Get oracle configuration
     */
    function getOracleConfig(address oracle) external view override returns (OracleConfig memory) {
        return oracles[oracle];
    }

    /**
     * @dev Trigger circuit breaker manually
     */
    function triggerCircuitBreaker(string calldata reason) external override onlyOwner {
        circuitBreakerActive = true;
        circuitBreakerTriggeredAt = block.timestamp;
        circuitBreakerReason = reason;
        
        emit CircuitBreakerTriggered(reason, block.timestamp);
    }

    /**
     * @dev Reset circuit breaker
     */
    function resetCircuitBreaker() external override onlyOwner {
        require(circuitBreakerActive, "Circuit breaker not active");
        
        circuitBreakerActive = false;
        circuitBreakerTriggeredAt = 0;
        circuitBreakerReason = "";
        
        emit CircuitBreakerReset(block.timestamp);
    }

    /**
     * @dev Update security parameters
     */
    function updateSecurityParameters(SecurityParameters calldata params) 
        external 
        override 
        onlyOwner 
    {
        require(params.maxPriceDeviationBps > 0 && params.maxPriceDeviationBps <= 10000, "Invalid max deviation");
        require(params.circuitBreakerThresholdBps > 0 && params.circuitBreakerThresholdBps <= 10000, "Invalid CB threshold");
        require(params.minOracleCount > 0, "Invalid min oracle count");
        require(params.maxStalenessSeconds > 0, "Invalid staleness threshold");

        securityParams = params;
        emit SecurityParametersUpdated(params);
    }

    /**
     * @dev Get current security parameters
     */
    function getSecurityParameters() external view override returns (SecurityParameters memory) {
        return securityParams;
    }

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external override onlyOwner {
        _pause();
    }

    /**
     * @dev Emergency unpause function
     */
    function emergencyUnpause() external override onlyOwner {
        _unpause();
    }

    /**
     * @dev Check if system is paused
     */
    function isPaused() external view override returns (bool) {
        return paused();
    }

    // ==================== INTERNAL FUNCTIONS ====================

    /**
     * @dev Get the last valid price for an oracle
     */
    function _getLastValidPrice(address oracle) internal view returns (int256) {
        try AggregatorV3Interface(oracle).latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (block.timestamp - updatedAt <= securityParams.maxStalenessSeconds && price > 0) {
                return price;
            }
        } catch {
            // Oracle call failed
        }
        return 0;
    }

    /**
     * @dev Calculate price deviation in basis points
     */
    function _calculateDeviationBps(int256 oldPrice, int256 newPrice) internal pure returns (uint256) {
        if (oldPrice <= 0) return 0;
        
        int256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return uint256((diff * int256(BASIS_POINTS)) / oldPrice);
    }

    /**
     * @dev Calculate confidence score for a price
     */
    function _calculatePriceConfidence(address oracle, int256 price) internal view returns (uint256) {
        // Simple confidence calculation based on price stability
        // In production, this could be more sophisticated
        
        try AggregatorV3Interface(oracle).latestRoundData() returns (
            uint80,
            int256 currentPrice,
            uint256,
            uint256,
            uint80
        ) {
            if (currentPrice <= 0) return 0;
            
            uint256 deviation = _calculateDeviationBps(currentPrice, price);
            
            if (deviation <= 100) return 100; // < 1% deviation = 100% confidence
            if (deviation <= 500) return 90;  // < 5% deviation = 90% confidence
            if (deviation <= 1000) return 75; // < 10% deviation = 75% confidence
            if (deviation <= 2000) return 50; // < 20% deviation = 50% confidence
            return 25; // > 20% deviation = 25% confidence
        } catch {
            return 0;
        }
    }

    /**
     * @dev Calculate weighted median of prices
     */
    function _calculateWeightedMedian(
        int256[] memory prices,
        uint256[] memory weights,
        uint256 count
    ) internal pure returns (int256) {
        if (count == 0) return 0;
        if (count == 1) return prices[0];

        // Simple implementation: for now, return weighted average
        // In production, implement true weighted median
        int256 weightedSum = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < count; i++) {
            weightedSum += prices[i] * int256(weights[i]);
            totalWeight += weights[i];
        }

        return weightedSum / int256(totalWeight);
    }

    /**
     * @dev Calculate consensus score among oracles
     */
    function _calculateConsensusScore(
        int256[] memory prices,
        uint256 count,
        int256 aggregatedPrice
    ) internal pure returns (uint256) {
        if (count <= 1) return 100;

        uint256 consensusCount = 0;
        uint256 tolerance = 500; // 5% tolerance

        for (uint256 i = 0; i < count; i++) {
            uint256 deviation = _calculateDeviationBps(aggregatedPrice, prices[i]);
            if (deviation <= tolerance) {
                consensusCount++;
            }
        }

        return (consensusCount * 100) / count;
    }

    /**
     * @dev Add price type oracle mapping
     */
    function addPriceTypeOracle(string calldata priceType, address oracle) external onlyOwner {
        require(oracles[oracle].isActive, "Oracle not active");
        priceTypeOracles[priceType].push(oracle);
    }

    /**
     * @dev Get active oracle count
     */
    function getActiveOracleCount() external view returns (uint256) {
        return activeOracles.length;
    }

    /**
     * @dev Auto-trigger circuit breaker if volatility is too high
     */
    function checkAndTriggerCircuitBreaker(string calldata priceType) external {
        if (circuitBreakerActive) return;

        // Calculate recent volatility
        PriceSnapshot[] storage snapshots = priceSnapshots[priceType];
        if (snapshots.length < 10) return; // Need at least 10 data points

        uint256 currentIndex = snapshotIndex[priceType];
        uint256 volatility = _calculateRecentVolatility(snapshots, currentIndex);

        if (volatility > securityParams.circuitBreakerThresholdBps) {
            circuitBreakerActive = true;
            circuitBreakerTriggeredAt = block.timestamp;
            circuitBreakerReason = "High volatility detected";
            
            emit CircuitBreakerTriggered("High volatility detected", block.timestamp);
        }
    }

    /**
     * @dev Calculate recent volatility from price snapshots
     */
    function _calculateRecentVolatility(
        PriceSnapshot[] storage snapshots,
        uint256 currentIndex
    ) internal view returns (uint256) {
        // Simple volatility calculation using standard deviation of recent prices
        // In production, use more sophisticated volatility models
        
        uint256 sampleSize = snapshots.length < 20 ? snapshots.length : 20;
        if (sampleSize < 2) return 0;

        int256 sum = 0;
        uint256 count = 0;

        // Calculate average of recent prices
        for (uint256 i = 0; i < sampleSize; i++) {
            uint256 index = (currentIndex + snapshots.length - i) % snapshots.length;
            if (snapshots[index].price > 0) {
                sum += snapshots[index].price;
                count++;
            }
        }

        if (count < 2) return 0;
        int256 average = sum / int256(count);

        // Calculate variance
        uint256 variance = 0;
        for (uint256 i = 0; i < sampleSize; i++) {
            uint256 index = (currentIndex + snapshots.length - i) % snapshots.length;
            if (snapshots[index].price > 0) {
                int256 diff = snapshots[index].price - average;
                variance += uint256((diff * diff) / (average * average)) * BASIS_POINTS;
            }
        }

        return variance / count; // Return variance as volatility measure
    }
}