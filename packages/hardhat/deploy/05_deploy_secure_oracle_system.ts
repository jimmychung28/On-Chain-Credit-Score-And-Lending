import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deploySecureOracleSystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🔒 Deploying Secure Oracle System...");

  // 1. Deploy Oracle Security Manager
  console.log("\n📊 Deploying Oracle Security Manager...");
  const securityManager = await deploy("OracleSecurityManager", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("✅ Oracle Security Manager deployed to:", securityManager.address);

  // 2. Deploy Oracle Governance
  console.log("\n🏛️ Deploying Oracle Governance...");
  const governance = await deploy("OracleGovernance", {
    from: deployer,
    args: [securityManager.address, deployer],
    log: true,
    autoMine: true,
  });

  console.log("✅ Oracle Governance deployed to:", governance.address);

  // 3. Deploy Secure Aggregators (only on local networks)
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n🔐 Deploying Secure Aggregators for testing...");

    // Deploy Secure ETH/USD Aggregator
    const secureEthUsdAggregator = await deploy("SecureETHUSDAggregator", {
      contract: "SecureAggregatorV3",
      from: deployer,
      args: [
        securityManager.address,
        "ETH_USD",
        "Secure ETH/USD Price Feed",
        8,
        300000000000, // $3000 initial price
      ],
      log: true,
      autoMine: true,
    });

    // Deploy Secure Volatility Aggregator
    const secureVolatilityAggregator = await deploy("SecureVolatilityAggregator", {
      contract: "SecureAggregatorV3",
      from: deployer,
      args: [
        securityManager.address,
        "VOLATILITY",
        "Secure Volatility Index",
        2,
        10000, // 100% normal volatility
      ],
      log: true,
      autoMine: true,
    });

    // Deploy Secure Liquidity Aggregator
    const secureLiquidityAggregator = await deploy("SecureLiquidityAggregator", {
      contract: "SecureAggregatorV3",
      from: deployer,
      args: [
        securityManager.address,
        "LIQUIDITY",
        "Secure Liquidity Premium",
        2,
        0, // 0% initial premium
      ],
      log: true,
      autoMine: true,
    });

    console.log("✅ Secure Aggregators deployed!");
    console.log("  Secure ETH/USD:", secureEthUsdAggregator.address);
    console.log("  Secure Volatility:", secureVolatilityAggregator.address);
    console.log("  Secure Liquidity:", secureLiquidityAggregator.address);

    // 4. Setup Oracle Security Manager with mock oracles
    console.log("\n⚙️ Setting up Oracle Security Manager...");

    const securityManagerContract = await hre.ethers.getContract<Contract>("OracleSecurityManager", deployer);

    // Get mock oracle addresses
    const ethUsdFeed = await hre.deployments.get("MockETHUSDFeed");
    const volatilityFeed = await hre.deployments.get("MockVolatilityFeed");
    const liquidityFeed = await hre.deployments.get("MockLiquidityFeed");

    // Add mock oracles to security manager
    console.log("📋 Adding mock oracles to security manager...");

    await securityManagerContract.addOracle(ethUsdFeed.address, 4000, 1000); // 40% weight, 10% max deviation
    console.log("  ✅ Added ETH/USD oracle with 40% weight");

    await securityManagerContract.addOracle(volatilityFeed.address, 3500, 1500); // 35% weight, 15% max deviation
    console.log("  ✅ Added Volatility oracle with 35% weight");

    await securityManagerContract.addOracle(liquidityFeed.address, 2500, 1000); // 25% weight, 10% max deviation
    console.log("  ✅ Added Liquidity oracle with 25% weight");

    // Add price type mappings
    console.log("🗺️ Setting up price type mappings...");
    await securityManagerContract.addPriceTypeOracle("ETH_USD", ethUsdFeed.address);
    await securityManagerContract.addPriceTypeOracle("ETH_USD", volatilityFeed.address);
    await securityManagerContract.addPriceTypeOracle("ETH_USD", liquidityFeed.address);
    console.log("  ✅ Mapped oracles to ETH_USD price type");

    // 5. Update Oracle Rate Model to use secure system
    console.log("\n🔄 Updating Oracle Rate Model with secure system...");

    try {
      const rateModelContract = await hre.ethers.getContract<Contract>("DynamicTargetRateModelWithOracles", deployer);

      // Initialize secure oracle system
      await rateModelContract.initializeSecureOracleSystem(
        securityManager.address,
        secureEthUsdAggregator.address,
        secureVolatilityAggregator.address,
        secureLiquidityAggregator.address,
        hre.ethers.ZeroAddress, // No secure DeFi rate feed for now
      );

      // Enable secure oracles
      await rateModelContract.setUseSecureOracles(true);

      console.log("✅ Rate model updated with secure oracle system");

      // Get oracle system status
      const status = await rateModelContract.getOracleSystemStatus();
      console.log("\n📊 Oracle System Status:");
      console.log("  Legacy Oracles:", status.legacyOraclesEnabled);
      console.log("  Secure Oracles:", status.secureOraclesEnabled);
      console.log("  Security Manager:", status.securityManagerActive);
      console.log("  Circuit Breaker:", status.circuitBreakerActive);
      console.log("  System Status:", status.status);
    } catch {
      console.log("⚠️ Rate model not found, skipping integration");
    }

    // 6. Test secure price retrieval
    console.log("\n🧪 Testing secure price retrieval...");
    try {
      const securePrice = await securityManagerContract.getSecurePrice("ETH_USD");
      console.log("📈 Secure Price Result:");
      console.log("  Valid:", securePrice.isValid);
      console.log("  Price: $" + (Number(securePrice.validatedPrice) / 1e8).toFixed(2));
      console.log("  Confidence:", securePrice.confidence + "%");
      console.log("  Reason:", securePrice.reason);
    } catch {
      console.log("⚠️ Price retrieval test failed");
    }

    // 7. Setup governance roles for testing
    console.log("\n👥 Setting up governance roles...");

    // In a real deployment, you would add additional admin addresses here
    // For testing, the deployer already has all roles
    console.log("✅ Governance roles configured (deployer has all roles for testing)");

    console.log("\n🎯 Secure Oracle System Features:");
    console.log("✅ Price deviation limits (20% max)");
    console.log("✅ Circuit breaker protection (50% volatility threshold)");
    console.log("✅ Multi-oracle consensus validation");
    console.log("✅ Time-locked governance (24-hour delays)");
    console.log("✅ Grace periods for large price changes");
    console.log("✅ Emergency controls and pausing");
    console.log("✅ Malicious oracle detection");
    console.log("✅ Automatic fallback to manual mode");

    console.log("\n🧪 Testing Commands:");
    console.log("  # Test oracle manipulation protection:");
    console.log("  yarn hardhat test test/OracleManipulation.test.ts --network localhost");
    console.log("  ");
    console.log("  # Test price validation:");
    console.log("  yarn hardhat run scripts/test-oracle-security.ts --network localhost");
    console.log("  ");
    console.log("  # Simulate market scenarios with security:");
    console.log("  yarn hardhat run scripts/simulate-oracle-attacks.ts --network localhost");

    console.log("\n⚠️ Security Reminders:");
    console.log("🔐 Change default admin roles before mainnet deployment");
    console.log("🔐 Add multiple oracle admin addresses for multi-sig");
    console.log("🔐 Configure real oracle addresses for production");
    console.log("🔐 Test all emergency procedures thoroughly");
    console.log("🔐 Monitor circuit breaker triggers in production");
  } else {
    console.log("⏭️ Skipping secure aggregator deployment on", hre.network.name);
    console.log("💡 For production, configure with real Chainlink oracles");
  }

  console.log("\n📝 Deployed Contract Addresses:");
  console.log("  Oracle Security Manager:", securityManager.address);
  console.log("  Oracle Governance:", governance.address);

  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    const secureEthUsd = await hre.deployments.get("SecureETHUSDAggregator");
    const secureVolatility = await hre.deployments.get("SecureVolatilityAggregator");
    const secureLiquidity = await hre.deployments.get("SecureLiquidityAggregator");

    console.log("  Secure ETH/USD Aggregator:", secureEthUsd.address);
    console.log("  Secure Volatility Aggregator:", secureVolatility.address);
    console.log("  Secure Liquidity Aggregator:", secureLiquidity.address);
  }
};

export default deploySecureOracleSystem;
deploySecureOracleSystem.tags = ["SecureOracleSystem"];
deploySecureOracleSystem.dependencies = ["MockOracles", "OracleRateModel"]; // Deploy after mock oracles and rate model
