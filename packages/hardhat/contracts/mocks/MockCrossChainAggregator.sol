// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../ZKCreditScoring.sol";

/**
 * @title MockCrossChainAggregator
 * @dev Enhanced mock that simulates realistic multi-chain credit aggregation
 */
contract MockCrossChainAggregator {
    
    ZKCreditScoring public creditScoring;
    
    // Enhanced state for realistic multi-chain simulation
    mapping(address => uint256) public universalScores;
    mapping(address => bool) public hasUniversalScore;
    mapping(address => uint256) public lastUpdated;
    
    // Multi-chain simulation data
    mapping(uint16 => string) public chainNames;
    mapping(uint16 => uint16) public chainWeights; // in basis points (10000 = 100%)
    mapping(address => mapping(uint16 => uint256)) public chainScores;
    mapping(address => mapping(uint16 => uint256)) public chainLastUpdated;
    mapping(address => uint16[]) public userActiveChains;
    
    // Cross-chain bonuses
    struct CrossChainBonus {
        uint16 diversificationBonus;    // Bonus for being active on multiple chains
        uint16 consistencyBonus;        // Bonus for consistent behavior across chains
        uint16 volumeBonus;            // Bonus for high aggregate volume
        uint16 sophisticationBonus;    // Bonus for advanced multi-chain DeFi usage
    }
    
    CrossChainBonus public crossChainBonus;
    
    event UniversalScoreCalculated(address indexed user, uint256 score, bytes32 requestId);
    event ChainScoreSimulated(address indexed user, uint16 chainId, uint256 score);
    event CrossChainDataAggregated(address indexed user, uint256 totalChains, uint256 weightedScore);
    
    constructor(
        address, // _lzEndpoint (unused)
        address _creditScoring,
        address  // _zkVerifier (unused)
    ) {
        creditScoring = ZKCreditScoring(_creditScoring);
        
        // Initialize chain configuration with realistic weights
        _initializeChainData();
        
        // Initialize cross-chain bonuses
        crossChainBonus = CrossChainBonus({
            diversificationBonus: 50,      // +50 points for multi-chain activity
            consistencyBonus: 30,          // +30 points for consistent behavior
            volumeBonus: 25,               // +25 points for high volume
            sophisticationBonus: 15        // +15 points for advanced usage
        });
    }
    
    /**
     * @dev Enhanced multi-chain simulation
     */
    function requestUniversalScore(address _user) 
        external 
        payable 
        returns (bytes32 requestId) 
    {
        require(msg.value >= 0.001 ether, "Insufficient fee for cross-chain aggregation");
        
        requestId = keccak256(abi.encodePacked(_user, block.timestamp, msg.sender));
        
        // Get base score from local chain
        (uint256 baseScore, , , , ) = creditScoring.getCreditProfile(_user);
        require(baseScore > 0, "User must be registered to request universal score");
        
        // Simulate multi-chain scores with realistic variation
        _simulateMultiChainScores(_user, baseScore);
        
        // Calculate weighted universal score
        uint256 universalScore = _calculateWeightedScore(_user);
        
        // Apply cross-chain bonuses
        uint256 bonuses = _calculateCrossChainBonuses(_user);
        universalScore += bonuses;
        
        // Cap at maximum score
        if (universalScore > 850) universalScore = 850;
        
        // Store results
        universalScores[_user] = universalScore;
        hasUniversalScore[_user] = true;
        lastUpdated[_user] = block.timestamp;
        
        emit UniversalScoreCalculated(_user, universalScore, requestId);
        emit CrossChainDataAggregated(_user, userActiveChains[_user].length, universalScore);
        
        return requestId;
    }
    
    /**
     * @dev Get universal credit score for a user
     */
    function getUniversalScore(address _user) 
        external 
        view 
        returns (uint256 score, uint256 timestamp, bool isStale) 
    {
        score = universalScores[_user];
        timestamp = lastUpdated[_user];
        isStale = !hasUniversalScore[_user] || (block.timestamp - timestamp) > 1 hours;
    }
    
    /**
     * @dev Fee estimation for localhost
     */
    function estimateUniversalScoreFee(address) 
        public 
        pure 
        returns (uint256) 
    {
        return 0.001 ether; // Fixed fee for localhost
    }
    
    // =============================================================================
    // ENHANCED SIMULATION FUNCTIONS
    // =============================================================================
    
    /**
     * @dev Initialize chain data with realistic weights and characteristics
     */
    function _initializeChainData() internal {
        // Ethereum (40% weight) - Highest weight, mature ecosystem
        chainNames[1] = "Ethereum";
        chainWeights[1] = 4000;
        
        // Polygon (25% weight) - High DeFi activity, lower fees
        chainNames[137] = "Polygon";
        chainWeights[137] = 2500;
        
        // Arbitrum (20% weight) - L2, good for DeFi
        chainNames[42161] = "Arbitrum";
        chainWeights[42161] = 2000;
        
        // Optimism (10% weight) - L2, growing ecosystem
        chainNames[10] = "Optimism";
        chainWeights[10] = 1000;
        
        // Base (5% weight) - Newer chain, emerging ecosystem
        chainNames[8453] = "Base";
        chainWeights[8453] = 500;
    }
    
    /**
     * @dev Simulate realistic multi-chain credit scores
     */
    function _simulateMultiChainScores(address _user, uint256 _baseScore) internal {
        // Clear previous data
        delete userActiveChains[_user];
        
        // Use deterministic but pseudo-random generation based on user address
        uint256 seed = uint256(keccak256(abi.encodePacked(_user, block.timestamp)));
        
        // Ethereum (current chain) - Always present
        chainScores[_user][1] = _baseScore;
        chainLastUpdated[_user][1] = block.timestamp;
        userActiveChains[_user].push(1);
        emit ChainScoreSimulated(_user, 1, _baseScore);
        
        // Polygon - Usually higher scores due to more DeFi activity (80% chance)
        if (seed % 5 != 0) { // 80% chance
            uint256 polygonScore = _baseScore + (seed % 100) + 20; // +20-119 points
            chainScores[_user][137] = polygonScore;
            chainLastUpdated[_user][137] = block.timestamp;
            userActiveChains[_user].push(137);
            emit ChainScoreSimulated(_user, 137, polygonScore);
        }
        
        // Arbitrum - Moderate scores, good for sophisticated users (70% chance)
        if (seed % 10 < 7) { // 70% chance
            uint256 arbScore = _baseScore + (seed % 80) + 10; // +10-89 points
            chainScores[_user][42161] = arbScore;
            chainLastUpdated[_user][42161] = block.timestamp;
            userActiveChains[_user].push(42161);
            emit ChainScoreSimulated(_user, 42161, arbScore);
        }
        
        // Optimism - Similar to Arbitrum but slightly lower adoption (60% chance)
        if (seed % 5 < 3) { // 60% chance
            uint256 opScore = _baseScore + (seed % 70) + 5; // +5-74 points
            chainScores[_user][10] = opScore;
            chainLastUpdated[_user][10] = block.timestamp;
            userActiveChains[_user].push(10);
            emit ChainScoreSimulated(_user, 10, opScore);
        }
        
        // Base - Newer chain, lower but growing scores (40% chance)
        if (seed % 5 < 2) { // 40% chance
            uint256 baseScore = _baseScore + (seed % 50); // +0-49 points
            chainScores[_user][8453] = baseScore;
            chainLastUpdated[_user][8453] = block.timestamp;
            userActiveChains[_user].push(8453);
            emit ChainScoreSimulated(_user, 8453, baseScore);
        }
    }
    
    /**
     * @dev Calculate weighted average score across all chains
     */
    function _calculateWeightedScore(address _user) internal view returns (uint256) {
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < userActiveChains[_user].length; i++) {
            uint16 chainId = userActiveChains[_user][i];
            uint256 score = chainScores[_user][chainId];
            uint16 weight = chainWeights[chainId];
            
            weightedSum += score * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    /**
     * @dev Calculate cross-chain bonuses based on diversity and activity
     */
    function _calculateCrossChainBonuses(address _user) internal view returns (uint256) {
        uint256 totalBonuses = 0;
        uint256 activeChains = userActiveChains[_user].length;
        
        // Diversification bonus - more chains = higher bonus
        if (activeChains >= 5) {
            totalBonuses += crossChainBonus.diversificationBonus; // Full bonus
        } else if (activeChains >= 4) {
            totalBonuses += (crossChainBonus.diversificationBonus * 80) / 100; // 80%
        } else if (activeChains >= 3) {
            totalBonuses += (crossChainBonus.diversificationBonus * 60) / 100; // 60%
        } else if (activeChains >= 2) {
            totalBonuses += (crossChainBonus.diversificationBonus * 40) / 100; // 40%
        }
        
        // Consistency bonus - similar scores across chains indicate stable behavior
        if (activeChains >= 2) {
            totalBonuses += _calculateConsistencyBonus(_user);
        }
        
        // Volume bonus - based on overall activity level
        totalBonuses += _calculateVolumeBonus(_user, activeChains);
        
        // Sophistication bonus - advanced multi-chain usage
        if (activeChains >= 3) {
            totalBonuses += crossChainBonus.sophisticationBonus;
        }
        
        return totalBonuses;
    }
    
    /**
     * @dev Calculate consistency bonus based on score variance
     */
    function _calculateConsistencyBonus(address _user) internal view returns (uint256) {
        if (userActiveChains[_user].length < 2) return 0;
        
        // Calculate average score
        uint256 sum = 0;
        for (uint256 i = 0; i < userActiveChains[_user].length; i++) {
            sum += chainScores[_user][userActiveChains[_user][i]];
        }
        uint256 average = sum / userActiveChains[_user].length;
        
        // Calculate variance (simplified)
        uint256 variance = 0;
        for (uint256 i = 0; i < userActiveChains[_user].length; i++) {
            uint256 score = chainScores[_user][userActiveChains[_user][i]];
            uint256 diff = score > average ? score - average : average - score;
            variance += diff;
        }
        variance = variance / userActiveChains[_user].length;
        
        // Lower variance = higher consistency bonus
        if (variance <= 20) {
            return crossChainBonus.consistencyBonus; // Full bonus for very consistent
        } else if (variance <= 50) {
            return (crossChainBonus.consistencyBonus * 70) / 100; // 70% for moderately consistent
        } else if (variance <= 100) {
            return (crossChainBonus.consistencyBonus * 40) / 100; // 40% for somewhat consistent
        }
        
        return 0; // No bonus for inconsistent scores
    }
    
    /**
     * @dev Calculate volume bonus based on multi-chain activity
     */
    function _calculateVolumeBonus(address _user, uint256 _activeChains) internal view returns (uint256) {
        // Simulate volume based on number of chains and user activity
        uint256 seed = uint256(keccak256(abi.encodePacked(_user, "volume")));
        
        // Higher chain count suggests higher overall volume
        if (_activeChains >= 4 && seed % 3 == 0) { // 33% chance for high-volume users
            return crossChainBonus.volumeBonus;
        } else if (_activeChains >= 3 && seed % 2 == 0) { // 50% chance for medium-volume users
            return (crossChainBonus.volumeBonus * 60) / 100;
        } else if (_activeChains >= 2 && seed % 4 != 0) { // 75% chance for low-volume users
            return (crossChainBonus.volumeBonus * 30) / 100;
        }
        
        return 0;
    }
    
    /**
     * @dev Get detailed chain breakdown for a user (view function for frontend)
     */
    function getUserChainData(address _user) 
        external 
        view 
        returns (
            uint16[] memory chains,
            string[] memory names,
            uint256[] memory scores,
            uint16[] memory weights,
            uint256[] memory timestamps
        ) 
    {
        uint256 count = userActiveChains[_user].length;
        
        chains = new uint16[](count);
        names = new string[](count);
        scores = new uint256[](count);
        weights = new uint16[](count);
        timestamps = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint16 chainId = userActiveChains[_user][i];
            chains[i] = chainId;
            names[i] = chainNames[chainId];
            scores[i] = chainScores[_user][chainId];
            weights[i] = chainWeights[chainId];
            timestamps[i] = chainLastUpdated[_user][chainId];
        }
    }
}