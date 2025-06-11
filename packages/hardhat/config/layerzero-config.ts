/**
 * LayerZero Configuration for Multi-Chain Credit Aggregation
 * Contains chain IDs, endpoint addresses, and gas configurations
 */

export interface LayerZeroConfig {
  chainId: number;
  lzChainId: number;
  name: string;
  endpoint: string;
  gasLimit: number;
  weight: number; // Credit score weight in basis points (10000 = 100%)
  isActive: boolean;
}

/**
 * LayerZero Chain IDs (different from EVM chain IDs)
 */
export const LZ_CHAIN_IDS = {
  ETHEREUM: 101,
  BSC: 102,
  AVALANCHE: 106,
  POLYGON: 109,
  ARBITRUM: 110,
  OPTIMISM: 111,
  FANTOM: 112,
  BASE: 184,
  LINEA: 183,
  MANTLE: 181,
  METIS: 151,
} as const;

/**
 * LayerZero Endpoint Addresses by Network
 */
export const LZ_ENDPOINTS = {
  // Mainnets
  ethereum: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
  bsc: "0x3c2269811836af69497E5F486A85D7316753cf62",
  avalanche: "0x3c2269811836af69497E5F486A85D7316753cf62",
  polygon: "0x3c2269811836af69497E5F486A85D7316753cf62",
  arbitrum: "0x3c2269811836af69497E5F486A85D7316753cf62",
  optimism: "0x3c2269811836af69497E5F486A85D7316753cf62",
  fantom: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
  base: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",

  // Testnets
  sepolia: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
  mumbai: "0xf69186dfBa60DdB133E91E9A4B5673624293d8F8",
  arbitrumSepolia: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab",
  optimismSepolia: "0x55370E0fBB5f5b8dAeD978BA1c075a499eB107B8",
  baseSepolia: "0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab",

  // Local development
  localhost: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675", // Use Ethereum endpoint for testing
  hardhat: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675", // Use Ethereum endpoint for testing
} as const;

/**
 * Complete LayerZero Chain Configuration
 */
export const LAYERZERO_CHAINS: { [key: string]: LayerZeroConfig } = {
  // MAINNET CONFIGURATIONS
  ethereum: {
    chainId: 1,
    lzChainId: LZ_CHAIN_IDS.ETHEREUM,
    name: "Ethereum",
    endpoint: LZ_ENDPOINTS.ethereum,
    gasLimit: 500000,
    weight: 4000, // 40%
    isActive: true,
  },

  arbitrum: {
    chainId: 42161,
    lzChainId: LZ_CHAIN_IDS.ARBITRUM,
    name: "Arbitrum One",
    endpoint: LZ_ENDPOINTS.arbitrum,
    gasLimit: 300000,
    weight: 2500, // 25%
    isActive: true,
  },

  polygon: {
    chainId: 137,
    lzChainId: LZ_CHAIN_IDS.POLYGON,
    name: "Polygon",
    endpoint: LZ_ENDPOINTS.polygon,
    gasLimit: 300000,
    weight: 2000, // 20%
    isActive: true,
  },

  optimism: {
    chainId: 10,
    lzChainId: LZ_CHAIN_IDS.OPTIMISM,
    name: "Optimism",
    endpoint: LZ_ENDPOINTS.optimism,
    gasLimit: 300000,
    weight: 1000, // 10%
    isActive: true,
  },

  base: {
    chainId: 8453,
    lzChainId: LZ_CHAIN_IDS.BASE,
    name: "Base",
    endpoint: LZ_ENDPOINTS.base,
    gasLimit: 300000,
    weight: 500, // 5%
    isActive: true,
  },

  // TESTNET CONFIGURATIONS
  sepolia: {
    chainId: 11155111,
    lzChainId: 10161, // Sepolia LZ Chain ID
    name: "Sepolia",
    endpoint: LZ_ENDPOINTS.sepolia,
    gasLimit: 500000,
    weight: 4000, // 40% for testing
    isActive: true,
  },

  mumbai: {
    chainId: 80001,
    lzChainId: 10109, // Mumbai LZ Chain ID
    name: "Mumbai",
    endpoint: LZ_ENDPOINTS.mumbai,
    gasLimit: 300000,
    weight: 2000, // 20% for testing
    isActive: true,
  },

  arbitrumSepolia: {
    chainId: 421614,
    lzChainId: 10231, // Arbitrum Sepolia LZ Chain ID
    name: "Arbitrum Sepolia",
    endpoint: LZ_ENDPOINTS.arbitrumSepolia,
    gasLimit: 300000,
    weight: 2500, // 25% for testing
    isActive: true,
  },

  optimismSepolia: {
    chainId: 11155420,
    lzChainId: 10232, // Optimism Sepolia LZ Chain ID
    name: "Optimism Sepolia",
    endpoint: LZ_ENDPOINTS.optimismSepolia,
    gasLimit: 300000,
    weight: 1000, // 10% for testing
    isActive: true,
  },

  baseSepolia: {
    chainId: 84532,
    lzChainId: 10245, // Base Sepolia LZ Chain ID
    name: "Base Sepolia",
    endpoint: LZ_ENDPOINTS.baseSepolia,
    gasLimit: 300000,
    weight: 500, // 5% for testing
    isActive: true,
  },

  // LOCAL DEVELOPMENT
  localhost: {
    chainId: 31337,
    lzChainId: 31337, // Custom for local testing
    name: "Localhost",
    endpoint: LZ_ENDPOINTS.localhost,
    gasLimit: 500000,
    weight: 10000, // 100% for single chain testing
    isActive: true,
  },

  hardhat: {
    chainId: 31337,
    lzChainId: 31337, // Custom for local testing
    name: "Hardhat",
    endpoint: LZ_ENDPOINTS.hardhat,
    gasLimit: 500000,
    weight: 10000, // 100% for single chain testing
    isActive: true,
  },
};

