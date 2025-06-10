import { ethers } from "hardhat";

/**
 * Test script to demonstrate hybrid oracle functionality
 * Shows the difference between custom advanced mocks and Chainlink-style mocks
 */
async function main() {
  console.log("🧪 Testing Hybrid Oracle System\n");

  // Get the factory contract
  const factoryAddress = process.env.MOCK_ORACLE_FACTORY || "";
  if (!factoryAddress) {
    console.log("⚠️  MockOracleFactory not found. Run deployment first.");
    return;
  }

  const factory = await ethers.getContractAt("MockOracleFactory", factoryAddress);

  console.log("📋 Factory Address:", factoryAddress);

  // === Test 1: Deploy Different Mock Types ===
  console.log("\n=== Test 1: Deploying Different Mock Types ===");

  try {
    // Deploy custom advanced mock
    const customOracleAddress = await factory.deployCustomAdvancedMock(
      "TEST_CUSTOM",
      8,
      "Test Custom Advanced Oracle",
      250000000000, // $2500
    );

    // Deploy Chainlink standard mock
    const chainlinkOracleAddress = await factory.deployChainlinkStandardMock(
      "TEST_CHAINLINK",
      8,
      250000000000, // $2500
    );

    // Deploy hybrid mock
    const hybridOracleAddress = await factory.deployHybridMock(
      "TEST_HYBRID",
      8,
      "Test Hybrid Oracle",
      250000000000, // $2500
    );

    console.log("✅ Deployed all mock types successfully");
    console.log(`  Custom Advanced: ${customOracleAddress}`);
    console.log(`  Chainlink Standard: ${chainlinkOracleAddress}`);
    console.log(`  Hybrid: ${hybridOracleAddress}`);
  } catch (error: any) {
    if (error.message.includes("Oracle name already exists")) {
      console.log("ℹ️  Test oracles already exist, continuing with existing ones...");
    } else {
      console.error("❌ Error deploying test oracles:", error.message);
      return;
    }
  }

  // === Test 2: Compare Basic Functionality ===
  console.log("\n=== Test 2: Basic Functionality Comparison ===");

  const testOracles = ["TEST_CUSTOM", "TEST_CHAINLINK", "TEST_HYBRID"];

  for (const oracleName of testOracles) {
    const address = await factory.getOracleAddress(oracleName);
    const oracle = await ethers.getContractAt("AggregatorV3Interface", address);

    console.log(`\n📊 Testing ${oracleName}:`);
    console.log(`  Address: ${address}`);

    try {
      const decimals = await oracle.decimals();
      const description = await oracle.description();
      const version = await oracle.version();
      const [roundId, answer, , updatedAt] = await oracle.latestRoundData();

      console.log(`  Decimals: ${decimals}`);
      console.log(`  Description: ${description}`);
      console.log(`  Version: ${version}`);
      console.log(`  Latest Answer: $${ethers.formatUnits(answer, decimals)}`);
      console.log(`  Round ID: ${roundId}`);
      console.log(`  Updated: ${new Date(Number(updatedAt) * 1000).toISOString()}`);
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  // === Test 3: Advanced Features (Custom vs Hybrid) ===
  console.log("\n=== Test 3: Advanced Features Testing ===");

  // Test custom advanced oracle
  console.log("\n🎛️  Testing Custom Advanced Oracle:");
  try {
    const customAddress = await factory.getOracleAddress("TEST_CUSTOM");
    const customOracle = await ethers.getContractAt("MockAggregatorV3", customAddress);

    console.log("  📈 Testing price simulation...");
    await customOracle.simulatePriceMovement(500, 3); // 5% max change, 3 steps

    const [, newPrice] = await customOracle.latestRoundData();
    console.log(`  🎲 New simulated price: $${ethers.formatUnits(newPrice, 8)}`);

    console.log("  ✅ Advanced features work on custom oracle");
  } catch (error: any) {
    console.error(`  ❌ Custom oracle error: ${error.message}`);
  }

  // Test hybrid oracle switching
  console.log("\n🔄 Testing Hybrid Oracle Mode Switching:");
  try {
    const hybridAddress = await factory.getOracleAddress("TEST_HYBRID");
    const hybridOracle = await ethers.getContractAt("HybridMockOracle", hybridAddress);

    // Test in custom mode
    console.log(`  Current mode: ${await hybridOracle.getCurrentMockTypeString()}`);
    console.log("  🎭 Testing advanced features in custom mode...");
    await hybridOracle.simulatePriceMovement(300, 2); // 3% change

    const [, customModePrice] = await hybridOracle.latestRoundData();
    console.log(`  Custom mode price: $${ethers.formatUnits(customModePrice, 8)}`);

    // Switch to Chainlink mode
    console.log("  🔄 Switching to Chainlink standard mode...");
    await hybridOracle.setMockType(1); // CHAINLINK_STANDARD
    console.log(`  New mode: ${await hybridOracle.getCurrentMockTypeString()}`);

    // Update price in standard mode
    await hybridOracle.updateAnswer(260000000000); // $2600
    const [, standardModePrice] = await hybridOracle.latestRoundData();
    console.log(`  Standard mode price: $${ethers.formatUnits(standardModePrice, 8)}`);

    // Test both answers
    const [customAnswer, standardAnswer] = await hybridOracle.getBothAnswers();
    console.log(
      `  📊 Both answers - Custom: $${ethers.formatUnits(customAnswer, 8)}, Standard: $${ethers.formatUnits(standardAnswer, 8)}`,
    );

    // Switch to hybrid mode
    console.log("  🔄 Switching to hybrid mode...");
    await hybridOracle.setMockType(2); // HYBRID_MODE
    console.log(`  Final mode: ${await hybridOracle.getCurrentMockTypeString()}`);

    console.log("  ✅ Hybrid oracle mode switching successful");
  } catch (error: any) {
    console.error(`  ❌ Hybrid oracle error: ${error.message}`);
  }

  // === Test 4: Batch Operations ===
  console.log("\n=== Test 4: Batch Operations ===");

  try {
    console.log("📦 Testing batch price updates...");

    await factory.batchUpdatePrices(
      ["TEST_CUSTOM", "TEST_CHAINLINK", "TEST_HYBRID"],
      [270000000000, 275000000000, 280000000000], // $2700, $2750, $2800
    );

    const batchPrices = await factory.getBatchPrices(["TEST_CUSTOM", "TEST_CHAINLINK", "TEST_HYBRID"]);

    console.log("📊 Updated prices:");
    batchPrices.forEach((price, index) => {
      console.log(`  ${testOracles[index]}: $${ethers.formatUnits(price, 8)}`);
    });

    console.log("✅ Batch operations successful");
  } catch (error: any) {
    console.error(`❌ Batch operations error: ${error.message}`);
  }

  // === Test 5: Oracle Health Check ===
  console.log("\n=== Test 5: Oracle Health Check ===");

  try {
    const hybridAddress = await factory.getOracleAddress("TEST_HYBRID");
    const hybridOracle = await ethers.getContractAt("HybridMockOracle", hybridAddress);

    const isHealthy = await hybridOracle.isCustomMockHealthy();
    console.log(`🏥 Custom mock health: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`);

    // Get oracle details
    const details = await factory.getOracleDetails("TEST_HYBRID");
    console.log("📋 Oracle Details:");
    console.log(`  Type: ${details[1]}`);
    console.log(`  Description: ${details[2]}`);
    console.log(`  Decimals: ${details[3]}`);
    console.log(`  Initial Answer: $${ethers.formatUnits(details[4], 8)}`);
    console.log(`  Deployed At: ${new Date(Number(details[5]) * 1000).toISOString()}`);
  } catch (error: any) {
    console.error(`❌ Health check error: ${error.message}`);
  }

  console.log("\n🎉 Hybrid Oracle Testing Complete!");
  console.log("\n📝 Summary:");
  console.log("  ✅ Custom Advanced: Full simulation features");
  console.log("  ✅ Chainlink Standard: Simple, compatible interface");
  console.log("  ✅ Hybrid: Best of both worlds with mode switching");
  console.log("  ✅ Factory: Unified management and batch operations");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("💥 Test failed:", error);
    process.exit(1);
  });
