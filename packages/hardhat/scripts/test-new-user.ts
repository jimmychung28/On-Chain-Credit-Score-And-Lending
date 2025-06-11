import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing registration with a fresh user...");

  // Use a different signer (not the default one)
  const [deployer, newUser] = await ethers.getSigners();
  console.log(`👤 Testing with new user: ${newUser.address}`);

  // Get deployed ZK contracts
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring", deployer);
  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);

  // Check if this user is registered
  try {
    const profile = await zkCreditScoring.getCreditProfile(newUser.address);
    if (profile[2]) {
      // isActive
      console.log("✅ User is already registered!");
      return;
    }
  } catch {
    // User not registered yet, which is expected
  }

  console.log("🔍 User not found, checking profile response for unregistered user...");

  try {
    const profile = await zkCreditScoring.getCreditProfile(newUser.address);
    console.log("📊 Unregistered user profile:");
    console.log(`  [0] Score: ${profile[0]}`);
    console.log(`  [1] Last Updated: ${profile[1]}`);
    console.log(`  [2] Is Active: ${profile[2]}`);
    console.log(`  [3] Privacy Level: ${profile[3]}`);
    console.log(`  [4] Is Verified: ${profile[4]}`);

    console.log("\n🎯 Frontend will interpret:");
    console.log(`  isRegistered = ${!!(profile && profile[2] === true)}`);
  } catch {
    console.log("❌ getCreditProfile reverts for unregistered users");
    console.log("This means the frontend should handle this error gracefully");
  }

  // Now register the user
  console.log("\n📝 Registering new user...");
  try {
    const tx = await zkCreditScoring.connect(newUser).registerUser();
    await tx.wait();
    console.log("✅ Registration successful!");

    const profile = await zkCreditScoring.getCreditProfile(newUser.address);
    console.log("📊 After registration:");
    console.log(`  [0] Score: ${profile[0]}`);
    console.log(`  [1] Last Updated: ${profile[1]}`);
    console.log(`  [2] Is Active: ${profile[2]}`);
    console.log(`  [3] Privacy Level: ${profile[3]}`);
    console.log(`  [4] Is Verified: ${profile[4]}`);
  } catch (error) {
    console.error("❌ Registration failed:", error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
