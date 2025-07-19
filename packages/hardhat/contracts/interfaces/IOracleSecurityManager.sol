// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IOracleSecurityManager
 * @dev Interface for Oracle Security Manager that provides manipulation protection
 */
interface IOracleSecurityManager {
    struct ValidationResult {
        bool isValid;
        int256 validatedPrice;
        string reason;
        uint256 confidence; // 0-100, confidence in the price
    }

    struct OracleConfig {
        address oracle;
        uint256 weight; // Weight in consensus calculation
        bool isActive;
        uint256 maxDeviationBps; // Max deviation in basis points (100 = 1%)
        uint256 lastUpdateTime;
        uint256 failureCount;
    }

    struct SecurityParameters {
        uint256 maxPriceDeviationBps; // Maximum price change per update (2000 = 20%)
        uint256 circuitBreakerThresholdBps; // Volatility threshold to trigger circuit breaker
        uint256 gracePeriodSeconds; // Grace period for large price changes
        uint256 minOracleCount; // Minimum number of oracles for consensus
        uint256 maxStalenessSeconds; // Maximum time before price is considered stale
        bool circuitBreakerActive; // Whether circuit breaker is currently active
    }

    // Events
    event PriceValidated(address indexed oracle, int256 price, bool isValid, string reason);
    event CircuitBreakerTriggered(string reason, uint256 triggerTime);
    event CircuitBreakerReset(uint256 resetTime);
    event OracleAdded(address indexed oracle, uint256 weight);
    event OracleRemoved(address indexed oracle);
    event SecurityParametersUpdated(SecurityParameters params);
    event SuspiciousActivityDetected(address indexed oracle, string details);

    // Core validation functions
    function validatePrice(address oracle, int256 newPrice) external view returns (ValidationResult memory);
    function getSecurePrice(string calldata priceType) external view returns (ValidationResult memory);
    function isCircuitBreakerActive() external view returns (bool);

    // Oracle management
    function addOracle(address oracle, uint256 weight, uint256 maxDeviationBps) external;
    function removeOracle(address oracle) external;
    function updateOracleWeight(address oracle, uint256 newWeight) external;
    function getOracleConfig(address oracle) external view returns (OracleConfig memory);

    // Security controls
    function triggerCircuitBreaker(string calldata reason) external;
    function resetCircuitBreaker() external;
    function updateSecurityParameters(SecurityParameters calldata params) external;
    function getSecurityParameters() external view returns (SecurityParameters memory);

    // Emergency functions
    function emergencyPause() external;
    function emergencyUnpause() external;
    function isPaused() external view returns (bool);
}