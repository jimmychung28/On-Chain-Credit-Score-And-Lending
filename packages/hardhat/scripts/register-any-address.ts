import { ethers } from "hardhat";

async function main() {
  // For now, hardcode the current problematic address
  const addressToRegister = "0x3071CBb43429a095482a6bdE5bB50564c11E5020";
  const privacyLevel = 5; // Default to max privacy

  console.log("🔧 Registering Address:", addressToRegister);
  console.log("🔒 Privacy Level:", privacyLevel);

  const zkCreditScoringAddress = "0xb6057e08a11da09a998985874FE2119e98dB3D5D";

  // Get contract instance
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", zkCreditScoringAddress);
  const [deployer] = await ethers.getSigners();

  // Validate address format
  if (!ethers.isAddress(addressToRegister)) {
    console.error("❌ Invalid Ethereum address format");
    process.exit(1);
  }

  // Validate privacy level
  if (privacyLevel < 1 || privacyLevel > 5) {
    console.error("❌ Privacy level must be between 1 and 5");
    process.exit(1);
  }

  // Check current status
  console.log("\n🔍 Checking current status...");
  try {
    const profile = await zkCreditScoring.getCreditProfile(addressToRegister);
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

      // Update privacy level if different
      if (Number(profile[3]) !== privacyLevel) {
        console.log(`\n🔄 Updating privacy level from ${profile[3]} to ${privacyLevel}...`);
        try {
          // Impersonate to update privacy level
          await ethers.provider.send("hardhat_impersonateAccount", [addressToRegister]);

          // Fund the address
          await deployer.sendTransaction({
            to: addressToRegister,
            value: ethers.parseEther("0.1"),
          });

          const impersonatedSigner = await ethers.getSigner(addressToRegister);

          const updateTx = await zkCreditScoring.connect(impersonatedSigner).updateTransparencyLevel(privacyLevel);
          await updateTx.wait();

          console.log("✅ Privacy level updated successfully!");
        } catch (updateError) {
          console.log("⚠️ Failed to update privacy level:", (updateError as Error).message);
        }
      }

      return;
    }
  } catch {
    console.log("❌ Address not registered, proceeding with registration...");
  }

  // Register the address
  console.log("\n🧪 Creating test user with owner privileges...");
  try {
    let createTx;

    if (privacyLevel === 5) {
      createTx = await zkCreditScoring.createTestUser(addressToRegister);
    } else {
      createTx = await zkCreditScoring.createTestUserWithTransparency(addressToRegister, privacyLevel);
    }

    await createTx.wait();
    console.log("✅ User registered successfully!");

    // Verify the creation
    const newProfile = await zkCreditScoring.getCreditProfile(addressToRegister);
    console.log("✅ New profile:", {
      address: addressToRegister,
      score: newProfile[0].toString(),
      lastUpdated: newProfile[1].toString(),
      isActive: newProfile[2],
      privacyLevel: newProfile[3].toString(),
      isVerified: newProfile[4],
    });

    // Also check transparency premium
    const premium = await zkCreditScoring.getTransparencyPremium(addressToRegister);
    console.log("💰 Transparency Premium:", premium.toString(), "basis points");
  } catch (error) {
    console.error("❌ Registration failed:", error);
    process.exit(1);
  }

  console.log("\n🎉 Registration complete!");
  console.log("📱 The address should now work properly in the frontend.");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
