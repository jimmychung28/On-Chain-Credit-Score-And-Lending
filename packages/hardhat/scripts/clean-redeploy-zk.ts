import { ethers } from "hardhat";

async function main() {
  console.log("🧹 Clean redeployment of ZK system only...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // 1. Deploy MockZKVerifier
  console.log("Deploying MockZKVerifier...");
  const MockZKVerifier = await ethers.getContractFactory("MockZKVerifier");
  const mockZKVerifier = await MockZKVerifier.deploy();
  await mockZKVerifier.waitForDeployment();
  console.log("MockZKVerifier deployed to:", await mockZKVerifier.getAddress());

  // 2. Deploy DynamicTargetRateModel
  console.log("Deploying DynamicTargetRateModel...");
  const DynamicTargetRateModel = await ethers.getContractFactory("DynamicTargetRateModel");
  const rateModel = await DynamicTargetRateModel.deploy();
  await rateModel.waitForDeployment();
  console.log("DynamicTargetRateModel deployed to:", await rateModel.getAddress());

  // 3. Deploy ZKCreditScoring
  console.log("Deploying ZKCreditScoring...");
  const ZKCreditScoring = await ethers.getContractFactory("ZKCreditScoring");
  const zkCreditScoring = await ZKCreditScoring.deploy(await mockZKVerifier.getAddress());
  await zkCreditScoring.waitForDeployment();
  console.log("ZKCreditScoring deployed to:", await zkCreditScoring.getAddress());

  // 4. Deploy ZKCreditLending
  console.log("Deploying ZKCreditLending...");
  const ZKCreditLending = await ethers.getContractFactory("ZKCreditLending");
  const zkCreditLending = await ZKCreditLending.deploy(
    await zkCreditScoring.getAddress(),
    await rateModel.getAddress(),
  );
  await zkCreditLending.waitForDeployment();
  console.log("ZKCreditLending deployed to:", await zkCreditLending.getAddress());

  // 5. Setup permissions
  console.log("Adding ZKCreditLending as verified address...");
  await zkCreditScoring.addVerifiedAddress(await zkCreditLending.getAddress());
  console.log("✅ ZKCreditLending added as verified address");

  // 6. Add initial liquidity (10 ETH)
  console.log("Adding initial liquidity to lending pool...");
  await zkCreditLending.stakeETH({ value: ethers.parseEther("10") });
  console.log("✅ Added 10 ETH to lending pool");

  console.log("\n🎉 Clean ZK system deployment complete!");
  console.log("=".repeat(50));
  console.log("📋 New Contract Addresses:");
  console.log("MockZKVerifier:", await mockZKVerifier.getAddress());
  console.log("DynamicTargetRateModel:", await rateModel.getAddress());
  console.log("ZKCreditScoring:", await zkCreditScoring.getAddress());
  console.log("ZKCreditLending:", await zkCreditLending.getAddress());
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
