import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployOracleRateModel: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 Deploying Oracle-Enhanced Dynamic Rate Model...");

  // Deploy the oracle-enhanced rate model
  await deploy("DynamicTargetRateModelWithOracles", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to interact with it
  const rateModelContract = await hre.ethers.getContract<Contract>("DynamicTargetRateModelWithOracles", deployer);
  console.log("✅ Oracle-Enhanced Rate Model deployed to:", await rateModelContract.getAddress());

  // Initialize with mock oracles on local networks
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n🔗 Initializing with Mock Oracles...");

    // Get mock oracle addresses
    const ethUsdFeed = await hre.deployments.get("MockETHUSDFeed");
    const volatilityFeed = await hre.deployments.get("MockVolatilityFeed");
    const liquidityFeed = await hre.deployments.get("MockLiquidityFeed");
    const defiRateFeed = await hre.deployments.get("MockDeFiRateFeed");

    // Initialize oracles
    const initTx = await rateModelContract.initializeOracles(
      ethUsdFeed.address,
      volatilityFeed.address,
      liquidityFeed.address,
      defiRateFeed.address,
    );
    await initTx.wait();

    console.log("✅ Oracles initialized successfully!");
    console.log("📊 Oracle Feed Addresses:");
    console.log("  ETH/USD:", ethUsdFeed.address);
    console.log("  Volatility:", volatilityFeed.address);
    console.log("  Liquidity:", liquidityFeed.address);
    console.log("  DeFi Rate:", defiRateFeed.address);

    // Enable auto-update for testing
    const autoUpdateTx = await rateModelContract.setAutoUpdateEnabled(true);
    await autoUpdateTx.wait();
    console.log("✅ Auto-update enabled for testing");

    // Get oracle data to verify
    const oracleData = await rateModelContract.getOracleData();
    console.log("\n📈 Current Oracle Data:");
    console.log("  ETH Price: $" + (Number(oracleData[0]) / 1e8).toFixed(2));
    console.log("  Volatility: " + (Number(oracleData[2]) / 100).toFixed(2) + "%");
    console.log("  Liquidity Premium: " + (Number(oracleData[4]) / 100).toFixed(2) + "%");
    console.log("  DeFi Rate: " + (Number(oracleData[6]) / 100).toFixed(2) + "%");
    console.log("  Oracles Active:", oracleData[8]);
  }

  // Log initial model parameters
  const modelParams = await rateModelContract.getModelParameters();
  console.log("\n📊 Rate Model Parameters:");
  console.log("  Base Rate:", (Number(modelParams.baseRate) / 100).toFixed(2) + "%");
  console.log("  Target Utilization:", (Number(modelParams.targetUtilization) / 100).toFixed(2) + "%");
  console.log("  Slope 1:", (Number(modelParams.slope1) / 100).toFixed(2) + "%");
  console.log("  Slope 2:", (Number(modelParams.slope2) / 100).toFixed(2) + "%");

  // Log market conditions
  const marketConditions = await rateModelContract.getMarketConditions();
  console.log("\n🌍 Market Conditions:");
  console.log("  Volatility Multiplier:", (Number(marketConditions.volatilityMultiplier) / 100).toFixed(2) + "x");
  console.log("  Liquidity Premium:", (Number(marketConditions.liquidityPremium) / 100).toFixed(2) + "%");
  console.log("  Risk Premium:", (Number(marketConditions.riskPremium) / 100).toFixed(2) + "%");

  // Show example rates with oracle data
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n💡 Example Oracle-Enhanced Rates:");
    console.log("=".repeat(70));
    console.log("Credit Score | 50% Util | 80% Util | 95% Util");
    console.log("=".repeat(70));

    const utilizationLevels = [5000, 8000, 9500]; // 50%, 80%, 95%
    const creditScores = [750, 650, 500, 400];

    for (const score of creditScores) {
      let row = `${score.toString().padEnd(11)} |`;
      for (const util of utilizationLevels) {
        try {
          const rate = await rateModelContract.calculateInterestRate(
            score,
            util,
            hre.ethers.parseEther("1"),
            30 * 24 * 60 * 60,
          );
          const ratePercent = (Number(rate) / 100).toFixed(2);
          row += ` ${ratePercent.padStart(6)}% |`;
        } catch {
          row += ` N/A    |`;
        }
      }
      console.log(row);
    }
    console.log("=".repeat(70));
  }

  console.log("\n🎯 Oracle-Enhanced Rate Model Features:");
  console.log("✅ Real-time oracle data integration");
  console.log("✅ Automatic volatility calculation");
  console.log("✅ DeFi rate comparison");
  console.log("✅ Liquidity premium adjustments");
  console.log("✅ Emergency oracle disable");
  console.log("✅ Fallback to manual mode");

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n🧪 Testing Commands:");
    console.log("  yarn hardhat run scripts/test-oracle-integration.ts --network localhost");
    console.log("  yarn hardhat run scripts/simulate-market-scenarios.ts --network localhost");
  }
};

export default deployOracleRateModel;
deployOracleRateModel.tags = ["OracleRateModel"];
deployOracleRateModel.dependencies = ["MockOracles"]; // Deploy after mock oracles
