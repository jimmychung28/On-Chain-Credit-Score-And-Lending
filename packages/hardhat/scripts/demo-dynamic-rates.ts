import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Dynamic Target Rate Model Demo");
  console.log("=".repeat(50));

  // Get contract instances
  const dynamicRateModel = (await ethers.getContract("DynamicTargetRateModel")) as any;
  const creditLending = (await ethers.getContract("CreditLending")) as any;

  console.log("\n📊 Current Rate Model Parameters:");
  const modelParams = await dynamicRateModel.getModelParameters();
  console.log("Base Rate:", (Number(modelParams.baseRate) / 100).toFixed(2), "%");
  console.log("Target Utilization:", (Number(modelParams.targetUtilization) / 100).toFixed(2), "%");
  console.log("Slope 1:", (Number(modelParams.slope1) / 100).toFixed(2), "%");
  console.log("Slope 2:", (Number(modelParams.slope2) / 100).toFixed(2), "%");
  console.log("Max Rate:", (Number(modelParams.maxRate) / 100).toFixed(2), "%");

  console.log("\n🌍 Current Market Conditions:");
  const marketConditions = await dynamicRateModel.getMarketConditions();
  console.log("Volatility Multiplier:", (Number(marketConditions.volatilityMultiplier) / 100).toFixed(2), "x");
  console.log("Liquidity Premium:", (Number(marketConditions.liquidityPremium) / 100).toFixed(2), "%");
  console.log("Risk Premium:", (Number(marketConditions.riskPremium) / 100).toFixed(2), "%");

  // Get current pool info
  const poolInfo = await creditLending.getPoolInfo();
  const currentUtilization = await creditLending.getCurrentUtilization();

  console.log("\n💰 Current Pool Status:");
  console.log("Total Funds:", ethers.formatEther(poolInfo.totalFunds), "ETH");
  console.log("Available Funds:", ethers.formatEther(poolInfo.availableFunds), "ETH");
  console.log("Total Loaned:", ethers.formatEther(poolInfo.totalLoaned), "ETH");
  console.log("Current Utilization:", (Number(currentUtilization) / 100).toFixed(2), "%");

  // Demo: Show how rates change with different utilization levels
  console.log("\n📈 Rate Sensitivity Analysis:");
  console.log("=".repeat(80));
  console.log("Credit Score | 20% Util | 50% Util | 80% Util | 90% Util | 95% Util");
  console.log("=".repeat(80));

  const utilizationLevels = [2000, 5000, 8000, 9000, 9500]; // 20%, 50%, 80%, 90%, 95%
  const creditScores = [800, 750, 700, 650, 600, 550, 500, 450, 400, 350];

  for (const score of creditScores) {
    let row = `${score.toString().padEnd(11)} |`;
    for (const util of utilizationLevels) {
      try {
        const rate = await dynamicRateModel.calculateInterestRate(
          score,
          util,
          ethers.parseEther("1"),
          30 * 24 * 60 * 60, // 30 days
        );
        const ratePercent = (Number(rate) / 100).toFixed(1);
        row += ` ${ratePercent.padStart(6)}% |`;
      } catch {
        row += ` N/A    |`;
      }
    }
    console.log(row);
  }
  console.log("=".repeat(80));

  // Demo: Show rate components breakdown for a specific scenario
  console.log("\n🔍 Rate Components Breakdown (Credit Score: 650, Utilization: 80%):");
  try {
    const components = await dynamicRateModel.getCurrentRateComponents(650, 8000);
    console.log("Base Utilization Rate:", (Number(components[0]) / 100).toFixed(2), "%");
    console.log("Credit Adjusted Rate:", (Number(components[1]) / 100).toFixed(2), "%");
    console.log("Market Adjusted Rate:", (Number(components[2]) / 100).toFixed(2), "%");
    console.log("Final Rate:", (Number(components[3]) / 100).toFixed(2), "%");
  } catch (error) {
    console.log("Error getting rate components:", error);
  }

  // Demo: Show credit risk tiers
  console.log("\n🎯 Credit Risk Tiers:");
  console.log("=".repeat(60));
  console.log("Score Range | Risk Multiplier | Base Premium");
  console.log("=".repeat(60));

  const sampleScores = [800, 725, 675, 625, 550, 475, 425, 350];
  for (const score of sampleScores) {
    try {
      const tier = await dynamicRateModel.getCreditRiskTier(score);
      const multiplier = (Number(tier.riskMultiplier) / 100).toFixed(2);
      const premium = (Number(tier.basePremium) / 100).toFixed(2);
      console.log(`${tier.minScore}-${tier.maxScore}      | ${multiplier}x           | ${premium}%`);
    } catch {
      console.log(`${score}         | N/A           | N/A`);
    }
  }
  console.log("=".repeat(60));

  // Demo: Simulate market condition changes
  console.log("\n🌪️  Market Condition Simulation:");
  console.log("Simulating high volatility scenario...");

  // Update market conditions to simulate high volatility
  const [owner] = await ethers.getSigners();
  await dynamicRateModel.connect(owner).updateMarketConditions(
    200, // 2x volatility multiplier
    100, // 1% liquidity premium
    150, // 1.5% risk premium
  );

  console.log("Updated market conditions - showing new rates:");
  const highVolRate = await dynamicRateModel.calculateInterestRate(
    650,
    8000,
    ethers.parseEther("1"),
    30 * 24 * 60 * 60,
  );
  console.log("New rate for 650 credit score at 80% utilization:", (Number(highVolRate) / 100).toFixed(2), "%");

  // Reset market conditions
  await dynamicRateModel.connect(owner).updateMarketConditions(
    100, // Normal volatility
    0, // No liquidity premium
    50, // 0.5% risk premium
  );
  console.log("Market conditions reset to normal");

  // Demo: Performance tracking
  const perfStats = await dynamicRateModel.getPerformanceStats();
  console.log("\n📊 Performance Statistics:");
  console.log("Total Loans Originated:", perfStats.totalOriginated.toString());
  console.log("Total Defaults:", perfStats.totalDefaulted.toString());
  console.log("Default Rate:", (Number(perfStats.defaultRate) / 100).toFixed(2), "%");

  console.log("\n✨ Dynamic Target Rate Model Features Demonstrated:");
  console.log("✅ Utilization-based rate curves");
  console.log("✅ Credit score risk adjustments");
  console.log("✅ Market condition sensitivity");
  console.log("✅ Loan-specific parameters");
  console.log("✅ Performance tracking");
  console.log("✅ Real-time rate calculations");

  console.log("\n🚀 The Dynamic Target Rate Model is now active!");
  console.log("Interest rates will automatically adjust based on:");
  console.log("• Pool utilization levels");
  console.log("• Individual credit scores");
  console.log("• Market volatility");
  console.log("• Historical performance");
  console.log("• Loan size and duration");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
