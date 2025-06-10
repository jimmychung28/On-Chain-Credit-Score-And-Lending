// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./HybridMockOracle.sol";
import "./ChainlinkMockAggregator.sol";
import "./MockAggregatorV3.sol";

/**
 * @title MockOracleFactory
 * @dev Factory contract to deploy different types of mock oracles
 * Provides a unified interface for creating test oracles
 */
contract MockOracleFactory is Ownable {
    enum OracleType {
        CUSTOM_ADVANCED,     // Your sophisticated mock with simulation features
        CHAINLINK_STANDARD,  // Simple Chainlink-compatible mock
        HYBRID               // Hybrid that supports both
    }

    struct DeployedOracle {
        address oracleAddress;
        OracleType oracleType;
        string description;
        uint8 decimals;
        int256 initialAnswer;
        uint256 deployedAt;
    }

    // Track all deployed oracles
    mapping(string => DeployedOracle) public deployedOracles;
    string[] public oracleNames;

    // Events
    event OracleDeployed(
        string indexed name,
        address indexed oracleAddress,
        OracleType oracleType,
        string description
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Deploy a custom advanced mock oracle
     */
    function deployCustomAdvancedMock(
        string memory _name,
        uint8 _decimals,
        string memory _description,
        int256 _initialAnswer
    ) external onlyOwner returns (address) {
        require(deployedOracles[_name].oracleAddress == address(0), "Oracle name already exists");

        MockAggregatorV3 oracle = new MockAggregatorV3(_decimals, _description, _initialAnswer);
        
        _recordDeployment(
            _name,
            address(oracle),
            OracleType.CUSTOM_ADVANCED,
            _description,
            _decimals,
            _initialAnswer
        );

        return address(oracle);
    }

    /**
     * @dev Deploy a Chainlink-compatible standard mock
     */
    function deployChainlinkStandardMock(
        string memory _name,
        uint8 _decimals,
        int256 _initialAnswer
    ) external onlyOwner returns (address) {
        require(deployedOracles[_name].oracleAddress == address(0), "Oracle name already exists");

        ChainlinkMockAggregator oracle = new ChainlinkMockAggregator(_decimals, _initialAnswer);
        
        _recordDeployment(
            _name,
            address(oracle),
            OracleType.CHAINLINK_STANDARD,
            "Chainlink Standard Mock",
            _decimals,
            _initialAnswer
        );

        return address(oracle);
    }

    /**
     * @dev Deploy a hybrid mock oracle
     */
    function deployHybridMock(
        string memory _name,
        uint8 _decimals,
        string memory _description,
        int256 _initialAnswer
    ) external onlyOwner returns (address) {
        require(deployedOracles[_name].oracleAddress == address(0), "Oracle name already exists");

        HybridMockOracle oracle = new HybridMockOracle(_decimals, _description, _initialAnswer);
        
        _recordDeployment(
            _name,
            address(oracle),
            OracleType.HYBRID,
            _description,
            _decimals,
            _initialAnswer
        );

        return address(oracle);
    }

    /**
     * @dev Deploy a complete oracle set for testing
     */
    function deployOracleSet() external onlyOwner returns (
        address ethUsdOracle,
        address volatilityOracle,
        address liquidityOracle,
        address defiRateOracle
    ) {
        // Deploy hybrid oracles for comprehensive testing
        ethUsdOracle = deployHybridMock(
            "ETH_USD",
            8,
            "ETH/USD Price Feed",
            300000000000  // $3000
        );

        volatilityOracle = deployHybridMock(
            "VOLATILITY",
            8,
            "Volatility Multiplier",
            10000000000   // 100% (1.0 with 8 decimals)
        );

        liquidityOracle = deployHybridMock(
            "LIQUIDITY",
            8,
            "Liquidity Premium",
            0             // 0% initially
        );

        defiRateOracle = deployHybridMock(
            "DEFI_RATE",
            8,
            "DeFi Average Rate",
            500000000     // 5% (0.05 with 8 decimals)
        );

        return (ethUsdOracle, volatilityOracle, liquidityOracle, defiRateOracle);
    }

    /**
     * @dev Internal function to record deployment
     */
    function _recordDeployment(
        string memory _name,
        address _oracleAddress,
        OracleType _oracleType,
        string memory _description,
        uint8 _decimals,
        int256 _initialAnswer
    ) internal {
        deployedOracles[_name] = DeployedOracle({
            oracleAddress: _oracleAddress,
            oracleType: _oracleType,
            description: _description,
            decimals: _decimals,
            initialAnswer: _initialAnswer,
            deployedAt: block.timestamp
        });

        oracleNames.push(_name);

        emit OracleDeployed(_name, _oracleAddress, _oracleType, _description);
    }

    // ============ Query Functions ============

    /**
     * @dev Get oracle address by name
     */
    function getOracleAddress(string memory _name) external view returns (address) {
        return deployedOracles[_name].oracleAddress;
    }

    /**
     * @dev Get all deployed oracle names
     */
    function getAllOracleNames() external view returns (string[] memory) {
        return oracleNames;
    }

    /**
     * @dev Get oracle details
     */
    function getOracleDetails(string memory _name) external view returns (
        address oracleAddress,
        string memory oracleTypeString,
        string memory description,
        uint8 decimals,
        int256 initialAnswer,
        uint256 deployedAt
    ) {
        DeployedOracle memory oracle = deployedOracles[_name];
        require(oracle.oracleAddress != address(0), "Oracle not found");

        string memory typeString;
        if (oracle.oracleType == OracleType.CUSTOM_ADVANCED) {
            typeString = "CUSTOM_ADVANCED";
        } else if (oracle.oracleType == OracleType.CHAINLINK_STANDARD) {
            typeString = "CHAINLINK_STANDARD";
        } else if (oracle.oracleType == OracleType.HYBRID) {
            typeString = "HYBRID";
        }

        return (
            oracle.oracleAddress,
            typeString,
            oracle.description,
            oracle.decimals,
            oracle.initialAnswer,
            oracle.deployedAt
        );
    }

    /**
     * @dev Get current price from any deployed oracle
     */
    function getOraclePrice(string memory _name) external view returns (int256) {
        address oracleAddress = deployedOracles[_name].oracleAddress;
        require(oracleAddress != address(0), "Oracle not found");

        (, int256 price, , , ) = AggregatorV3Interface(oracleAddress).latestRoundData();
        return price;
    }

    /**
     * @dev Batch get prices from multiple oracles
     */
    function getBatchPrices(string[] memory _names) external view returns (int256[] memory prices) {
        prices = new int256[](_names.length);
        
        for (uint i = 0; i < _names.length; i++) {
            address oracleAddress = deployedOracles[_names[i]].oracleAddress;
            if (oracleAddress != address(0)) {
                (, int256 price, , , ) = AggregatorV3Interface(oracleAddress).latestRoundData();
                prices[i] = price;
            }
        }
    }

    // ============ Batch Operations ============

    /**
     * @dev Update multiple oracle prices at once
     */
    function batchUpdatePrices(
        string[] memory _names,
        int256[] memory _prices
    ) external onlyOwner {
        require(_names.length == _prices.length, "Arrays length mismatch");

        for (uint i = 0; i < _names.length; i++) {
            address oracleAddress = deployedOracles[_names[i]].oracleAddress;
            require(oracleAddress != address(0), "Oracle not found");

            DeployedOracle memory oracle = deployedOracles[_names[i]];
            
            if (oracle.oracleType == OracleType.CUSTOM_ADVANCED) {
                MockAggregatorV3(oracleAddress).updateAnswer(_prices[i]);
            } else if (oracle.oracleType == OracleType.CHAINLINK_STANDARD) {
                ChainlinkMockAggregator(oracleAddress).updateAnswer(_prices[i]);
            } else if (oracle.oracleType == OracleType.HYBRID) {
                HybridMockOracle(oracleAddress).updateAnswer(_prices[i]);
            }
        }
    }
}