/**
 * Gas Configuration for Different Message Types
 */
export const LZ_GAS_CONFIGS = {
  SCORE_REQUEST: {
    gasLimit: 200000,
    gasPrice: 20000000000, // 20 gwei
  },
  SCORE_RESPONSE: {
    gasLimit: 150000,
    gasPrice: 20000000000, // 20 gwei
  },
  SCORE_UPDATE: {
    gasLimit: 100000,
    gasPrice: 20000000000, // 20 gwei
  },
  BATCH_REQUEST: {
    gasLimit: 400000,
    gasPrice: 20000000000, // 20 gwei
  },
  HEALTH_CHECK: {
    gasLimit: 80000,
    gasPrice: 20000000000, // 20 gwei
  },
} as const;

/**
 * Adapter Parameters for LayerZero
 */
export const LZ_ADAPTER_PARAMS = {
  // Type 1: Basic adapter params with gas amount
  TYPE_1: (gasAmount: number) => {
    return ethers.utils.solidityPack(["uint16", "uint256"], [1, gasAmount]);
  },

  // Type 2: Adapter params with gas amount and native drop amount
  TYPE_2: (gasAmount: number, nativeDropAmount: number, nativeDropAddress: string) => {
    return ethers.utils.solidityPack(
      ["uint16", "uint256", "uint256", "address"],
      [2, gasAmount, nativeDropAmount, nativeDropAddress],
    );
  },
} as const;

/**
 * Cross-Chain Bonus Configuration
 */
export const CROSS_CHAIN_BONUS_CONFIG = {
  diversificationBonus: {
    twoChains: 25, // +25 points for 2 chains
    threeChains: 40, // +40 points for 3 chains
    fourChains: 50, // +50 points for 4+ chains
    fiveOrMore: 65, // +65 points for 5+ chains
  },
  consistencyBonus: {
    veryConsistent: 30, // Score variance < 50 points
    consistent: 20, // Score variance < 100 points
    moderate: 10, // Score variance < 150 points
  },
  volumeBonus: {
    high: 25, // Top 10% volume across chains
    medium: 15, // Top 25% volume across chains
    low: 5, // Top 50% volume across chains
  },
  sophisticationBonus: {
    advanced: 20, // Uses advanced DeFi on multiple chains
    intermediate: 10, // Uses basic DeFi on multiple chains
    basic: 5, // Simple transfers across chains
  },
} as const;

