/**
 * Oracle Configuration for Hybrid Mock System
 * Centralized configuration for oracle types and settings
 */

export enum OracleType {
  CUSTOM_ADVANCED = 0, // Your sophisticated mock with simulation features
  CHAINLINK_STANDARD = 1, // Simple Chainlink-compatible mock
  HYBRID = 2, // Hybrid that supports both
}

export interface OracleConfig {
  name: string;
  type: OracleType;
  decimals: number;
  description: string;
  initialAnswer: bigint;
  symbol: string;
}

export const DEFAULT_ORACLE_CONFIGS: { [key: string]: OracleConfig } = {
  ETH_USD: {
    name: "ETH_USD",
    type: OracleType.HYBRID,
    decimals: 8,
    description: "ETH/USD Price Feed",
    initialAnswer: 300000000000n, // $3000
    symbol: "ETH/USD",
  },

  BTC_USD: {
    name: "BTC_USD",
    type: OracleType.HYBRID,
    decimals: 8,
    description: "BTC/USD Price Feed",
    initialAnswer: 4500000000000n, // $45000
    symbol: "BTC/USD",
  },

  VOLATILITY: {
    name: "VOLATILITY",
    type: OracleType.CUSTOM_ADVANCED, // Use advanced features for volatility simulation
    decimals: 8,
    description: "Volatility Multiplier",
    initialAnswer: 10000000000n, // 100% (1.0 with 8 decimals)
    symbol: "VOL",
  },

  LIQUIDITY: {
    name: "LIQUIDITY",
    type: OracleType.CHAINLINK_STANDARD, // Simple for liquidity premium
    decimals: 8,
    description: "Liquidity Premium",
    initialAnswer: 0n, // 0% initially
    symbol: "LIQ",
  },

  DEFI_RATE: {
    name: "DEFI_RATE",
    type: OracleType.HYBRID,
    decimals: 8,
    description: "DeFi Average Rate",
    initialAnswer: 500000000n, // 5% (0.05 with 8 decimals)
    symbol: "DEFI",
  },
};

export const NETWORK_CONFIGS = {
  localhost: {
    useOracles: true,
    preferredType: OracleType.HYBRID,
    enableAdvancedFeatures: true,
  },

  hardhat: {
    useOracles: true,
    preferredType: OracleType.CUSTOM_ADVANCED,
    enableAdvancedFeatures: true,
  },

  sepolia: {
    useOracles: true,
    preferredType: OracleType.CHAINLINK_STANDARD,
    enableAdvancedFeatures: false,
  },

  mainnet: {
    useOracles: false, // Use real Chainlink oracles
    preferredType: OracleType.CHAINLINK_STANDARD,
    enableAdvancedFeatures: false,
  },
};

/**
 * Get oracle configuration for a network
 */
export function getOracleConfigForNetwork(networkName: string) {
  return NETWORK_CONFIGS[networkName as keyof typeof NETWORK_CONFIGS] || NETWORK_CONFIGS.localhost;
}

/**
 * Get oracle type string
 */
export function getOracleTypeString(type: OracleType): string {
  switch (type) {
    case OracleType.CUSTOM_ADVANCED:
      return "CUSTOM_ADVANCED";
    case OracleType.CHAINLINK_STANDARD:
      return "CHAINLINK_STANDARD";
    case OracleType.HYBRID:
      return "HYBRID";
    default:
      return "UNKNOWN";
  }
}

/**
 * Market scenario configurations for testing
 */
export const MARKET_SCENARIOS = {
  NORMAL: {
    ethPrice: 300000000000n, // $3000
    volatility: 10000000000n, // 100%
    liquidity: 0n, // 0%
    defiRate: 500000000n, // 5%
  },

  BULL_MARKET: {
    ethPrice: 500000000000n, // $5000
    volatility: 5000000000n, // 50%
    liquidity: 0n, // 0%
    defiRate: 300000000n, // 3%
  },

  BEAR_MARKET: {
    ethPrice: 150000000000n, // $1500
    volatility: 20000000000n, // 200%
    liquidity: 200000000n, // 2%
    defiRate: 1000000000n, // 10%
  },

  CRASH: {
    ethPrice: 80000000000n, // $800
    volatility: 50000000000n, // 500%
    liquidity: 500000000n, // 5%
    defiRate: 2000000000n, // 20%
  },

  RECOVERY: {
    ethPrice: 250000000000n, // $2500
    volatility: 15000000000n, // 150%
    liquidity: 100000000n, // 1%
    defiRate: 700000000n, // 7%
  },
};

/**
 * Helper function to format oracle value for display
 */
export function formatOracleValue(value: bigint, decimals: number, symbol: string): string {
  const formatted = Number(value) / Math.pow(10, decimals);

  if (symbol.includes("USD")) {
    return `$${formatted.toLocaleString()}`;
  } else if (symbol === "VOL") {
    return `${formatted}x`;
  } else if (symbol === "LIQ" || symbol === "DEFI") {
    return `${formatted}%`;
  }

  return formatted.toString();
}

export default {
  OracleType,
  DEFAULT_ORACLE_CONFIGS,
  NETWORK_CONFIGS,
  MARKET_SCENARIOS,
  getOracleConfigForNetwork,
  getOracleTypeString,
  formatOracleValue,
};
