// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title ChainlinkMockAggregator
 * @dev Simple mock aggregator compatible with official Chainlink MockV3Aggregator
 * Provides basic functionality without advanced testing features
 */
contract ChainlinkMockAggregator is AggregatorV3Interface, Ownable {
    uint8 public override decimals;
    string public override description;
    uint256 public override version;

    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint80 public latestRound;

    // Round data storage
    mapping(uint80 => int256) public answers;
    mapping(uint80 => uint256) public timestamps;
    mapping(uint80 => uint256) public startedAtTimestamps;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    constructor(
        uint8 _decimals,
        int256 _initialAnswer
    ) Ownable(msg.sender) {
        decimals = _decimals;
        description = "Mock Aggregator";
        version = 1;
        
        updateAnswer(_initialAnswer);
    }

    function updateAnswer(int256 _answer) public onlyOwner {
        latestAnswer = _answer;
        latestTimestamp = block.timestamp;
        latestRound++;
        
        answers[latestRound] = _answer;
        timestamps[latestRound] = block.timestamp;
        startedAtTimestamps[latestRound] = block.timestamp;
        
        emit AnswerUpdated(_answer, latestRound, block.timestamp);
    }

    function updateRoundData(
        uint80 _roundId,
        int256 _answer,
        uint256 _timestamp,
        uint256 _startedAt
    ) public onlyOwner {
        latestRound = _roundId;
        latestAnswer = _answer;
        latestTimestamp = _timestamp;
        
        answers[_roundId] = _answer;
        timestamps[_roundId] = _timestamp;
        startedAtTimestamps[_roundId] = _startedAt;
        
        emit AnswerUpdated(_answer, _roundId, _timestamp);
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            latestRound,
            latestAnswer,
            latestTimestamp,
            latestTimestamp,
            latestRound
        );
    }

    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            _roundId,
            answers[_roundId],
            startedAtTimestamps[_roundId],
            timestamps[_roundId],
            _roundId
        );
    }

    // Additional utility functions for testing
    function getLatestAnswer() external view returns (int256) {
        return latestAnswer;
    }

    function getLatestTimestamp() external view returns (uint256) {
        return latestTimestamp;
    }

    function getLatestRound() external view returns (uint80) {
        return latestRound;
    }
}