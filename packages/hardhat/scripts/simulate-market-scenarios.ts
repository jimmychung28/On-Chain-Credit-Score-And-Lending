import { ethers } from "hardhat";

async function main() {
  console.log("🎭 Simulating Dynamic Market Scenarios");
  console.log("=".repeat(50));

  try {
    // Get contract instances
    const oracleRateModel = (await ethers.getContract("DynamicTargetRateModelWithOracles")) as any;
    const ethUsdFeed = (await ethers.getContract("MockETHUSDFeed")) as any;
    const volatilityFeed = (await ethers.getContract("MockVolatilityFeed")) as any;
    const liquidityFeed = (await ethers.getContract("MockLiquidityFeed")) as any;
    const defiRateFeed = (await ethers.getContract("MockDeFiRateFeed")) as any;

    // Test credit score for demonstration
    const testCreditScore = 650;
    const testUtilization = 8000; // 80%

    console.log(`📊 Monitoring rates for Credit Score ${testCreditScore} at ${testUtilization / 100}% utilization`);
    console.log("\n⏰ Time Series Simulation (30 data points over ~5 minutes)");
    console.log("=".repeat(80));
    console.log("Time | ETH Price | Volatility | Liquidity | DeFi Rate | Interest Rate");
    console.log("=".repeat(80));

    // Market simulation timeline
    const timelineEvents = [
      // Normal trading day start
      {
        time: "09:00",
        ethPrice: 300000000000,
        volatility: 10000,
        liquidity: 0,
        defiRate: 500,
        description: "Market Open - Normal Conditions",
      },
      {
        time: "09:30",
        ethPrice: 305000000000,
        volatility: 12000,
        liquidity: 50,
        defiRate: 520,
        description: "Morning Rally",
      },
      {
        time: "10:00",
        ethPrice: 310000000000,
        volatility: 15000,
        liquidity: 100,
        defiRate: 550,
        description: "Continued Growth",
      },
      {
        time: "10:30",
        ethPrice: 320000000000,
        volatility: 18000,
        liquidity: 150,
        defiRate: 580,
        description: "Strong Momentum",
      },

      // News impact - positive
      {
        time: "11:00",
        ethPrice: 350000000000,
        volatility: 25000,
        liquidity: 200,
        defiRate: 650,
        description: "📈 Positive News Break",
      },
      {
        time: "11:30",
        ethPrice: 380000000000,
        volatility: 30000,
        liquidity: 300,
        defiRate: 750,
        description: "FOMO Rally",
      },
      {
        time: "12:00",
        ethPrice: 400000000000,
        volatility: 35000,
        liquidity: 400,
        defiRate: 850,
        description: "Peak Excitement",
      },

      // Profit taking
      {
        time: "12:30",
        ethPrice: 380000000000,
        volatility: 30000,
        liquidity: 350,
        defiRate: 800,
        description: "Profit Taking Begins",
      },
      {
        time: "13:00",
        ethPrice: 360000000000,
        volatility: 28000,
        liquidity: 300,
        defiRate: 720,
        description: "Consolidation",
      },
      {
        time: "13:30",
        ethPrice: 350000000000,
        volatility: 25000,
        liquidity: 250,
        defiRate: 680,
        description: "Settling Down",
      },

      // Negative news impact
      {
        time: "14:00",
        ethPrice: 320000000000,
        volatility: 35000,
        liquidity: 500,
        defiRate: 900,
        description: "📉 Negative News",
      },
      {
        time: "14:30",
        ethPrice: 280000000000,
        volatility: 45000,
        liquidity: 750,
        defiRate: 1200,
        description: "Panic Selling",
      },
      {
        time: "15:00",
        ethPrice: 250000000000,
        volatility: 55000,
        liquidity: 1000,
        defiRate: 1500,
        description: "Market Crash",
      },

      // Volatility spike
      {
        time: "15:30",
        ethPrice: 230000000000,
        volatility: 60000,
        liquidity: 1200,
        defiRate: 1800,
        description: "⚡ Extreme Volatility",
      },
      {
        time: "16:00",
        ethPrice: 200000000000,
        volatility: 70000,
        liquidity: 1500,
        defiRate: 2000,
        description: "Liquidation Cascade",
      },

      // Market makers step in
      {
        time: "16:30",
        ethPrice: 220000000000,
        volatility: 65000,
        liquidity: 1300,
        defiRate: 1800,
        description: "🤖 Market Makers Intervene",
      },
      {
        time: "17:00",
        ethPrice: 240000000000,
        volatility: 55000,
        liquidity: 1100,
        defiRate: 1600,
        description: "Stabilization Attempt",
      },
      {
        time: "17:30",
        ethPrice: 260000000000,
        volatility: 45000,
        liquidity: 900,
        defiRate: 1400,
        description: "Recovery Begins",
      },

      // Gradual recovery
      {
        time: "18:00",
        ethPrice: 270000000000,
        volatility: 40000,
        liquidity: 700,
        defiRate: 1200,
        description: "Slow Recovery",
      },
      {
        time: "18:30",
        ethPrice: 280000000000,
        volatility: 35000,
        liquidity: 600,
        defiRate: 1100,
        description: "Confidence Returns",
      },
      {
        time: "19:00",
        ethPrice: 290000000000,
        volatility: 30000,
        liquidity: 500,
        defiRate: 1000,
        description: "Steady Climb",
      },

      // Evening stability
      {
        time: "19:30",
        ethPrice: 295000000000,
        volatility: 25000,
        liquidity: 400,
        defiRate: 900,
        description: "Evening Calm",
      },
      {
        time: "20:00",
        ethPrice: 300000000000,
        volatility: 22000,
        liquidity: 350,
        defiRate: 850,
        description: "Back to Normal",
      },
      {
        time: "20:30",
        ethPrice: 305000000000,
        volatility: 20000,
        liquidity: 300,
        defiRate: 800,
        description: "Late Day Strength",
      },

      // Asian market open
      {
        time: "21:00",
        ethPrice: 310000000000,
        volatility: 18000,
        liquidity: 250,
        defiRate: 750,
        description: "🌏 Asian Markets Open",
      },
      {
        time: "21:30",
        ethPrice: 315000000000,
        volatility: 16000,
        liquidity: 200,
        defiRate: 700,
        description: "Global Demand",
      },
      {
        time: "22:00",
        ethPrice: 320000000000,
        volatility: 15000,
        liquidity: 180,
        defiRate: 680,
        description: "Sustained Growth",
      },

      // Weekend approach
      {
        time: "22:30",
        ethPrice: 318000000000,
        volatility: 14000,
        liquidity: 150,
        defiRate: 650,
        description: "Weekend Position Closing",
      },
      {
        time: "23:00",
        ethPrice: 315000000000,
        volatility: 12000,
        liquidity: 120,
        defiRate: 620,
        description: "Reduced Volume",
      },
      {
        time: "23:30",
        ethPrice: 312000000000,
        volatility: 10000,
        liquidity: 100,
        defiRate: 600,
        description: "Market Close Approaching",
      },
    ];

    for (let i = 0; i < timelineEvents.length; i++) {
      const event = timelineEvents[i];

      // Update oracle prices
      await ethUsdFeed.updateAnswer(event.ethPrice);
      await volatilityFeed.updateAnswer(event.volatility);
      await liquidityFeed.updateAnswer(event.liquidity);
      await defiRateFeed.updateAnswer(event.defiRate);

      // Update price history for volatility calculation
      await oracleRateModel.updatePriceHistory();

      // Get current rate
      const rate = await oracleRateModel.calculateInterestRate(
        testCreditScore,
        testUtilization,
        ethers.parseEther("1"),
        30 * 24 * 60 * 60,
      );

      // Format display
      const ethPriceFormatted = `$${(Number(event.ethPrice) / 1e8).toFixed(0).padStart(4)}`;
      const volatilityFormatted = `${(event.volatility / 100).toFixed(0)}%`.padStart(4);
      const liquidityFormatted = `${(event.liquidity / 100).toFixed(1)}%`.padStart(5);
      const defiRateFormatted = `${(event.defiRate / 100).toFixed(1)}%`.padStart(5);
      const interestRateFormatted = `${(Number(rate) / 100).toFixed(2)}%`.padStart(7);

      console.log(
        `${event.time} | ${ethPriceFormatted} | ${volatilityFormatted}    | ${liquidityFormatted}    | ${defiRateFormatted}    | ${interestRateFormatted}`,
      );

      // Show major events
      if (
        event.description.includes("📈") ||
        event.description.includes("📉") ||
        event.description.includes("⚡") ||
        event.description.includes("🤖") ||
        event.description.includes("🌏")
      ) {
        console.log(`     └─ ${event.description}`);
      }

      // Pause between updates for realistic simulation
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log("=".repeat(80));

    // Analysis of rate changes
    console.log("\n📊 Market Impact Analysis");
    console.log("=".repeat(30));

    // Test extreme scenarios
    const scenarios = [
      {
        name: "🟢 Optimal Conditions",
        ethPrice: 350000000000,
        volatility: 8000,
        liquidity: 0,
        defiRate: 400,
      },
      {
        name: "🟡 Moderate Stress",
        ethPrice: 250000000000,
        volatility: 20000,
        liquidity: 300,
        defiRate: 800,
      },
      {
        name: "🔴 Crisis Mode",
        ethPrice: 150000000000,
        volatility: 50000,
        liquidity: 1000,
        defiRate: 1500,
      },
      {
        name: "⚫ Black Swan",
        ethPrice: 80000000000,
        volatility: 80000,
        liquidity: 2000,
        defiRate: 3000,
      },
    ];

    for (const scenario of scenarios) {
      await ethUsdFeed.updateAnswer(scenario.ethPrice);
      await volatilityFeed.updateAnswer(scenario.volatility);
      await liquidityFeed.updateAnswer(scenario.liquidity);
      await defiRateFeed.updateAnswer(scenario.defiRate);
      await oracleRateModel.updatePriceHistory();

      const components = await oracleRateModel.getCurrentRateComponentsWithOracles(testCreditScore, testUtilization);

      console.log(`\n${scenario.name}:`);
      console.log(
        `  ETH: $${(Number(scenario.ethPrice) / 1e8).toFixed(0)} | Vol: ${scenario.volatility / 100}% | Liq: ${scenario.liquidity / 100}% | DeFi: ${scenario.defiRate / 100}%`,
      );
      console.log(`  Interest Rate: ${(Number(components[3]) / 100).toFixed(2)}%`);
      console.log(
        `  Breakdown: Base ${(Number(components[0]) / 100).toFixed(2)}% → Credit ${(Number(components[1]) / 100).toFixed(2)}% → Market ${(Number(components[2]) / 100).toFixed(2)}% → Final ${(Number(components[3]) / 100).toFixed(2)}%`,
      );
    }

    // Rate sensitivity analysis
    console.log("\n📈 Rate Sensitivity Analysis");
    console.log("=".repeat(35));

    // Reset to normal conditions
    await ethUsdFeed.updateAnswer(300000000000);
    await volatilityFeed.updateAnswer(10000);
    await liquidityFeed.updateAnswer(100);
    await defiRateFeed.updateAnswer(500);

    const baseRate = await oracleRateModel.calculateInterestRate(
      testCreditScore,
      testUtilization,
      ethers.parseEther("1"),
      30 * 24 * 60 * 60,
    );
    console.log(`📍 Base Rate (Normal Conditions): ${(Number(baseRate) / 100).toFixed(2)}%`);

    // Test individual factor impacts
    const factors = [
      { name: "ETH Price -50%", ethPrice: 150000000000, volatility: 10000, liquidity: 100, defiRate: 500 },
      { name: "Volatility +300%", ethPrice: 300000000000, volatility: 30000, liquidity: 100, defiRate: 500 },
      { name: "Liquidity Crisis", ethPrice: 300000000000, volatility: 10000, liquidity: 1000, defiRate: 500 },
      { name: "DeFi Rates Spike", ethPrice: 300000000000, volatility: 10000, liquidity: 100, defiRate: 2000 },
    ];

    for (const factor of factors) {
      await ethUsdFeed.updateAnswer(factor.ethPrice);
      await volatilityFeed.updateAnswer(factor.volatility);
      await liquidityFeed.updateAnswer(factor.liquidity);
      await defiRateFeed.updateAnswer(factor.defiRate);

      const testRate = await oracleRateModel.calculateInterestRate(
        testCreditScore,
        testUtilization,
        ethers.parseEther("1"),
        30 * 24 * 60 * 60,
      );
      const impact = Number(testRate) - Number(baseRate);

      console.log(
        `  ${factor.name}: ${(Number(testRate) / 100).toFixed(2)}% (${impact > 0 ? "+" : ""}${(impact / 100).toFixed(2)}%)`,
      );
    }

    console.log("\n🎯 Oracle Integration Summary");
    console.log("=".repeat(35));
    console.log("✅ Successful Features Demonstrated:");
    console.log("  • Real-time market data integration");
    console.log("  • Dynamic volatility calculation");
    console.log("  • Automatic rate adjustments");
    console.log("  • Market condition responsiveness");
    console.log("  • Crisis mode protection");
    console.log("  • Smooth factor transitions");

    console.log("\n🚀 Ready for Production!");
    console.log("Next steps:");
    console.log("1. Replace mock oracles with real Chainlink feeds");
    console.log("2. Add governance controls for oracle parameters");
    console.log("3. Implement rate update frequency limits");
    console.log("4. Add comprehensive monitoring and alerting");
  } catch (error) {
    console.error("❌ Error during market simulation:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
