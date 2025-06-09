import { ethers } from "hardhat";

async function main() {
  const userAddress = "0x93d480c32913EDAa976b587FDf10345cA7CF9987";
  const zkScoringAddress = "0xF8b299F87EBb62E0b625eAF440B73Cc6b7717dbd";

  console.log(`Checking profile for user: ${userAddress}`);
  console.log(`ZK Contract: ${zkScoringAddress}`);

  const zkScoring = await ethers.getContractAt("ZKCreditScoring", zkScoringAddress);

  try {
    const profile = await zkScoring.getCreditProfile(userAddress);
    console.log("\n=== CREDIT PROFILE ===");
    console.log(`Score: ${profile[0]}`);
    console.log(`Last Updated: ${profile[1]} (${new Date(Number(profile[1]) * 1000).toISOString()})`);
    console.log(`Is Active: ${profile[2]}`);
    console.log(`Privacy Level: ${profile[3]}`);
    console.log(`Is Verified: ${profile[4]}`);

    // Check if eligible for loan
    const isEligible = await zkScoring.isEligibleForLoan(userAddress, 500);
    console.log(`\nLoan Eligible (min 500): ${isEligible}`);

    // Check transparency premium
    const premium = await zkScoring.getTransparencyPremium(userAddress);
    console.log(`Transparency Premium: ${premium} basis points`);
  } catch (error) {
    console.error("Error checking profile:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
