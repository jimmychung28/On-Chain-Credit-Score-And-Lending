import { ethers } from "hardhat";

async function main() {
  const userAddress = "0x3071CBb43429a095482a6bdE5bB50564c11E5020";
  console.log(`🔍 Testing registration for: ${userAddress}`);

  // Get deployed ZK contracts
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring");
  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);

  // Check current profile
  const profile = await zkCreditScoring.getCreditProfile(userAddress);
  console.log("📊 Current Profile:");
  console.log(`  Score: ${profile[0]}`);
  console.log(`  Last Updated: ${profile[1]}`);
  console.log(`  Is Active: ${profile[2]}`);
  console.log(`  Privacy Level: ${profile[3]}`);
  console.log(`  Is Verified: ${profile[4]}`);

  if (!profile[2]) {
    console.log("\n✅ User is NOT registered - registration should work!");

    // Try to estimate gas for registration
    try {
      const [signer] = await ethers.getSigners();
      console.log("\n🔍 Testing registration from deployer account...");

      // Get gas estimate
      const gasEstimate = await zkCreditScoring.estimateGas.registerUser({ from: signer.address });
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

      // Check contract state
      const owner = await zkCreditScoring.owner();
      console.log(`📋 Contract owner: ${owner}`);
    } catch (error) {
      console.error("❌ Gas estimation failed:", error);
    }
  } else {
    console.log("\n⚠️  User is already registered!");
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
