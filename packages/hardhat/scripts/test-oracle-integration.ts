import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Oracle Integration with OnChain Credit");
  console.log("=".repeat(60));

  await ethers.getSigners();

  try {
    // Get contract instances
    const oracleRateModel = (await ethers.getContract("DynamicTargetRateModelWithOracles")) as any;
    const ethUsdFeed = (await ethers.getContract("MockETHUSDFeed")) as any;
    const volatilityFeed = (await ethers.getContract("MockVolatilityFeed")) as any;
    const liquidityFeed = (await ethers.getContract("MockLiquidityFeed")) as any;
    const defiRateFeed = (await ethers.getContract("MockDeFiRateFeed")) as any;

    console.log("\n📊 Current Oracle Status:");
    const oracleData = await oracleRateModel.getOracleData();
    console.log("  ETH Price: $" + (Number(oracleData[0]) / 1e8).toFixed(2));
    console.log("  Volatility: " + (Number(oracleData[2]) / 100).toFixed(2) + "%");
    console.log("  Liquidity Premium: " + (Number(oracleData[4]) / 100).toFixed(2) + "%");
    console.log("  DeFi Rate: " + (Number(oracleData[6]) / 100).toFixed(2) + "%");
    console.log("  Oracles Active:", oracleData[8]);

    // Test different market scenarios
    const scenarios = [
      {
        name: "🐂 Bull Market Scenario",
        ethPrice: 500000000000, // $5000
        volatility: 8000, // 80% (low volatility)
        liquidity: 0, // 0% premium
        defiRate: 300, // 3% low rates
      },
      {
        name: "🐻 Bear Market Scenario",
        ethPrice: 150000000000, // $1500
        volatility: 20000, // 200% (high volatility)
        liquidity: 300, // 3% premium
        defiRate: 800, // 8% high rates
      },
      {
        name: "⚡ High Volatility Scenario",
        ethPrice: 300000000000, // $3000
        volatility: 25000, // 250% (very high volatility)
        liquidity: 500, // 5% premium
        defiRate: 1200, // 12% very high rates
      },
      {
        name: "😌 Stable Market Scenario",
        ethPrice: 350000000000, // $3500
        volatility: 6000, // 60% (low volatility)
        liquidity: 50, // 0.5% premium
        defiRate: 400, // 4% normal rates
      },
      {
        name: "💥 Market Crash Scenario",
        ethPrice: 80000000000, // $800
        volatility: 30000, // 300% (extreme volatility)
        liquidity: 1000, // 10% premium
        defiRate: 1500, // 15% crisis rates
      },
    ];

    for (const scenario of scenarios) {
      console.log(`\n${scenario.name}`);
      console.log("=".repeat(scenario.name.length));

      // Update mock oracle data
      await ethUsdFeed.updateAnswer(scenario.ethPrice);
      await volatilityFeed.updateAnswer(scenario.volatility);
      await liquidityFeed.updateAnswer(scenario.liquidity);
      await defiRateFeed.updateAnswer(scenario.defiRate);

      // Update price history for volatility calculation
      await oracleRateModel.updatePriceHistory();

      console.log("📈 Market Conditions:");
      console.log(`  ETH Price: $${(Number(scenario.ethPrice) / 1e8).toFixed(2)}`);
      console.log(`  Volatility Multiplier: ${(scenario.volatility / 100).toFixed(1)}%`);
      console.log(`  Liquidity Premium: ${(scenario.liquidity / 100).toFixed(2)}%`);
      console.log(`  DeFi Average Rate: ${(scenario.defiRate / 100).toFixed(2)}%`);

      // Test rate calculation for different credit scores
      console.log("\n💰 Interest Rates by Credit Score:");
      const creditScores = [750, 700, 650, 600, 500, 400];
      const utilization = 8000; // 80%

      for (const score of creditScores) {
        try {
          const rateComponents = await oracleRateModel.getCurrentRateComponentsWithOracles(score, utilization);
          const finalRate = Number(rateComponents[3]) / 100;
          const volatilityMult = Number(rateComponents[4]) / 100;
          const liquidityPrem = Number(rateComponents[5]) / 100;

          console.log(
            `  Credit Score ${score}: ${finalRate.toFixed(2)}% ` +
              `(Vol: ${volatilityMult.toFixed(1)}x, Liq: ${liquidityPrem.toFixed(2)}%)`,
          );
        } catch {
          console.log(`  Credit Score ${score}: Error calculating rate`);
        }
      }

      // Show rate breakdown for a specific credit score
      const testCreditScore = 650;
      try {
        const components = await oracleRateModel.getCurrentRateComponentsWithOracles(testCreditScore, utilization);
        console.log(`\n🔍 Rate Breakdown (Credit Score ${testCreditScore}):`);
        console.log(`  Base Utilization Rate: ${(Number(components[0]) / 100).toFixed(2)}%`);
        console.log(`  Credit Adjusted Rate: ${(Number(components[1]) / 100).toFixed(2)}%`);
        console.log(`  Market Adjusted Rate: ${(Number(components[2]) / 100).toFixed(2)}%`);
        console.log(`  Final Rate: ${(Number(components[3]) / 100).toFixed(2)}%`);
        console.log(`  Oracle Volatility: ${(Number(components[4]) / 100).toFixed(1)}%`);
        console.log(`  Oracle Liquidity Premium: ${(Number(components[5]) / 100).toFixed(2)}%`);
        console.log(`  Oracle Risk Premium: ${(Number(components[6]) / 100).toFixed(2)}%`);
      } catch (error) {
        console.log(`  Error getting rate breakdown: ${error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between scenarios
    }

    // Test Oracle Toggle Functionality
    console.log("\n🔄 Testing Oracle Toggle Functionality");
    console.log("=".repeat(40));

    console.log("📊 With Oracles Enabled:");
    const rateWithOracles = await oracleRateModel.calculateInterestRate(
      650,
      8000,
      ethers.parseEther("1"),
      30 * 24 * 60 * 60,
    );
    console.log(`  Interest Rate: ${(Number(rateWithOracles) / 100).toFixed(2)}%`);

    // Disable oracles
    await oracleRateModel.setUseOracles(false);
    console.log("\n📊 With Oracles Disabled (Manual Mode):");
    const rateWithoutOracles = await oracleRateModel.calculateInterestRate(
      650,
      8000,
      ethers.parseEther("1"),
      30 * 24 * 60 * 60,
    );
    console.log(`  Interest Rate: ${(Number(rateWithoutOracles) / 100).toFixed(2)}%`);

    // Re-enable oracles
    await oracleRateModel.setUseOracles(true);
    console.log("✅ Oracles re-enabled");

    // Test Auto-Update Functionality
    console.log("\n🤖 Testing Auto-Update Functionality");
    console.log("=".repeat(40));

    console.log("📈 Updating ETH price to trigger auto-update...");
    await ethUsdFeed.updateAnswer(400000000000); // $4000
    await oracleRateModel.updatePriceHistory();

    const updatedMarketConditions = await oracleRateModel.getMarketConditions();
    console.log("📊 Auto-Updated Market Conditions:");
    console.log(`  Volatility Multiplier: ${(Number(updatedMarketConditions.volatilityMultiplier) / 100).toFixed(2)}x`);
    console.log(`  Liquidity Premium: ${(Number(updatedMarketConditions.liquidityPremium) / 100).toFixed(2)}%`);
    console.log(`  Risk Premium: ${(Number(updatedMarketConditions.riskPremium) / 100).toFixed(2)}%`);

    // Test Emergency Disable
    console.log("\n🚨 Testing Emergency Oracle Disable");
    console.log("=".repeat(40));

    await oracleRateModel.emergencyDisableOracles();
    const emergencyOracleData = await oracleRateModel.getOracleData();
    console.log("🔴 Emergency mode activated - Oracles disabled:", !emergencyOracleData[8]);

    // Re-enable for final test
    await oracleRateModel.setUseOracles(true);
    await oracleRateModel.setAutoUpdateEnabled(true);

    // Performance Summary
    console.log("\n📊 Oracle Integration Performance Summary");
    console.log("=".repeat(50));

    const finalOracleData = await oracleRateModel.getOracleData();
    console.log("✅ Oracle Integration Features Tested:");
    console.log("  • Real-time price data integration");
    console.log("  • Automatic volatility calculation");
    console.log("  • Market condition adjustments");
    console.log("  • Emergency disable functionality");
    console.log("  • Auto-update capabilities");
    console.log("  • Fallback to manual mode");

    console.log("\n📈 Final Oracle Status:");
    console.log("  ETH Price: $" + (Number(finalOracleData[0]) / 1e8).toFixed(2));
    console.log("  Volatility: " + (Number(finalOracleData[2]) / 100).toFixed(2) + "%");
    console.log("  Liquidity Premium: " + (Number(finalOracleData[4]) / 100).toFixed(2) + "%");
    console.log("  DeFi Rate: " + (Number(finalOracleData[6]) / 100).toFixed(2) + "%");
    console.log("  Oracles Active:", finalOracleData[8]);

    console.log("\n🎉 Oracle Integration Testing Complete!");
    console.log("💡 Next Steps:");
    console.log("  1. Update CreditLending contract to use oracle-enhanced rate model");
    console.log("  2. Update frontend to display oracle data");
    console.log("  3. Test with real user interactions");
    console.log("  4. Deploy to testnet with real Chainlink feeds");
  } catch (error) {
    console.error("❌ Error during oracle integration testing:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
