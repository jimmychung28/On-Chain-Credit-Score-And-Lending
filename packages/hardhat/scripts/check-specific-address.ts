import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking specific address profile...");

  const userAddress = "0x2c827c3E27744B1D83df71000F6c3B7FC59Fa0A1";
  console.log(`📍 User Address: ${userAddress}`);

  // Get the deployed contract
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", "0xb6057e08a11da09a998985874FE2119e98dB3D5D");

  try {
    console.log("\n1️⃣ Testing getCreditProfile function...");
    const profileResult = await zkCreditScoring.getCreditProfile(userAddress);
    console.log("✅ Profile result:", {
      score: profileResult.score.toString(),
      lastUpdated: profileResult.lastUpdated.toString(),
      isActive: profileResult.isActive,
      privacyLevel: profileResult.privacyLevel.toString(),
      isVerified: profileResult.isVerified,
    });

    console.log("\n2️⃣ Testing raw creditProfiles mapping...");
    const rawProfile = await zkCreditScoring.creditProfiles(userAddress);
    console.log("✅ Raw profile:", {
      score: rawProfile.score.toString(),
      lastUpdated: rawProfile.lastUpdated.toString(),
      isActive: rawProfile.isActive,
      dataCommitment: rawProfile.dataCommitment,
      privacyLevel: rawProfile.privacyLevel.toString(),
      isVerified: rawProfile.isVerified,
    });

    // Check loan eligibility
    console.log("\n3️⃣ Testing loan system...");
    const zkCreditLending = await ethers.getContractAt("ZKCreditLending", "0x31403b1e52051883f2Ce1B1b4C89f36034e1221D");

    const eligibility = await zkCreditLending.checkLoanEligibility(userAddress, ethers.parseEther("1"));
    console.log("✅ Loan eligibility:", {
      eligible: eligibility.eligible,
      maxAmount: ethers.formatEther(eligibility.maxAmount),
      estimatedRate: eligibility.estimatedRate.toString(),
      privacyLevel: eligibility.privacyLevel.toString(),
      transparencyPremium: eligibility.transparencyPremium.toString(),
    });

    // Check current loans
    console.log("\n4️⃣ Checking existing loans...");
    const loans = await zkCreditLending.getBorrowerLoans(userAddress);
    console.log(
      "✅ User loans:",
      loans.map(id => id.toString()),
    );

    // Check pool info
    console.log("\n5️⃣ Checking pool info...");
    const poolInfo = await zkCreditLending.getPoolInfo();
    console.log("✅ Pool info:", {
      totalFunds: ethers.formatEther(poolInfo.totalFunds),
      availableFunds: ethers.formatEther(poolInfo.availableFunds),
      utilization: poolInfo.utilization.toString(),
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
