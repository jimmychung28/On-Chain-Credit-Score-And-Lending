// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/AggregatorV3Interface.sol";
import "../interfaces/IOracleSecurityManager.sol";

/**
 * @title SecureAggregatorV3
 * @dev Secure price aggregator that implements Chainlink AggregatorV3Interface
 *      while providing advanced manipulation protection through multiple oracle validation
 */
contract SecureAggregatorV3 is AggregatorV3Interface, Ownable, ReentrancyGuard {
    IOracleSecurityManager public immutable securityManager;
    
    // Price feed metadata
    uint8 public override decimals;
    string public override description;
    uint256 public override version = 1;
    
    // Current round data
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
        uint256 confidence; // Confidence score from security manager
    }
    
    RoundData private currentRound;
    mapping(uint80 => RoundData) private rounds;
    
    // Configuration
    string public priceType; // e.g., "ETH_USD", "BTC_USD"
    uint256 public minConfidenceScore = 80; // Minimum confidence required
    uint256 public updateCooldown = 300; // 5 minutes between updates
    uint256 public lastUpdateTime;
    
    // Grace period for large price changes
    struct PendingUpdate {
        int256 pendingPrice;
        uint256 submittedAt;
        uint256 gracePeriodEnd;
        bool isActive;
    }
    
    PendingUpdate public pendingUpdate;
    
    // Events
    event PriceUpdated(uint80 indexed roundId, int256 price, uint256 confidence, uint256 timestamp);
    event PriceUpdatePending(int256 pendingPrice, uint256 gracePeriodEnd);
    event PendingUpdateExecuted(int256 price, uint80 roundId);
    event PendingUpdateCancelled(string reason);
    event SecurityManagerUpdated(address oldManager, address newManager);
    
    modifier onlyValidUpdate() {
        require(block.timestamp >= lastUpdateTime + updateCooldown, "Update cooldown active");
        require(!securityManager.isPaused(), "Security manager paused");
        require(!securityManager.isCircuitBreakerActive(), "Circuit breaker active");
        _;
    }
    
    constructor(
        address _securityManager,
        string memory _priceType,
        string memory _description,
        uint8 _decimals,
        int256 _initialPrice
    ) Ownable(msg.sender) {
        require(_securityManager != address(0), "Invalid security manager");
        require(_initialPrice > 0, "Initial price must be positive");
        
        securityManager = IOracleSecurityManager(_securityManager);
        priceType = _priceType;
        description = _description;
        decimals = _decimals;
        
        // Initialize with first round
        currentRound = RoundData({
            roundId: 1,
            answer: _initialPrice,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1,
            confidence: 100 // Initial price has full confidence
        });
        
        rounds[1] = currentRound;
        lastUpdateTime = block.timestamp;
        
        emit PriceUpdated(1, _initialPrice, 100, block.timestamp);
    }
    
    /**
     * @dev Get the latest round data with security validation
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        // Check if there's a pending update that should be executed
        if (pendingUpdate.isActive && block.timestamp >= pendingUpdate.gracePeriodEnd) {
            // Return pending price if grace period has passed
            return (
                currentRound.roundId + 1,
                pendingUpdate.pendingPrice,
                pendingUpdate.submittedAt,
                pendingUpdate.gracePeriodEnd,
                currentRound.roundId + 1
            );
        }
        
        return (
            currentRound.roundId,
            currentRound.answer,
            currentRound.startedAt,
            currentRound.updatedAt,
            currentRound.answeredInRound
        );
    }
    
    /**
     * @dev Get round data for a specific round
     */
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId > 0 && _roundId <= currentRound.roundId, "Invalid round ID");
        
        RoundData memory round = rounds[_roundId];
        return (
            round.roundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            round.answeredInRound
        );
    }
    
    /**
     * @dev Update price through security manager validation
     */
    function updatePrice() external onlyValidUpdate nonReentrant {
        // Get secure aggregated price from security manager
        IOracleSecurityManager.ValidationResult memory result = securityManager.getSecurePrice(priceType);
        
        require(result.isValid, result.reason);
        require(result.confidence >= minConfidenceScore, "Insufficient confidence score");
        
        int256 newPrice = result.validatedPrice;
        
        // Check if this requires a grace period
        if (_requiresGracePeriod(newPrice)) {
            _initiatePendingUpdate(newPrice);
            return;
        }
        
        // Update immediately if no grace period required
        _executeUpdate(newPrice, result.confidence);
    }
    
    /**
     * @dev Execute a pending update after grace period
     */
    function executePendingUpdate() external nonReentrant {
        require(pendingUpdate.isActive, "No pending update");
        require(block.timestamp >= pendingUpdate.gracePeriodEnd, "Grace period not elapsed");
        
        // Re-validate the price through security manager
        IOracleSecurityManager.ValidationResult memory result = securityManager.getSecurePrice(priceType);
        
        if (!result.isValid || result.confidence < minConfidenceScore) {
            _cancelPendingUpdate("Validation failed during execution");
            return;
        }
        
        // Use the freshly validated price instead of the pending one for additional security
        _executeUpdate(result.validatedPrice, result.confidence);
        
        emit PendingUpdateExecuted(result.validatedPrice, currentRound.roundId);
    }
    
    /**
     * @dev Cancel a pending update (only owner)
     */
    function cancelPendingUpdate(string calldata reason) external onlyOwner {
        require(pendingUpdate.isActive, "No pending update to cancel");
        _cancelPendingUpdate(reason);
    }
    
    /**
     * @dev Emergency price update (only owner, bypasses some checks)
     */
    function emergencyUpdatePrice(int256 _price, string calldata _reason) external onlyOwner {
        require(_price > 0, "Price must be positive");
        
        // Log the emergency action
        emit PendingUpdateCancelled(string(abi.encodePacked("Emergency update: ", _reason)));
        
        // Cancel any pending updates
        if (pendingUpdate.isActive) {
            _cancelPendingUpdate("Emergency update initiated");
        }
        
        // Execute immediate update with medium confidence
        _executeUpdate(_price, 75);
    }
    
    /**
     * @dev Get current confidence score
     */
    function getCurrentConfidence() external view returns (uint256) {
        return currentRound.confidence;
    }
    
    /**
     * @dev Get pending update information
     */
    function getPendingUpdate() external view returns (
        int256 price,
        uint256 submittedAt,
        uint256 gracePeriodEnd,
        bool isActive,
        uint256 timeRemaining
    ) {
        price = pendingUpdate.pendingPrice;
        submittedAt = pendingUpdate.submittedAt;
        gracePeriodEnd = pendingUpdate.gracePeriodEnd;
        isActive = pendingUpdate.isActive;
        
        if (isActive && block.timestamp < gracePeriodEnd) {
            timeRemaining = gracePeriodEnd - block.timestamp;
        } else {
            timeRemaining = 0;
        }
    }
    
    /**
     * @dev Update minimum confidence score (only owner)
     */
    function updateMinConfidenceScore(uint256 _minConfidence) external onlyOwner {
        require(_minConfidence >= 50 && _minConfidence <= 100, "Invalid confidence range");
        minConfidenceScore = _minConfidence;
    }
    
    /**
     * @dev Update update cooldown (only owner)
     */
    function updateCooldown(uint256 _cooldown) external onlyOwner {
        require(_cooldown >= 60 && _cooldown <= 3600, "Cooldown must be 1-60 minutes");
        updateCooldown = _cooldown;
    }
    
    /**
     * @dev Check if price update is available
     */
    function canUpdate() external view returns (bool, string memory) {
        if (block.timestamp < lastUpdateTime + updateCooldown) {
            return (false, "Update cooldown active");
        }
        
        if (securityManager.isPaused()) {
            return (false, "Security manager paused");
        }
        
        if (securityManager.isCircuitBreakerActive()) {
            return (false, "Circuit breaker active");
        }
        
        return (true, "Update available");
    }
    
    // ==================== INTERNAL FUNCTIONS ====================
    
    /**
     * @dev Check if price change requires grace period
     */
    function _requiresGracePeriod(int256 newPrice) internal view returns (bool) {
        if (currentRound.answer <= 0) return false;
        
        IOracleSecurityManager.SecurityParameters memory params = securityManager.getSecurityParameters();
        
        // Calculate price deviation
        int256 diff = newPrice > currentRound.answer ? 
            newPrice - currentRound.answer : 
            currentRound.answer - newPrice;
            
        uint256 deviationBps = uint256((diff * 10000) / currentRound.answer);
        
        // Require grace period for changes > 10%
        return deviationBps > 1000;
    }
    
    /**
     * @dev Initiate a pending update with grace period
     */
    function _initiatePendingUpdate(int256 newPrice) internal {
        IOracleSecurityManager.SecurityParameters memory params = securityManager.getSecurityParameters();
        
        // Cancel any existing pending update
        if (pendingUpdate.isActive) {
            _cancelPendingUpdate("New update initiated");
        }
        
        uint256 gracePeriodEnd = block.timestamp + params.gracePeriodSeconds;
        
        pendingUpdate = PendingUpdate({
            pendingPrice: newPrice,
            submittedAt: block.timestamp,
            gracePeriodEnd: gracePeriodEnd,
            isActive: true
        });
        
        emit PriceUpdatePending(newPrice, gracePeriodEnd);
    }
    
    /**
     * @dev Execute price update
     */
    function _executeUpdate(int256 newPrice, uint256 confidence) internal {
        // Clear any pending update
        if (pendingUpdate.isActive) {
            pendingUpdate.isActive = false;
        }
        
        // Create new round
        uint80 newRoundId = currentRound.roundId + 1;
        
        RoundData memory newRound = RoundData({
            roundId: newRoundId,
            answer: newPrice,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: newRoundId,
            confidence: confidence
        });
        
        // Update storage
        currentRound = newRound;
        rounds[newRoundId] = newRound;
        lastUpdateTime = block.timestamp;
        
        emit PriceUpdated(newRoundId, newPrice, confidence, block.timestamp);
    }
    
    /**
     * @dev Cancel pending update
     */
    function _cancelPendingUpdate(string memory reason) internal {
        pendingUpdate.isActive = false;
        emit PendingUpdateCancelled(reason);
    }
    
    /**
     * @dev Get time until next update is allowed
     */
    function getUpdateCooldownRemaining() external view returns (uint256) {
        if (block.timestamp >= lastUpdateTime + updateCooldown) {
            return 0;
        }
        return (lastUpdateTime + updateCooldown) - block.timestamp;
    }
    
    /**
     * @dev Get aggregator health status
     */
    function getHealthStatus() external view returns (
        bool isHealthy,
        uint256 lastUpdateAge,
        uint256 currentConfidence,
        bool hasPendingUpdate,
        string memory status
    ) {
        lastUpdateAge = block.timestamp - currentRound.updatedAt;
        currentConfidence = currentRound.confidence;
        hasPendingUpdate = pendingUpdate.isActive;
        
        // Determine health status
        if (securityManager.isPaused() || securityManager.isCircuitBreakerActive()) {
            isHealthy = false;
            status = "System paused or circuit breaker active";
        } else if (lastUpdateAge > 7200) { // 2 hours
            isHealthy = false;
            status = "Stale data - no recent updates";
        } else if (currentConfidence < 70) {
            isHealthy = false;
            status = "Low confidence in current price";
        } else {
            isHealthy = true;
            status = "Healthy";
        }
    }
}