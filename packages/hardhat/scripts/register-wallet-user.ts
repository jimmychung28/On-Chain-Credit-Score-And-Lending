import { ethers } from "hardhat";

async function main() {
  console.log("🔐 Registering wallet user in ZK system...");

  // Get the default wallet address (first signer is the one in MetaMask)
  const [defaultWallet] = await ethers.getSigners();
  const userAddress = defaultWallet.address;

  console.log(`👤 Registering user: ${userAddress}`);

  // Get deployed ZK contracts
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring");
  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);

  // Check if user is already registered
  try {
    const profile = await zkCreditScoring.getCreditProfile(userAddress);
    if (profile.isActive) {
      console.log("✅ User is already registered!");
      console.log(`Credit Score: ${profile.score}`);
      console.log(`Privacy Level: ${profile.privacyLevel} (5 = Maximum Privacy)`);
      console.log(`Is Verified: ${profile.isVerified}`);

      // Check transparency premium
      const premium = await zkCreditScoring.getTransparencyPremium(userAddress);
      console.log(`Transparency Premium: ${Number(premium) / 100}% (0% = FREE)`);
      return;
    }
  } catch {
    // User not registered yet
  }

  // Register the user
  console.log("📝 Registering user with maximum privacy...");
  try {
    const tx = await zkCreditScoring.registerUser();
    await tx.wait();
    console.log("✅ User registered successfully!");

    const profile = await zkCreditScoring.getCreditProfile(userAddress);
    console.log(`Credit Score: ${profile.score}`);
    console.log(`Privacy Level: ${profile.privacyLevel} (5 = Maximum Privacy)`);
    console.log(`Is Verified: ${profile.isVerified}`);

    const premium = await zkCreditScoring.getTransparencyPremium(userAddress);
    console.log(`Transparency Premium: ${Number(premium) / 100}% (0% = FREE)`);

    console.log("\n🎉 User is now ready to use the ZK privacy system!");
    console.log("🌐 Visit http://localhost:3000/credit-scoring to see your profile");
  } catch (error) {
    console.error("❌ Registration failed:", error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
