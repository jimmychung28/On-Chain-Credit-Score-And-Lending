// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title MockAggregatorV3
 * @dev Mock implementation of Chainlink AggregatorV3Interface for testing
 */
contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 public override decimals;
    string public override description;
    uint256 public override version = 1;

    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    RoundData private _latestRoundData;
    address public owner;

    event AnswerUpdated(int256 current, uint256 roundId, uint256 updatedAt);

    constructor(uint8 _decimals, string memory _description, int256 _initialAnswer) {
        decimals = _decimals;
        description = _description;
        owner = msg.sender;

        _latestRoundData = RoundData({
            roundId: 1,
            answer: _initialAnswer,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });

        emit AnswerUpdated(_initialAnswer, 1, block.timestamp);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (
            _latestRoundData.roundId,
            _latestRoundData.answer,
            _latestRoundData.startedAt,
            _latestRoundData.updatedAt,
            _latestRoundData.answeredInRound
        );
    }
    
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        // For simplicity, return the latest round data for any round ID
        // In a real implementation, you'd store historical data
        return (
            _latestRoundData.roundId,
            _latestRoundData.answer,
            _latestRoundData.startedAt,
            _latestRoundData.updatedAt,
            _latestRoundData.answeredInRound
        );
    }

    // Admin functions for testing
    function updateAnswer(int256 _answer) external {
        require(msg.sender == owner, "Only owner can update");
        _latestRoundData.roundId++;
        _latestRoundData.answer = _answer;
        _latestRoundData.updatedAt = block.timestamp;
        _latestRoundData.answeredInRound = _latestRoundData.roundId;

        emit AnswerUpdated(_answer, _latestRoundData.roundId, block.timestamp);
    }

    function updateAnswerWithTimestamp(int256 _answer, uint256 _timestamp) external {
        require(msg.sender == owner, "Only owner can update");
        _latestRoundData.roundId++;
        _latestRoundData.answer = _answer;
        _latestRoundData.updatedAt = _timestamp;
        _latestRoundData.answeredInRound = _latestRoundData.roundId;

        emit AnswerUpdated(_answer, _latestRoundData.roundId, _timestamp);
    }

    function setOwner(address _newOwner) external {
        require(msg.sender == owner, "Only owner can transfer ownership");
        owner = _newOwner;
    }

    // Helper function to simulate realistic price movements
    function simulatePriceMovement(int256 _basePrice, int256 _volatilityPercent) external {
        require(msg.sender == owner, "Only owner can simulate");

        // Generate pseudo-random price movement
        uint256 randomSeed = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _latestRoundData.roundId))
        );
        int256 priceChange = (int256(randomSeed % uint256(_volatilityPercent * 2)) - _volatilityPercent);
        int256 newPrice = _basePrice + ((_basePrice * priceChange) / 10000); // volatility in basis points

        if (newPrice > 0) {
            _latestRoundData.roundId++;
            _latestRoundData.answer = newPrice;
            _latestRoundData.updatedAt = block.timestamp;
            _latestRoundData.answeredInRound = _latestRoundData.roundId;

            emit AnswerUpdated(newPrice, _latestRoundData.roundId, block.timestamp);
        }
    }
}
