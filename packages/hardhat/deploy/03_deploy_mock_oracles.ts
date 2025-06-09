import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployMockOracles: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Only deploy mocks on local networks
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("⏭️  Skipping mock oracle deployment on", hre.network.name);
    return;
  }

  console.log("\n🧪 Deploying Mock Oracles for testing...");

  // Deploy ETH/USD mock feed ($3000 initial price)
  const ethUsdFeed = await deploy("MockETHUSDFeed", {
    contract: "MockAggregatorV3",
    from: deployer,
    args: [8, "ETH/USD", 300000000000], // 8 decimals, $3000.00000000
    log: true,
    autoMine: true,
  });

  // Deploy Volatility mock feed (100% = normal volatility)
  const volatilityFeed = await deploy("MockVolatilityFeed", {
    contract: "MockAggregatorV3",
    from: deployer,
    args: [2, "ETH Volatility Multiplier", 10000], // 2 decimals, 100.00%
    log: true,
    autoMine: true,
  });

  // Deploy Liquidity Premium mock feed (0% initial premium)
  const liquidityFeed = await deploy("MockLiquidityFeed", {
    contract: "MockAggregatorV3",
    from: deployer,
    args: [2, "Liquidity Premium", 0], // 2 decimals, 0.00%
    log: true,
    autoMine: true,
  });

  // Deploy DeFi Rate mock feed (5% average DeFi rate)
  const defiRateFeed = await deploy("MockDeFiRateFeed", {
    contract: "MockAggregatorV3",
    from: deployer,
    args: [2, "DeFi Average Rate", 500], // 2 decimals, 5.00%
    log: true,
    autoMine: true,
  });

  console.log("✅ Mock Oracles deployed successfully!");
  console.log("\n📊 Initial Oracle Values:");
  console.log("  ETH/USD: $3,000.00");
  console.log("  Volatility Multiplier: 100% (Normal)");
  console.log("  Liquidity Premium: 0.00%");
  console.log("  DeFi Average Rate: 5.00%");

  console.log("\n📝 Oracle Contract Addresses:");
  console.log("  ETH/USD Feed:", ethUsdFeed.address);
  console.log("  Volatility Feed:", volatilityFeed.address);
  console.log("  Liquidity Feed:", liquidityFeed.address);
  console.log("  DeFi Rate Feed:", defiRateFeed.address);

  console.log("\n💡 Usage Tips:");
  console.log("  • Use these addresses to initialize the oracle-enhanced rate model");
  console.log("  • Update oracle values using the updateAnswer() function");
  console.log("  • Test different market scenarios by changing the oracle data");
  console.log("  • Oracle data will automatically affect interest rate calculations");
};

export default deployMockOracles;
deployMockOracles.tags = ["MockOracles"];
deployMockOracles.dependencies = []; // Run before rate model if needed
