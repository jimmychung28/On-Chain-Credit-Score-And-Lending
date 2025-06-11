// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../layerzero/LzApp.sol";
import "../CreditScoring.sol";
import "../Groth16Verifier.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CrossChainCreditAggregator
 * @dev Aggregates credit scores across multiple chains using LayerZero
 * @notice This contract enables universal credit scoring across all supported chains
 */
contract CrossChainCreditAggregator is LzApp, ReentrancyGuard, Pausable {
    
    // =============================================================================
    // CONSTANTS & CONFIGURATION
    // =============================================================================
    
    /// @notice Message types for cross-chain communication
    uint16 public constant PT_SCORE_REQUEST = 1;
    uint16 public constant PT_SCORE_RESPONSE = 2;
    uint16 public constant PT_SCORE_UPDATE = 3;
    uint16 public constant PT_BATCH_REQUEST = 4;
    uint16 public constant PT_HEALTH_CHECK = 5;
    
    /// @notice Chain weight configuration (basis points, total = 10000)
    struct ChainWeight {
        uint16 chainId;
        uint16 weight;      // Weight in basis points (e.g., 4000 = 40%)
        bool isActive;
        string name;
    }
    
    /// @notice Cross-chain bonus configuration
    struct CrossChainBonus {
        uint16 diversificationBonus;    // Bonus for being active on multiple chains
        uint16 consistencyBonus;        // Bonus for consistent behavior across chains
        uint16 volumeBonus;            // Bonus for high aggregate volume
        uint16 sophisticationBonus;    // Bonus for advanced multi-chain DeFi usage
    }
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    /// @notice Local credit scoring contract
    CreditScoring public creditScoring;
    
    /// @notice ZK proof verifier for privacy-preserving score verification
    Groth16Verifier public zkVerifier;
    
    /// @notice Chain weight configuration
    mapping(uint16 => ChainWeight) public chainWeights;
    uint16[] public supportedChains;
    
    /// @notice Cross-chain credit data
    mapping(address => mapping(uint16 => uint256)) public crossChainScores;
    mapping(address => mapping(uint16 => uint256)) public lastUpdated;
    mapping(address => uint256) public universalScores;
    mapping(address => bool) public hasUniversalScore;
    
    /// @notice Pending cross-chain requests
    mapping(bytes32 => PendingRequest) public pendingRequests;
    mapping(address => bytes32) public userActiveRequests;
    
    struct PendingRequest {
        address user;
        uint16 requestingChain;
        uint16 pendingResponses;
        uint16 receivedResponses;
        uint256 aggregatedScore;
        uint256 timestamp;
        bool completed;
    }
    
    /// @notice Cross-chain bonus configuration
    CrossChainBonus public crossChainBonus;
    
    /// @notice Gas limits for cross-chain operations
    mapping(uint16 => uint256) public chainGasLimits;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event UniversalScoreCalculated(
        address indexed user, 
        uint256 universalScore, 
        uint16 chainsInvolved,
        uint256 timestamp
    );
    
    event CrossChainScoreReceived(
        address indexed user,
        uint16 indexed srcChain, 
        uint256 score,
        uint256 timestamp
    );
    
    event ScoreRequestSent(
        address indexed user,
        uint16 indexed dstChain,
        bytes32 indexed requestId
    );
    
    event ChainWeightUpdated(
        uint16 indexed chainId,
        uint16 oldWeight,
        uint16 newWeight
    );
    
    event CrossChainBonusUpdated(
        uint16 diversificationBonus,
        uint16 consistencyBonus,
        uint16 volumeBonus,
        uint16 sophisticationBonus
    );
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(
        address _lzEndpoint,
        address _creditScoring,
        address _zkVerifier
    ) LzApp(_lzEndpoint) {
        creditScoring = CreditScoring(_creditScoring);
        zkVerifier = Groth16Verifier(_zkVerifier);
        
        // Initialize default cross-chain bonuses
        crossChainBonus = CrossChainBonus({
            diversificationBonus: 50,      // +50 points for multi-chain activity
            consistencyBonus: 30,          // +30 points for consistent behavior
            volumeBonus: 25,               // +25 points for high volume
            sophisticationBonus: 15        // +15 points for advanced usage
        });
        
        // Initialize default chain weights (can be updated by owner)
        _initializeDefaultChainWeights();
    }
    
    // =============================================================================
    // MAIN FUNCTIONALITY
    // =============================================================================
    
    /**
     * @notice Request universal credit score calculation
     * @param _user Address to calculate universal score for
     * @return requestId Unique identifier for this request
     */
    function requestUniversalScore(address _user) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 requestId) 
    {
        require(_user != address(0), "Invalid user address");
        require(userActiveRequests[_user] == bytes32(0), "Request already pending");
        
        // Generate unique request ID
        requestId = keccak256(abi.encodePacked(_user, block.timestamp, block.prevrandao));
        
        // Count active chains for this user
        uint16 activeChains = _countActiveChains();
        require(activeChains > 0, "No supported chains configured");
        
        // Initialize pending request
        pendingRequests[requestId] = PendingRequest({
            user: _user,
            requestingChain: lzEndpoint.getChainId(),
            pendingResponses: activeChains,
            receivedResponses: 0,
            aggregatedScore: 0,
            timestamp: block.timestamp,
            completed: false
        });
        
        userActiveRequests[_user] = requestId;
        
        // Add local score immediately
        uint256 localScore = creditScoring.getCreditScore(_user);
        if (localScore > 0) {
            crossChainScores[_user][lzEndpoint.getChainId()] = localScore;
            lastUpdated[_user][lzEndpoint.getChainId()] = block.timestamp;
            pendingRequests[requestId].receivedResponses++;
            
            emit CrossChainScoreReceived(_user, lzEndpoint.getChainId(), localScore, block.timestamp);
        }
        
        // Send requests to all other chains
        uint256 totalFee = _sendCrossChainRequests(_user, requestId);
        require(msg.value >= totalFee, "Insufficient fee for cross-chain requests");
        
        // If we have responses from all chains, calculate immediately
        if (pendingRequests[requestId].receivedResponses >= activeChains) {
            _calculateUniversalScore(_user, requestId);
        }
        
        return requestId;
    }
    
    /**
     * @notice Get universal credit score for a user (returns cached if available)
     * @param _user Address to get score for
     * @return score Universal credit score
     * @return timestamp When the score was last calculated
     * @return isStale Whether the score needs refreshing
     */
    function getUniversalScore(address _user) 
        external 
        view 
        returns (uint256 score, uint256 timestamp, bool isStale) 
    {
        score = universalScores[_user];
        
        if (!hasUniversalScore[_user]) {
            return (0, 0, true);
        }
        
        // Find the most recent update across all chains
        uint256 mostRecent = 0;
        for (uint i = 0; i < supportedChains.length; i++) {
            uint16 chainId = supportedChains[i];
            if (lastUpdated[_user][chainId] > mostRecent) {
                mostRecent = lastUpdated[_user][chainId];
            }
        }
        
        timestamp = mostRecent;
        isStale = (block.timestamp - mostRecent) > 1 hours; // Consider stale after 1 hour
    }
    
    /**
     * @notice Verify credit eligibility using ZK proof without revealing score
     * @param _proof ZK proof bytes
     * @param _publicSignals Public signals for verification
     * @return isEligible Whether the user meets the credit requirements
     */
    function verifyUniversalCreditEligibility(
        bytes calldata _proof,
        uint256[4] calldata _publicSignals
    ) external returns (bool isEligible) {
        return zkVerifier.verifyProof(_proof, _publicSignals);
    }
    
    // =============================================================================
    // LAYERZERO MESSAGING
    // =============================================================================
    
    /**
     * @notice Handle incoming LayerZero messages
     */
    function _blockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal override {
        (uint16 packetType, bytes memory data) = abi.decode(_payload, (uint16, bytes));
        
        if (packetType == PT_SCORE_REQUEST) {
            _handleScoreRequest(_srcChainId, data);
        } else if (packetType == PT_SCORE_RESPONSE) {
            _handleScoreResponse(_srcChainId, data);
        } else if (packetType == PT_SCORE_UPDATE) {
            _handleScoreUpdate(_srcChainId, data);
        } else if (packetType == PT_BATCH_REQUEST) {
            _handleBatchRequest(_srcChainId, data);
        } else if (packetType == PT_HEALTH_CHECK) {
            _handleHealthCheck(_srcChainId, data);
        } else {
            revert("Unknown packet type");
        }
    }
    
    /**
     * @notice Handle score request from another chain
     */
    function _handleScoreRequest(uint16 _srcChainId, bytes memory _data) internal {
        (address user, bytes32 requestId) = abi.decode(_data, (address, bytes32));
        
        // Get local credit score
        uint256 localScore = creditScoring.getCreditScore(user);
        
        // Send response back to requesting chain
        bytes memory payload = abi.encode(
            PT_SCORE_RESPONSE,
            abi.encode(user, requestId, localScore, block.timestamp)
        );
        
        _lzSend(
            _srcChainId,
            payload,
            payable(address(this)),
            address(0x0),
            abi.encodePacked(uint16(1), uint256(chainGasLimits[_srcChainId])),
            0
        );
    }
    
    /**
     * @notice Handle score response from another chain
     */
    function _handleScoreResponse(uint16 _srcChainId, bytes memory _data) internal {
        (address user, bytes32 requestId, uint256 score, uint256 timestamp) = 
            abi.decode(_data, (address, bytes32, uint256, uint256));
        
        PendingRequest storage request = pendingRequests[requestId];
        require(request.user == user && !request.completed, "Invalid or completed request");
        
        // Store the cross-chain score
        crossChainScores[user][_srcChainId] = score;
        lastUpdated[user][_srcChainId] = timestamp;
        request.receivedResponses++;
        
        emit CrossChainScoreReceived(user, _srcChainId, score, timestamp);
        
        // Check if we have all responses
        if (request.receivedResponses >= request.pendingResponses) {
            _calculateUniversalScore(user, requestId);
        }
    }
    
    /**
     * @notice Handle real-time score updates from other chains
     */
    function _handleScoreUpdate(uint16 _srcChainId, bytes memory _data) internal {
        (address user, uint256 newScore, uint256 timestamp) = 
            abi.decode(_data, (address, uint256, uint256));
        
        // Update the cross-chain score
        crossChainScores[user][_srcChainId] = newScore;
        lastUpdated[user][_srcChainId] = timestamp;
        
        // Recalculate universal score if user has one
        if (hasUniversalScore[user]) {
            _recalculateUniversalScore(user);
        }
        
        emit CrossChainScoreReceived(user, _srcChainId, newScore, timestamp);
    }
    
    // =============================================================================
    // INTERNAL CALCULATIONS
    // =============================================================================
    
    /**
     * @notice Calculate universal credit score from cross-chain data
     */
    function _calculateUniversalScore(address _user, bytes32 _requestId) internal {
        PendingRequest storage request = pendingRequests[_requestId];
        require(!request.completed, "Request already completed");
        
        uint256 weightedScore = 0;
        uint256 totalWeight = 0;
        uint16 activeChains = 0;
        
        // Calculate weighted average of all chain scores
        for (uint i = 0; i < supportedChains.length; i++) {
            uint16 chainId = supportedChains[i];
            ChainWeight memory weight = chainWeights[chainId];
            
            if (weight.isActive && crossChainScores[_user][chainId] > 0) {
                weightedScore += crossChainScores[_user][chainId] * weight.weight;
                totalWeight += weight.weight;
                activeChains++;
            }
        }
        
        require(totalWeight > 0, "No valid scores found");
        
        // Calculate base universal score
        uint256 baseScore = weightedScore / totalWeight;
        
        // Apply cross-chain bonuses
        uint256 bonuses = _calculateCrossChainBonuses(_user, activeChains);
        uint256 finalScore = baseScore + bonuses;
        
        // Cap at maximum score
        if (finalScore > 850) {
            finalScore = 850;
        }
        
        // Store universal score
        universalScores[_user] = finalScore;
        hasUniversalScore[_user] = true;
        request.completed = true;
        request.aggregatedScore = finalScore;
        
        // Clear active request
        delete userActiveRequests[_user];
        
        emit UniversalScoreCalculated(_user, finalScore, activeChains, block.timestamp);
    }
    
    /**
     * @notice Recalculate universal score when chain data is updated
     */
    function _recalculateUniversalScore(address _user) internal {
        uint256 weightedScore = 0;
        uint256 totalWeight = 0;
        uint16 activeChains = 0;
        
        for (uint i = 0; i < supportedChains.length; i++) {
            uint16 chainId = supportedChains[i];
            ChainWeight memory weight = chainWeights[chainId];
            
            if (weight.isActive && crossChainScores[_user][chainId] > 0) {
                weightedScore += crossChainScores[_user][chainId] * weight.weight;
                totalWeight += weight.weight;
                activeChains++;
            }
        }
        
        if (totalWeight > 0) {
            uint256 baseScore = weightedScore / totalWeight;
            uint256 bonuses = _calculateCrossChainBonuses(_user, activeChains);
            uint256 finalScore = baseScore + bonuses;
            
            if (finalScore > 850) {
                finalScore = 850;
            }
            
            universalScores[_user] = finalScore;
            
            emit UniversalScoreCalculated(_user, finalScore, activeChains, block.timestamp);
        }
    }
    
    /**
     * @notice Calculate cross-chain bonuses
     */
    function _calculateCrossChainBonuses(address _user, uint16 _activeChains) 
        internal 
        view 
        returns (uint256 bonuses) 
    {
        // Diversification bonus (more chains = higher bonus)
        if (_activeChains >= 5) {
            bonuses += crossChainBonus.diversificationBonus;
        } else if (_activeChains >= 3) {
            bonuses += crossChainBonus.diversificationBonus * 70 / 100;
        } else if (_activeChains >= 2) {
            bonuses += crossChainBonus.diversificationBonus * 40 / 100;
        }
        
        // Consistency bonus (similar scores across chains)
        bonuses += _calculateConsistencyBonus(_user);
        
        // Volume bonus (high aggregate activity)
        bonuses += _calculateVolumeBonus(_user);
        
        // Sophistication bonus (advanced multi-chain usage)
        bonuses += _calculateSophisticationBonus(_user);
        
        return bonuses;
    }
    
    /**
     * @notice Calculate consistency bonus based on score variance
     */
    function _calculateConsistencyBonus(address _user) internal view returns (uint256) {
        // Implementation would analyze score variance across chains
        // For now, return basic bonus if scores are reasonably consistent
        return crossChainBonus.consistencyBonus / 2; // Placeholder
    }
    
    /**
     * @notice Calculate volume bonus based on aggregate activity
     */
    function _calculateVolumeBonus(address _user) internal view returns (uint256) {
        // Implementation would sum transaction volumes across all chains
        // For now, return basic bonus
        return crossChainBonus.volumeBonus / 2; // Placeholder
    }
    
    /**
     * @notice Calculate sophistication bonus for advanced multi-chain usage
     */
    function _calculateSophisticationBonus(address _user) internal view returns (uint256) {
        // Implementation would analyze DeFi sophistication across chains
        // For now, return basic bonus
        return crossChainBonus.sophisticationBonus / 2; // Placeholder
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Send cross-chain score requests to all supported chains
     */
    function _sendCrossChainRequests(address _user, bytes32 _requestId) 
        internal 
        returns (uint256 totalFee) 
    {
        uint16 currentChain = lzEndpoint.getChainId();
        
        for (uint i = 0; i < supportedChains.length; i++) {
            uint16 chainId = supportedChains[i];
            
            // Skip current chain (already handled locally)
            if (chainId == currentChain || !chainWeights[chainId].isActive) {
                continue;
            }
            
            bytes memory payload = abi.encode(
                PT_SCORE_REQUEST,
                abi.encode(_user, _requestId)
            );
            
            // Get fee estimate
            (uint256 fee,) = lzEndpoint.estimateFees(
                chainId,
                address(this),
                payload,
                false,
                abi.encodePacked(uint16(1), uint256(chainGasLimits[chainId]))
            );
            
            totalFee += fee;
            
            // Send the request
            _lzSend(
                chainId,
                payload,
                payable(msg.sender),
                address(0x0),
                abi.encodePacked(uint16(1), uint256(chainGasLimits[chainId])),
                fee
            );
            
            emit ScoreRequestSent(_user, chainId, _requestId);
        }
        
        return totalFee;
    }
    
    /**
     * @notice Count active supported chains
     */
    function _countActiveChains() internal view returns (uint16 count) {
        for (uint i = 0; i < supportedChains.length; i++) {
            if (chainWeights[supportedChains[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @notice Initialize default chain weights
     */
    function _initializeDefaultChainWeights() internal {
        // Ethereum (40%)
        chainWeights[1] = ChainWeight(1, 4000, true, "Ethereum");
        supportedChains.push(1);
        
        // Arbitrum (25%)
        chainWeights[42161] = ChainWeight(42161, 2500, true, "Arbitrum");
        supportedChains.push(42161);
        
        // Polygon (20%)
        chainWeights[137] = ChainWeight(137, 2000, true, "Polygon");
        supportedChains.push(137);
        
        // Optimism (10%)
        chainWeights[10] = ChainWeight(10, 1000, true, "Optimism");
        supportedChains.push(10);
        
        // Base (5%)
        chainWeights[8453] = ChainWeight(8453, 500, true, "Base");
        supportedChains.push(8453);
        
        // Set default gas limits
        chainGasLimits[1] = 500000;      // Ethereum
        chainGasLimits[42161] = 300000;  // Arbitrum
        chainGasLimits[137] = 300000;    // Polygon
        chainGasLimits[10] = 300000;     // Optimism
        chainGasLimits[8453] = 300000;   // Base
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update chain weight configuration
     */
    function updateChainWeight(
        uint16 _chainId,
        uint16 _weight,
        bool _isActive,
        string calldata _name
    ) external onlyOwner {
        uint16 oldWeight = chainWeights[_chainId].weight;
        
        chainWeights[_chainId] = ChainWeight(_chainId, _weight, _isActive, _name);
        
        // Add to supported chains if new
        bool exists = false;
        for (uint i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == _chainId) {
                exists = true;
                break;
            }
        }
        
        if (!exists && _isActive) {
            supportedChains.push(_chainId);
        }
        
        emit ChainWeightUpdated(_chainId, oldWeight, _weight);
    }
    
    /**
     * @notice Update cross-chain bonus configuration
     */
    function updateCrossChainBonus(
        uint16 _diversificationBonus,
        uint16 _consistencyBonus,
        uint16 _volumeBonus,
        uint16 _sophisticationBonus
    ) external onlyOwner {
        crossChainBonus = CrossChainBonus({
            diversificationBonus: _diversificationBonus,
            consistencyBonus: _consistencyBonus,
            volumeBonus: _volumeBonus,
            sophisticationBonus: _sophisticationBonus
        });
        
        emit CrossChainBonusUpdated(
            _diversificationBonus,
            _consistencyBonus,
            _volumeBonus,
            _sophisticationBonus
        );
    }
    
    /**
     * @notice Update gas limit for a specific chain
     */
    function updateChainGasLimit(uint16 _chainId, uint256 _gasLimit) external onlyOwner {
        chainGasLimits[_chainId] = _gasLimit;
    }
    
    /**
     * @notice Emergency pause functionality
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause functionality
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Withdraw any ETH sent to this contract
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get all chain scores for a user
     */
    function getAllChainScores(address _user) 
        external 
        view 
        returns (uint16[] memory chainIds, uint256[] memory scores, uint256[] memory timestamps) 
    {
        uint256 activeCount = 0;
        
        // Count active scores
        for (uint i = 0; i < supportedChains.length; i++) {
            if (crossChainScores[_user][supportedChains[i]] > 0) {
                activeCount++;
            }
        }
        
        chainIds = new uint16[](activeCount);
        scores = new uint256[](activeCount);
        timestamps = new uint256[](activeCount);
        
        uint256 index = 0;
        for (uint i = 0; i < supportedChains.length; i++) {
            uint16 chainId = supportedChains[i];
            if (crossChainScores[_user][chainId] > 0) {
                chainIds[index] = chainId;
                scores[index] = crossChainScores[_user][chainId];
                timestamps[index] = lastUpdated[_user][chainId];
                index++;
            }
        }
    }
    
    /**
     * @notice Get pending request details
     */
    function getPendingRequest(bytes32 _requestId) 
        external 
        view 
        returns (
            address user,
            uint16 requestingChain,
            uint16 pendingResponses,
            uint16 receivedResponses,
            uint256 timestamp,
            bool completed
        ) 
    {
        PendingRequest memory request = pendingRequests[_requestId];
        return (
            request.user,
            request.requestingChain,
            request.pendingResponses,
            request.receivedResponses,
            request.timestamp,
            request.completed
        );
    }
    
    /**
     * @notice Get supported chains configuration
     */
    function getSupportedChains() 
        external 
        view 
        returns (uint16[] memory chainIds, ChainWeight[] memory weights) 
    {
        chainIds = supportedChains;
        weights = new ChainWeight[](supportedChains.length);
        
        for (uint i = 0; i < supportedChains.length; i++) {
            weights[i] = chainWeights[supportedChains[i]];
        }
    }
    
    /**
     * @notice Estimate fee for universal score request
     */
    function estimateUniversalScoreFee(address _user) 
        external 
        view 
        returns (uint256 totalFee) 
    {
        uint16 currentChain = lzEndpoint.getChainId();
        
        for (uint i = 0; i < supportedChains.length; i++) {
            uint16 chainId = supportedChains[i];
            
            if (chainId == currentChain || !chainWeights[chainId].isActive) {
                continue;
            }
            
            bytes memory payload = abi.encode(
                PT_SCORE_REQUEST,
                abi.encode(_user, bytes32(0))
            );
            
            (uint256 fee,) = lzEndpoint.estimateFees(
                chainId,
                address(this),
                payload,
                false,
                abi.encodePacked(uint16(1), uint256(chainGasLimits[chainId]))
            );
            
            totalFee += fee;
        }
        
        return totalFee;
    }
    
    // =============================================================================
    // PLACEHOLDER FUNCTIONS FOR BATCH OPERATIONS & HEALTH CHECKS
    // =============================================================================
    
    function _handleBatchRequest(uint16 _srcChainId, bytes memory _data) internal {
        // Implementation for batch score requests
        // This would handle multiple user score requests in a single message
    }
    
    function _handleHealthCheck(uint16 _srcChainId, bytes memory _data) internal {
        // Implementation for cross-chain health monitoring
        // This would respond with chain status and availability
    }
}