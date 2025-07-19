// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title MaliciousOracleAttacker
 * @dev Mock oracle that can be used to test oracle manipulation attacks
 * @notice This contract is for testing purposes only - simulates malicious oracle behavior
 */
contract MaliciousOracleAttacker is AggregatorV3Interface {
    uint8 public override decimals;
    string public override description;
    uint256 public override version = 1;
    
    address public owner;
    
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }
    
    RoundData private currentRound;
    mapping(uint80 => RoundData) private rounds;
    
    // Malicious behavior flags
    bool public shouldFail;
    bool public shouldReturnInvalidData;
    bool public shouldReturnStaleData;
    int256 public manipulatedPrice;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        uint8 _decimals,
        string memory _description,
        int256 _initialPrice
    ) {
        require(_initialPrice > 0, "Initial price must be positive");
        
        decimals = _decimals;
        description = _description;
        owner = msg.sender;
        
        currentRound = RoundData({
            roundId: 1,
            answer: _initialPrice,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
        
        rounds[1] = currentRound;
    }
    
    /**
     * @dev Get latest round data - can be manipulated for testing
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
        // Simulate oracle failure
        if (shouldFail) {
            revert("Oracle failure simulation");
        }
        
        // Return invalid data (negative price, zero timestamp, etc.)
        if (shouldReturnInvalidData) {
            return (0, -1, 0, 0, 0);
        }
        
        // Return stale data (old timestamp)
        if (shouldReturnStaleData) {
            return (
                currentRound.roundId,
                currentRound.answer,
                currentRound.startedAt,
                block.timestamp - 7200, // 2 hours ago
                currentRound.answeredInRound
            );
        }
        
        // Return manipulated price if set
        int256 priceToReturn = manipulatedPrice != 0 ? manipulatedPrice : currentRound.answer;
        
        return (
            currentRound.roundId,
            priceToReturn,
            currentRound.startedAt,
            currentRound.updatedAt,
            currentRound.answeredInRound
        );
    }
    
    /**
     * @dev Get round data for specific round
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
        if (shouldFail) {
            revert("Oracle failure simulation");
        }
        
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
     * @dev Update answer (normal operation)
     */
    function updateAnswer(int256 _answer) external onlyOwner {
        require(_answer > 0, "Answer must be positive");
        
        uint80 newRoundId = currentRound.roundId + 1;
        
        currentRound = RoundData({
            roundId: newRoundId,
            answer: _answer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: newRoundId
        });
        
        rounds[newRoundId] = currentRound;
    }
    
    /**
     * @dev Update answer with custom timestamp (for testing stale data)
     */
    function updateAnswerWithTimestamp(int256 _answer, uint256 _timestamp) external onlyOwner {
        uint80 newRoundId = currentRound.roundId + 1;
        
        currentRound = RoundData({
            roundId: newRoundId,
            answer: _answer,
            startedAt: _timestamp,
            updatedAt: _timestamp,
            answeredInRound: newRoundId
        });
        
        rounds[newRoundId] = currentRound;
    }
    
    /**
     * @dev Set manipulated price (overrides current answer in latestRoundData)
     */
    function setManipulatedPrice(int256 _price) external onlyOwner {
        manipulatedPrice = _price;
    }
    
    /**
     * @dev Enable/disable oracle failure simulation
     */
    function setShouldFail(bool _shouldFail) external onlyOwner {
        shouldFail = _shouldFail;
    }
    
    /**
     * @dev Enable/disable invalid data return
     */
    function setShouldReturnInvalidData(bool _shouldReturnInvalid) external onlyOwner {
        shouldReturnInvalidData = _shouldReturnInvalid;
    }
    
    /**
     * @dev Enable/disable stale data return
     */
    function setShouldReturnStaleData(bool _shouldReturnStale) external onlyOwner {
        shouldReturnStaleData = _shouldReturnStale;
    }
    
    /**
     * @dev Transfer ownership (for attack simulation)
     */
    function setOwner(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }
    
    /**
     * @dev Simulate extreme price manipulation attack
     */
    function executeManipulationAttack(int256 _extremePrice) external onlyOwner {
        // Set manipulated price to extreme value
        manipulatedPrice = _extremePrice;
        
        // Also update the actual round data
        uint80 newRoundId = currentRound.roundId + 1;
        
        currentRound = RoundData({
            roundId: newRoundId,
            answer: _extremePrice,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: newRoundId
        });
        
        rounds[newRoundId] = currentRound;
    }
    
    /**
     * @dev Simulate gradual price manipulation (more sophisticated attack)
     */
    function executeGradualManipulation(int256 _targetPrice, uint256 _steps) external onlyOwner {
        require(_steps > 0 && _steps <= 10, "Invalid steps");
        
        int256 currentPrice = currentRound.answer;
        int256 priceStep = (_targetPrice - currentPrice) / int256(_steps);
        
        // This would normally be called over multiple blocks/transactions
        // For testing, we just update to one step closer to target
        int256 newPrice = currentPrice + priceStep;
        manipulatedPrice = newPrice;
        
        uint80 newRoundId = currentRound.roundId + 1;
        
        currentRound = RoundData({
            roundId: newRoundId,
            answer: newPrice,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: newRoundId
        });
        
        rounds[newRoundId] = currentRound;
    }
    
    /**
     * @dev Reset to normal operation
     */
    function resetToNormal() external onlyOwner {
        shouldFail = false;
        shouldReturnInvalidData = false;
        shouldReturnStaleData = false;
        manipulatedPrice = 0;
    }
    
    /**
     * @dev Get current malicious settings (for testing verification)
     */
    function getMaliciousSettings() external view returns (
        bool failMode,
        bool invalidDataMode,
        bool staleDataMode,
        int256 manipulatedPriceValue,
        address currentOwner
    ) {
        return (
            shouldFail,
            shouldReturnInvalidData,
            shouldReturnStaleData,
            manipulatedPrice,
            owner
        );
    }
}