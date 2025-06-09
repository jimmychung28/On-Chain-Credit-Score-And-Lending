import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const setupTestData: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();

  // Get the deployed contracts
  const creditLending = await hre.ethers.getContract<Contract>("CreditLending", deployer);

  console.log("Setting up test data...");

  try {
    // Just fund the lending pool with some ETH for testing loans
    console.log("Adding initial liquidity to lending pool...");
    const fundingTx = await creditLending.stakeETH({ value: hre.ethers.parseEther("10") });
    await fundingTx.wait();
    console.log("✅ Added 10 ETH to lending pool");

    console.log("\n🎉 Basic setup complete!");
    console.log("\nTo test the credit scoring system:");
    console.log("1. Connect your wallet (0x2c827c3E27744B1D83df71000F6c3B7FC59Fa0A1)");
    console.log("2. Register as a user on the frontend");
    console.log("3. Use the admin functions to set up test credit data");
    console.log("\nLending pool has 10 ETH available for loans.");
  } catch (error) {
    console.error("❌ Error setting up test data:", error);
  }
};

export default setupTestData;
setupTestData.tags = ["test-data"];
setupTestData.dependencies = ["CreditScoring", "CreditLending"];
