import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployZKSystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🔐 Deploying ZK-First Credit System...");

  // Deploy Mock ZK Verifier
  const mockZKVerifier = await deploy("MockZKVerifier", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  // Deploy ZK Credit Scoring (replaces old CreditScoring)
  const zkCreditScoring = await deploy("ZKCreditScoring", {
    from: deployer,
    args: [mockZKVerifier.address],
    log: true,
    autoMine: true,
  });

  // Get existing rate model
  let rateModel;
  try {
    rateModel = await hre.deployments.get("DynamicTargetRateModelWithOracles");
  } catch {
    // Fallback to basic rate model if oracle version doesn't exist
    try {
      rateModel = await hre.deployments.get("DynamicTargetRateModel");
    } catch {
      console.log("⚠️  No rate model found, deploying basic one...");
      rateModel = await deploy("DynamicTargetRateModel", {
        from: deployer,
        log: true,
        autoMine: true,
      });
    }
  }

  // Deploy ZK Credit Lending (replaces old CreditLending)
  const zkCreditLending = await deploy("ZKCreditLending", {
    from: deployer,
    args: [zkCreditScoring.address, rateModel.address],
    log: true,
    autoMine: true,
  });

  console.log("✅ ZK System Deployed Successfully:");
  console.log(`📍 Mock ZK Verifier: ${mockZKVerifier.address}`);
  console.log(`📍 ZK Credit Scoring: ${zkCreditScoring.address}`);
  console.log(`📍 ZK Credit Lending: ${zkCreditLending.address}`);

  // Setup contracts
  console.log("🔧 Setting up ZK system...");

  const zkCreditScoringContract = await hre.ethers.getContract("ZKCreditScoring", deployer) as any;

  // Add ZK Credit Lending as verified address in ZK Credit Scoring
  console.log("Adding ZKCreditLending as verified address...");
  const tx1 = await zkCreditScoringContract.addVerifiedAddress(zkCreditLending.address);
  await tx1.wait();
  console.log("✅ ZKCreditLending added as verified address");

  // Create test users - privacy by default, some with transparency levels
  console.log("Creating test users with privacy by default...");
  
  const testUsers = [
    { address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", transparencyLevel: 1 }, // High transparency (premium)
    { address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", transparencyLevel: 3 }, // Medium transparency  
    { address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096", transparencyLevel: 5 }, // Max privacy (default)
  ];

  for (const user of testUsers) {
    try {
      if (user.transparencyLevel === 5) {
        // Use default privacy (no premium)
        await zkCreditScoringContract.createTestUser(user.address);
        console.log(`✅ Created test user ${user.address} with maximum privacy (default)`);
      } else {
        // Create with transparency level (premium applied)
        await zkCreditScoringContract.createTestUserWithTransparency(user.address, user.transparencyLevel);
        console.log(`✅ Created test user ${user.address} with transparency level ${user.transparencyLevel}`);
      }
    } catch {
      console.log(`⚠️  User ${user.address} already exists or error occurred`);
    }
  }

  // Log transparency premiums
  console.log("\n💰 Transparency Premiums (Users pay MORE for public data):");
  console.log("Level 1: 2.0% premium (fully public)");
  console.log("Level 2: 1.5% premium (mostly public)");
  console.log("Level 3: 1.0% premium (partially public)");
  console.log("Level 4: 0.5% premium (minimal public)");
  console.log("Level 5: 0% premium (fully private - DEFAULT)");

  console.log("\n🔐 Privacy-First Features:");
  console.log("• Privacy by default - no cost for maximum privacy");
  console.log("• Users pay premium ONLY for public transparency");
  console.log("• Credit scores verified with zero-knowledge proofs");
  console.log("• Financial data stored off-chain (cryptographically private)");
  console.log("• Only score and privacy level exposed on-chain");
  console.log("• Economically honest: privacy is cheaper to provide");

  // Verify contracts on block explorer
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    try {
      console.log("🔍 Verifying contracts on block explorer...");
      
      await hre.run("verify:verify", {
        address: mockZKVerifier.address,
        constructorArguments: [],
      });

      await hre.run("verify:verify", {
        address: zkCreditScoring.address,
        constructorArguments: [mockZKVerifier.address],
      });

      await hre.run("verify:verify", {
        address: zkCreditLending.address,
        constructorArguments: [zkCreditScoring.address, rateModel.address],
      });

      console.log("✅ Contracts verified on block explorer");
    } catch (error) {
      console.log("❌ Verification failed:", error);
    }
  }

  console.log("\n🚀 ZK-First Credit System is ready!");
  console.log("Visit http://localhost:3000 to test the privacy-preserving features");
};

export default deployZKSystem;
deployZKSystem.tags = ["ZKSystem"];
deployZKSystem.dependencies = []; 