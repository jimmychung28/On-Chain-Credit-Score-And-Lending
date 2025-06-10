// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/AggregatorV3Interface.sol";
import "./MockAggregatorV3.sol";

/**
 * @title HybridMockOracle
 * @dev Supports both custom advanced mocks and official Chainlink-style mocks
 * Allows switching between implementations for maximum flexibility
 */
contract HybridMockOracle is AggregatorV3Interface, Ownable {
    enum MockType {
        CUSTOM_ADVANCED,    // Use custom MockAggregatorV3 with advanced features
        CHAINLINK_STANDARD, // Use simple Chainlink-style mock
        HYBRID_MODE        // Use both with fallback logic
    }

    // Current mock type being used
    MockType public currentMockType;
    
    // Custom advanced mock (your existing implementation)
    MockAggregatorV3 public customMock;
    
    // Simple Chainlink-style mock data
    struct StandardMockData {
        uint8 decimals;
        string description;
        uint256 version;
        int256 answer;
        uint256 timestamp;
        uint80 roundId;
    }
    
    StandardMockData public standardMock;
    
    // Events
    event MockTypeChanged(MockType oldType, MockType newType);
    event StandardMockUpdated(int256 newAnswer, uint256 timestamp);
    event CustomMockUpdated(address customMockAddress);

    constructor(
        uint8 _decimals,
        string memory _description,
        int256 _initialAnswer
    ) Ownable(msg.sender) {
        // Initialize custom advanced mock
        customMock = new MockAggregatorV3(_decimals, _description, _initialAnswer);
        
        // Initialize standard mock data
        standardMock = StandardMockData({
            decimals: _decimals,
            description: _description,
            version: 1,
            answer: _initialAnswer,
            timestamp: block.timestamp,
            roundId: 1
        });
        
        // Start with custom mock by default
        currentMockType = MockType.CUSTOM_ADVANCED;
    }

    /**
     * @dev Switch between different mock implementations
     */
    function setMockType(MockType _mockType) external onlyOwner {
        MockType oldType = currentMockType;
        currentMockType = _mockType;
        emit MockTypeChanged(oldType, _mockType);
    }

    /**
     * @dev Update the custom mock implementation
     */
    function setCustomMock(address _customMockAddress) external onlyOwner {
        require(_customMockAddress != address(0), "Invalid mock address");
        customMock = MockAggregatorV3(_customMockAddress);
        emit CustomMockUpdated(_customMockAddress);
    }

    // ============ AggregatorV3Interface Implementation ============

    function decimals() external view override returns (uint8) {
        if (currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE) {
            try customMock.decimals() returns (uint8 result) {
                return result;
            } catch {
                if (currentMockType == MockType.HYBRID_MODE) {
                    return standardMock.decimals;
                }
                revert("Custom mock failed");
            }
        }
        return standardMock.decimals;
    }

    function description() external view override returns (string memory) {
        if (currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE) {
            try customMock.description() returns (string memory result) {
                return result;
            } catch {
                if (currentMockType == MockType.HYBRID_MODE) {
                    return standardMock.description;
                }
                revert("Custom mock failed");
            }
        }
        return standardMock.description;
    }

    function version() external view override returns (uint256) {
        if (currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE) {
            try customMock.version() returns (uint256 result) {
                return result;
            } catch {
                if (currentMockType == MockType.HYBRID_MODE) {
                    return standardMock.version;
                }
                revert("Custom mock failed");
            }
        }
        return standardMock.version;
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        if (currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE) {
            try customMock.latestRoundData() returns (
                uint80 _roundId,
                int256 _answer,
                uint256 _startedAt,
                uint256 _updatedAt,
                uint80 _answeredInRound
            ) {
                return (_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
            } catch {
                if (currentMockType == MockType.HYBRID_MODE) {
                    return (
                        standardMock.roundId,
                        standardMock.answer,
                        standardMock.timestamp,
                        standardMock.timestamp,
                        standardMock.roundId
                    );
                }
                revert("Custom mock failed");
            }
        }
        
        return (
            standardMock.roundId,
            standardMock.answer,
            standardMock.timestamp,
            standardMock.timestamp,
            standardMock.roundId
        );
    }

    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        if (currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE) {
            try customMock.getRoundData(_roundId) returns (
                uint80 _rid,
                int256 _answer,
                uint256 _startedAt,
                uint256 _updatedAt,
                uint80 _answeredInRound
            ) {
                return (_rid, _answer, _startedAt, _updatedAt, _answeredInRound);
            } catch {
                if (currentMockType == MockType.HYBRID_MODE) {
                    // For standard mock, return same data regardless of round
                    return (
                        _roundId,
                        standardMock.answer,
                        standardMock.timestamp,
                        standardMock.timestamp,
                        _roundId
                    );
                }
                revert("Custom mock failed");
            }
        }
        
        return (
            _roundId,
            standardMock.answer,
            standardMock.timestamp,
            standardMock.timestamp,
            _roundId
        );
    }

    // ============ Standard Mock Management ============

    /**
     * @dev Update standard mock answer (Chainlink-style)
     */
    function updateAnswer(int256 _answer) external onlyOwner {
        standardMock.answer = _answer;
        standardMock.timestamp = block.timestamp;
        standardMock.roundId++;
        emit StandardMockUpdated(_answer, block.timestamp);
    }

    /**
     * @dev Update standard mock with timestamp
     */
    function updateAnswerWithTimestamp(int256 _answer, uint256 _timestamp) external onlyOwner {
        standardMock.answer = _answer;
        standardMock.timestamp = _timestamp;
        standardMock.roundId++;
        emit StandardMockUpdated(_answer, _timestamp);
    }

    // ============ Advanced Mock Features (Delegated to Custom Mock) ============

    /**
     * @dev Simulate price movement using custom mock
     * Only available when using CUSTOM_ADVANCED or HYBRID_MODE
     */
    function simulatePriceMovement(uint256 maxPercentChange, uint256 steps) external onlyOwner {
        require(
            currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE,
            "Advanced features only available in custom mock mode"
        );
        customMock.simulatePriceMovement(maxPercentChange, steps);
    }

    /**
     * @dev Set custom mock answer
     */
    function setCustomAnswer(int256 _answer) external onlyOwner {
        require(
            currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE,
            "Custom features only available in custom mock mode"
        );
        customMock.updateAnswer(_answer);
    }

    /**
     * @dev Set custom mock answer with timestamp
     */
    function setCustomAnswerWithTimestamp(int256 _answer, uint256 _timestamp) external onlyOwner {
        require(
            currentMockType == MockType.CUSTOM_ADVANCED || currentMockType == MockType.HYBRID_MODE,
            "Custom features only available in custom mock mode"
        );
        customMock.updateAnswerWithTimestamp(_answer, _timestamp);
    }

    // ============ Utility Functions ============

    /**
     * @dev Get current mock type as string
     */
    function getCurrentMockTypeString() external view returns (string memory) {
        if (currentMockType == MockType.CUSTOM_ADVANCED) return "CUSTOM_ADVANCED";
        if (currentMockType == MockType.CHAINLINK_STANDARD) return "CHAINLINK_STANDARD";
        if (currentMockType == MockType.HYBRID_MODE) return "HYBRID_MODE";
        return "UNKNOWN";
    }

    /**
     * @dev Check if custom mock is healthy
     */
    function isCustomMockHealthy() external view returns (bool) {
        if (address(customMock) == address(0)) return false;
        
        try customMock.decimals() returns (uint8) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev Get both mock answers for comparison
     */
    function getBothAnswers() external view returns (int256 customAnswer, int256 standardAnswer) {
        if (address(customMock) != address(0)) {
            try customMock.latestRoundData() returns (
                uint80,
                int256 _customAnswer,
                uint256,
                uint256,
                uint80
            ) {
                customAnswer = _customAnswer;
            } catch {
                customAnswer = 0;
            }
        }
        
        standardAnswer = standardMock.answer;
    }
}