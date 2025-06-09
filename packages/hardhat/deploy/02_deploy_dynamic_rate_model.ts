import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployDynamicTargetRateModel: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 Deploying Dynamic Target Rate Model...");

  await deploy("DynamicTargetRateModel", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying
  const dynamicTargetRateModel = await hre.ethers.getContract<Contract>("DynamicTargetRateModel", deployer);
  console.log("✅ DynamicTargetRateModel deployed to:", await dynamicTargetRateModel.getAddress());

  // Log initial model parameters
  const modelParams = await dynamicTargetRateModel.getModelParameters();
  console.log("\n📊 Initial Rate Model Parameters:");
  console.log(
    "Base Rate:",
    modelParams.baseRate.toString(),
    "bp (",
    (Number(modelParams.baseRate) / 100).toFixed(2),
    "%)",
  );
  console.log(
    "Target Utilization:",
    modelParams.targetUtilization.toString(),
    "bp (",
    (Number(modelParams.targetUtilization) / 100).toFixed(2),
    "%)",
  );
  console.log("Slope 1:", modelParams.slope1.toString(), "bp (", (Number(modelParams.slope1) / 100).toFixed(2), "%)");
  console.log("Slope 2:", modelParams.slope2.toString(), "bp (", (Number(modelParams.slope2) / 100).toFixed(2), "%)");
  console.log(
    "Max Rate:",
    modelParams.maxRate.toString(),
    "bp (",
    (Number(modelParams.maxRate) / 100).toFixed(2),
    "%)",
  );

  // Log market conditions
  const marketConditions = await dynamicTargetRateModel.getMarketConditions();
  console.log("\n🌍 Initial Market Conditions:");
  console.log(
    "Volatility Multiplier:",
    marketConditions.volatilityMultiplier.toString(),
    "(",
    (Number(marketConditions.volatilityMultiplier) / 100).toFixed(2),
    "x)",
  );
  console.log(
    "Liquidity Premium:",
    marketConditions.liquidityPremium.toString(),
    "bp (",
    (Number(marketConditions.liquidityPremium) / 100).toFixed(2),
    "%)",
  );
  console.log(
    "Risk Premium:",
    marketConditions.riskPremium.toString(),
    "bp (",
    (Number(marketConditions.riskPremium) / 100).toFixed(2),
    "%)",
  );

  // Show example rates for different credit scores and utilization levels
  console.log("\n💡 Example Interest Rates:");
  console.log("=".repeat(60));
  console.log("Credit Score | 50% Util | 80% Util | 95% Util");
  console.log("=".repeat(60));

  const utilizationLevels = [5000, 8000, 9500]; // 50%, 80%, 95%
  const creditScores = [750, 700, 650, 600, 500, 400];

  for (const score of creditScores) {
    let row = `${score.toString().padEnd(11)} |`;
    for (const util of utilizationLevels) {
      try {
        const rate = await dynamicTargetRateModel.calculateInterestRate(
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
  console.log("=".repeat(60));

  console.log("\n🎯 Dynamic Target Rate Model Features:");
  console.log("✅ Utilization-based rate adjustments");
  console.log("✅ Credit score risk tiers");
  console.log("✅ Market condition factors");
  console.log("✅ Loan-specific adjustments");
  console.log("✅ Performance-based optimization");
  console.log("✅ Admin parameter controls");
};

export default deployDynamicTargetRateModel;
deployDynamicTargetRateModel.tags = ["DynamicTargetRateModel"];
