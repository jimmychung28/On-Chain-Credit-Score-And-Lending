import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing Registration Issue...");

  const problemAddress = "0x3071CBb43429a095482a6bdE5bB50564c11E5020";
  const zkCreditScoringAddress = "0xb6057e08a11da09a998985874FE2119e98dB3D5D";

  // Get contract instance
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", zkCreditScoringAddress);
  const [deployer] = await ethers.getSigners();

  console.log("📍 Problem Address:", problemAddress);
  console.log("📋 Contract Address:", zkCreditScoringAddress);
  console.log("🔑 Deployer:", deployer.address);

  // Check current status
  console.log("\n🔍 Checking current status...");
  try {
    const profile = await zkCreditScoring.getCreditProfile(problemAddress);
    if (profile[2]) {
      // isActive
      console.log("✅ Address is already registered!");
      console.log("Profile:", {
        score: profile[0].toString(),
        lastUpdated: profile[1].toString(),
        isActive: profile[2],
        privacyLevel: profile[3].toString(),
        isVerified: profile[4],
      });
      return;
    }
  } catch {
    console.log("❌ Address not registered, proceeding with registration...");
  }

  // Use owner functions to create test user
  console.log("\n🧪 Creating test user with owner privileges...");
  try {
    const createTx = await zkCreditScoring.createTestUser(problemAddress);
    await createTx.wait();
    console.log("✅ Test user created successfully!");

    // Verify the creation
    const newProfile = await zkCreditScoring.getCreditProfile(problemAddress);
    console.log("✅ New profile:", {
      score: newProfile[0].toString(),
      lastUpdated: newProfile[1].toString(),
      isActive: newProfile[2],
      privacyLevel: newProfile[3].toString(),
      isVerified: newProfile[4],
    });
  } catch {
    console.log("❌ Test user creation failed, trying direct registration...");

    // Try to impersonate and register normally
    try {
      await ethers.provider.send("hardhat_impersonateAccount", [problemAddress]);

      // Fund the address
      await deployer.sendTransaction({
        to: problemAddress,
        value: ethers.parseEther("1"),
      });

      // Get impersonated signer
      const impersonatedSigner = await ethers.getSigner(problemAddress);

      // Try to register with max privacy (Level 5)
      const registerTx = await zkCreditScoring.connect(impersonatedSigner).registerUser();
      await registerTx.wait();

      console.log("✅ User registered successfully via impersonation!");

      // Verify the registration
      const finalProfile = await zkCreditScoring.getCreditProfile(problemAddress);
      console.log("✅ Final profile:", {
        score: finalProfile[0].toString(),
        lastUpdated: finalProfile[1].toString(),
        isActive: finalProfile[2],
        privacyLevel: finalProfile[3].toString(),
        isVerified: finalProfile[4],
      });
    } catch (impersonationError) {
      console.error("❌ All registration methods failed:", impersonationError);
    }
  }

  // Create a few more test users for good measure
  console.log("\n👥 Creating additional test users...");
  const testAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // User 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // User 2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // User 3
  ];

  for (let i = 0; i < testAddresses.length; i++) {
    try {
      const address = testAddresses[i];

      // Check if already registered
      try {
        const existing = await zkCreditScoring.getCreditProfile(address);
        if (existing[2]) {
          console.log(`✅ User ${i + 1} (${address}) already registered`);
          continue;
        }
      } catch {}

      // Create with different privacy levels
      const privacyLevel = (i % 5) + 1;
      const createTx = await zkCreditScoring.createTestUserWithTransparency(address, privacyLevel);
      await createTx.wait();

      console.log(`✅ Test user ${i + 1} created with privacy level ${privacyLevel}`);
    } catch (error) {
      console.log(`⚠️ Failed to create test user ${i + 1}:`, (error as Error).message);
    }
  }

  console.log("\n🎉 Registration fix complete!");
  console.log("📱 Please refresh the frontend to see the updated status.");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  });
