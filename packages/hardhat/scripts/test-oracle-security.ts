import { ethers } from "hardhat";

async function main() {
  console.log("🔒 Testing Oracle Security System...\n");

  // Get deployed contracts
  const [,] = await ethers.getSigners();

  try {
    const securityManager = await ethers.getContract("OracleSecurityManager");
    const governance = await ethers.getContract("OracleGovernance");
    const rateModel = await ethers.getContract("DynamicTargetRateModelWithOracles");
    const ethUsdFeed = await ethers.getContract("MockETHUSDFeed");

    console.log("📊 Contract Addresses:");
    console.log("  Security Manager:", await securityManager.getAddress());
    console.log("  Governance:", await governance.getAddress());
    console.log("  Rate Model:", await rateModel.getAddress());
    console.log("  ETH/USD Feed:", await ethUsdFeed.getAddress());

    // Test 1: Check initial security parameters
    console.log("\n🧪 Test 1: Security Parameters");
    const params = await securityManager.getSecurityParameters();
    console.log("  Max Price Deviation:", params.maxPriceDeviationBps / 100 + "%");
    console.log("  Circuit Breaker Threshold:", params.circuitBreakerThresholdBps / 100 + "%");
    console.log("  Min Oracle Count:", params.minOracleCount.toString());
    console.log("  Max Staleness:", params.maxStalenessSeconds.toString(), "seconds");

    // Test 2: Check oracle system status
    console.log("\n🧪 Test 2: Oracle System Status");
    const status = await rateModel.getOracleSystemStatus();
    console.log("  Legacy Oracles:", status.legacyOraclesEnabled);
    console.log("  Secure Oracles:", status.secureOraclesEnabled);
    console.log("  Security Manager Active:", status.securityManagerActive);
    console.log("  Circuit Breaker:", status.circuitBreakerActive);
    console.log("  Status:", status.status);

    // Test 3: Get secure price
    console.log("\n🧪 Test 3: Secure Price Retrieval");
    try {
      const securePrice = await securityManager.getSecurePrice("ETH_USD");
      console.log("  Valid:", securePrice.isValid);
      console.log("  Price: $" + (Number(securePrice.validatedPrice) / 1e8).toFixed(2));
      console.log("  Confidence:", securePrice.confidence + "%");
      console.log("  Reason:", securePrice.reason);
    } catch (error) {
      console.log("  ❌ Price retrieval failed:", error);
    }

    // Test 4: Test price validation
    console.log("\n🧪 Test 4: Price Validation");
    const normalPrice = 315000000000; // $3150 (5% increase)
    const extremePrice = 450000000000; // $4500 (50% increase)

    const normalValidation = await securityManager.validatePrice(await ethUsdFeed.getAddress(), normalPrice);
    console.log("  Normal price (5% increase):");
    console.log("    Valid:", normalValidation.isValid);
    console.log("    Confidence:", normalValidation.confidence + "%");

    const extremeValidation = await securityManager.validatePrice(await ethUsdFeed.getAddress(), extremePrice);
    console.log("  Extreme price (50% increase):");
    console.log("    Valid:", extremeValidation.isValid);
    console.log("    Reason:", extremeValidation.reason);

    // Test 5: Test rate calculation with current market conditions
    console.log("\n🧪 Test 5: Rate Calculation with Oracle Data");
    const creditScore = 700;
    const utilization = 8000; // 80%

    try {
      const rateComponents = await rateModel.getCurrentRateComponentsWithOracles(creditScore, utilization);
      console.log("  Base Rate:", (Number(rateComponents.baseUtilizationRate) / 100).toFixed(2) + "%");
      console.log("  Credit Adjusted:", (Number(rateComponents.creditAdjustedRate) / 100).toFixed(2) + "%");
      console.log("  Market Adjusted:", (Number(rateComponents.marketAdjustedRate) / 100).toFixed(2) + "%");
      console.log("  Final Rate:", (Number(rateComponents.finalRate) / 100).toFixed(2) + "%");
      console.log(
        "  Oracle Volatility Multiplier:",
        (Number(rateComponents.oracleVolatilityMultiplier) / 100).toFixed(2) + "x",
      );
      console.log(
        "  Oracle Liquidity Premium:",
        (Number(rateComponents.oracleLiquidityPremium) / 100).toFixed(2) + "%",
      );
      console.log("  Oracle Risk Premium:", (Number(rateComponents.oracleRiskPremium) / 100).toFixed(2) + "%");
    } catch (error) {
      console.log("  ❌ Rate calculation failed:", error);
    }

    // Test 6: Test oracle count
    console.log("\n🧪 Test 6: Oracle Configuration");
    const oracleCount = await securityManager.getActiveOracleCount();
    console.log("  Active Oracle Count:", oracleCount.toString());

    // Test 7: Test governance proposal creation (read-only check)
    console.log("\n🧪 Test 7: Governance System");
    const nextProposalId = await governance.nextProposalId();
    const requiredApprovals = await governance.requiredApprovals();
    console.log("  Next Proposal ID:", nextProposalId.toString());
    console.log("  Required Approvals:", requiredApprovals.toString());

    // Test 8: Emergency controls check
    console.log("\n🧪 Test 8: Emergency Controls");
    const isPaused = await securityManager.isPaused();
    const isCircuitBreakerActive = await securityManager.isCircuitBreakerActive();
    console.log("  System Paused:", isPaused);
    console.log("  Circuit Breaker Active:", isCircuitBreakerActive);

    console.log("\n✅ Oracle Security System Tests Completed!");
    console.log("\n💡 To run manipulation tests:");
    console.log("  yarn hardhat test test/OracleManipulation.test.ts --network localhost");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
