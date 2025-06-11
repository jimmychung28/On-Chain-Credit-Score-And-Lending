import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking user state in ZK system...");

  const [defaultWallet] = await ethers.getSigners();
  const userAddress = defaultWallet.address;

  console.log(`👤 Checking user: ${userAddress}`);

  // Get deployed ZK contracts
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring");
  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);

  // Check user profile
  try {
    const profile = await zkCreditScoring.getCreditProfile(userAddress);
    console.log("📊 Credit Profile (tuple format):");
    console.log(`  [0] Score: ${profile[0]}`);
    console.log(`  [1] Last Updated: ${profile[1]}`);
    console.log(`  [2] Is Active: ${profile[2]}`);
    console.log(`  [3] Privacy Level: ${profile[3]}`);
    console.log(`  [4] Is Verified: ${profile[4]}`);

    console.log("\n🎯 Frontend will interpret:");
    console.log(`  isRegistered = ${!!(profile && profile[2] === true)}`);
    console.log(`  creditScore = ${profile[2] ? Number(profile[0]) : 0}`);

    const premium = await zkCreditScoring.getTransparencyPremium(userAddress);
    console.log(`  transparencyPremium = ${Number(premium) / 100}%`);
  } catch (error) {
    console.error("❌ Failed to get profile:", error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
