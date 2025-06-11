import { ethers } from "hardhat";

async function main() {
  console.log("🔄 Testing fresh user registration...");

  // Use wallet addresses that might connect from frontend
  const testAddresses = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Default hardhat account
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Second hardhat account
  ];

  // Get deployed ZK contracts
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring");
  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);

  for (const address of testAddresses) {
    console.log(`\n🔍 Checking user: ${address}`);

    try {
      const profile = await zkCreditScoring.getCreditProfile(address);
      console.log(`  Profile: [${profile[0]}, ${profile[1]}, ${profile[2]}, ${profile[3]}, ${profile[4]}]`);
      console.log(`  Is Registered: ${profile[2]}`);

      if (profile[2]) {
        const premium = await zkCreditScoring.getTransparencyPremium(address);
        console.log(`  Transparency Premium: ${Number(premium) / 100}%`);
      }
    } catch (error) {
      console.log(`  ❌ Error getting profile: ${error}`);
    }
  }

  console.log("\n💡 If frontend is stuck, try connecting with a different wallet address");
  console.log("💡 Or clear browser cache/localStorage to reset wallet connection");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