/**
 * Network-specific fee configurations
 */
export const NETWORK_FEE_CONFIGS = {
  ethereum: {
    baseFee: "0.01", // ETH
    priorityFeeMultiplier: 1.5,
  },
  arbitrum: {
    baseFee: "0.001", // ETH
    priorityFeeMultiplier: 1.2,
  },
  polygon: {
    baseFee: "20", // MATIC
    priorityFeeMultiplier: 1.3,
  },
  optimism: {
    baseFee: "0.001", // ETH
    priorityFeeMultiplier: 1.2,
  },
  base: {
    baseFee: "0.001", // ETH
    priorityFeeMultiplier: 1.2,
  },
} as const;

/**
 * Security configurations
 */
export const SECURITY_CONFIG = {
  maxMessageSize: 10000, // bytes
  messageTimeout: 86400, // 24 hours in seconds
  maxRetries: 3,
  requiredConfirmations: {
    ethereum: 12,
    arbitrum: 1,
    polygon: 128,
    optimism: 1,
    base: 1,
  },
} as const;

/**
 * Utility functions
 */
export function getLayerZeroConfig(networkName: string): LayerZeroConfig | undefined {
  return LAYERZERO_CHAINS[networkName];
}

export function getEndpointAddress(networkName: string): string | undefined {
  return LZ_ENDPOINTS[networkName as keyof typeof LZ_ENDPOINTS];
}

export function getLzChainId(networkName: string): number | undefined {
  const config = getLayerZeroConfig(networkName);
  return config?.lzChainId;
}

export function getActiveChains(): LayerZeroConfig[] {
  return Object.values(LAYERZERO_CHAINS).filter(chain => chain.isActive);
}

export function getMainnetChains(): LayerZeroConfig[] {
  return Object.values(LAYERZERO_CHAINS).filter(
    chain =>
      chain.isActive &&
      !chain.name.toLowerCase().includes("sepolia") &&
      !chain.name.toLowerCase().includes("mumbai") &&
      !chain.name.toLowerCase().includes("localhost") &&
      !chain.name.toLowerCase().includes("hardhat"),
  );
}

export function getTestnetChains(): LayerZeroConfig[] {
  return Object.values(LAYERZERO_CHAINS).filter(
    chain =>
      chain.isActive && (chain.name.toLowerCase().includes("sepolia") || chain.name.toLowerCase().includes("mumbai")),
  );
}

export function calculateEstimatedFee(
  srcNetwork: string,
  dstNetwork: string,
  messageType: keyof typeof LZ_GAS_CONFIGS,
): string {
  const srcConfig = getLayerZeroConfig(srcNetwork);
  const dstConfig = getLayerZeroConfig(dstNetwork);
  const gasConfig = LZ_GAS_CONFIGS[messageType];

  if (!srcConfig || !dstConfig) {
    throw new Error(`Invalid network configuration for ${srcNetwork} -> ${dstNetwork}`);
  }

  // Simple fee estimation (in practice, use LayerZero's estimateFees function)
  const baseFee = NETWORK_FEE_CONFIGS[srcNetwork as keyof typeof NETWORK_FEE_CONFIGS]?.baseFee || "0.001";
  const gasMultiplier = gasConfig.gasLimit / 100000; // Rough multiplier

  return (parseFloat(baseFee) * gasMultiplier).toString();
}

/**
 * Default export with all configurations
 */
export default {
  LZ_CHAIN_IDS,
  LZ_ENDPOINTS,
  LAYERZERO_CHAINS,
  LZ_GAS_CONFIGS,
  LZ_ADAPTER_PARAMS,
  CROSS_CHAIN_BONUS_CONFIG,
  NETWORK_FEE_CONFIGS,
  SECURITY_CONFIG,
  getLayerZeroConfig,
  getEndpointAddress,
  getLzChainId,
  getActiveChains,
  getMainnetChains,
  getTestnetChains,
  calculateEstimatedFee,
};
