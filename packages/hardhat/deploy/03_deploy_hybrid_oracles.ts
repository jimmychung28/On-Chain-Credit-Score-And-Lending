import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

/**
 * Deploy hybrid oracle system that supports both custom and Chainlink-style mocks
 */
const deployHybridOracles: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 Deploying Hybrid Oracle System...");

  // Only deploy on local networks
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("⏭️  Skipping mock oracle deployment on non-local network");
    return;
  }

  // Deploy the factory first
  const factoryDeployment = await deploy("MockOracleFactory", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("📋 MockOracleFactory deployed to:", factoryDeployment.address);

  // Get the factory contract
  const factory = await ethers.getContractAt("MockOracleFactory", factoryDeployment.address);

  // Deploy oracle set using the factory
  console.log("\n🏭 Deploying complete oracle set...");

  const tx = await factory.deployOracleSet();
  const receipt = await tx.wait();

  // Get the deployed oracle addresses from events
  const deployedEvent = receipt.logs.find(
    (log: any) => log.topics[0] === ethers.id("OracleDeployed(string,address,uint8,string)"),
  );

  if (deployedEvent) {
    console.log("✅ Oracle set deployed successfully");
  }

  // Get individual oracle addresses
  const ethUsdAddress = await factory.getOracleAddress("ETH_USD");
  const volatilityAddress = await factory.getOracleAddress("VOLATILITY");
  const liquidityAddress = await factory.getOracleAddress("LIQUIDITY");
  const defiRateAddress = await factory.getOracleAddress("DEFI_RATE");

  console.log("\n📊 Deployed Oracle Addresses:");
  console.log(`  📈 ETH/USD Oracle: ${ethUsdAddress}`);
  console.log(`  📉 Volatility Oracle: ${volatilityAddress}`);
  console.log(`  💧 Liquidity Oracle: ${liquidityAddress}`);
  console.log(`  🏦 DeFi Rate Oracle: ${defiRateAddress}`);

  // Test the oracles
  console.log("\n🧪 Testing Oracle Functionality...");

  try {
    // Test batch price retrieval
    const prices = await factory.getBatchPrices(["ETH_USD", "VOLATILITY", "LIQUIDITY", "DEFI_RATE"]);
    console.log("📊 Current Prices:");
    console.log(`  ETH/USD: $${ethers.formatUnits(prices[0], 8)}`);
    console.log(`  Volatility: ${ethers.formatUnits(prices[1], 8)}x`);
    console.log(`  Liquidity Premium: ${ethers.formatUnits(prices[2], 8)}%`);
    console.log(`  DeFi Average Rate: ${ethers.formatUnits(prices[3], 8)}%`);

    // Test hybrid oracle functionality
    const ethOracle = await ethers.getContractAt("HybridMockOracle", ethUsdAddress);
    console.log(`\n🔄 ETH Oracle Mock Type: ${await ethOracle.getCurrentMockTypeString()}`);
    console.log(`🏥 Custom Mock Healthy: ${await ethOracle.isCustomMockHealthy()}`);

    // Test switching mock types
    console.log("\n🔀 Testing Mock Type Switching...");

    // Switch to Chainlink standard mode
    await ethOracle.setMockType(1); // CHAINLINK_STANDARD
    console.log(`📋 Switched to: ${await ethOracle.getCurrentMockTypeString()}`);

    // Switch back to custom advanced mode
    await ethOracle.setMockType(0); // CUSTOM_ADVANCED
    console.log(`🎛️  Switched back to: ${await ethOracle.getCurrentMockTypeString()}`);

    // Test advanced features (price simulation)
    console.log("\n🎭 Testing Advanced Features...");
    await ethOracle.simulatePriceMovement(1000, 5); // 10% max change, 5 steps

    const newPrice = await factory.getOraclePrice("ETH_USD");
    console.log(`🎲 Simulated new ETH price: $${ethers.formatUnits(newPrice, 8)}`);
  } catch (error) {
    console.error("❌ Error testing oracles:", error);
  }

  // Save deployment info
  const deploymentInfo = {
    factoryAddress: factoryDeployment.address,
    oracles: {
      ethUsd: ethUsdAddress,
      volatility: volatilityAddress,
      liquidity: liquidityAddress,
      defiRate: defiRateAddress,
    },
    network: hre.network.name,
    deployer: deployer,
    blockNumber: receipt.blockNumber,
  };

  console.log("\n💾 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Store for other scripts to use
  await hre.deployments.save("HybridOracleSystem", {
    address: factoryDeployment.address,
    abi: factoryDeployment.abi,
    metadata: JSON.stringify(deploymentInfo),
  });

  console.log("\n✅ Hybrid Oracle System deployment completed!");
};

export default deployHybridOracles;

deployHybridOracles.tags = ["HybridOracles", "Mocks"];
deployHybridOracles.dependencies = ["CreditScoring"]; // Run after credit scoring
