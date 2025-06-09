import { ethers } from "hardhat";

async function main() {
  const zkLendingAddress = "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6"; // New contract
  const userAddress = "0x93d480c32913EDAa976b587FDf10345cA7CF9987";

  console.log(`Checking recent loan activity for: ${userAddress}`);
  console.log(`ZK Lending Contract: ${zkLendingAddress}`);

  const zkLending = await ethers.getContractAt("ZKCreditLending", zkLendingAddress);

  try {
    // Check current loans first
    console.log("\n=== CURRENT LOANS ===");
    const borrowerLoans = await zkLending.getBorrowerLoans(userAddress);
    console.log("Current loans count:", borrowerLoans.length);

    // Check recent LoanRequested events
    console.log("\n=== CHECKING LOAN REQUESTED EVENTS ===");
    const filter = zkLending.filters.LoanRequested(undefined, userAddress);
    const events = await zkLending.queryFilter(filter, -1000); // Last 1000 blocks

    console.log(`Found ${events.length} LoanRequested events for this user:`);
    for (const event of events) {
      console.log(`- Loan ID: ${event.args[0]}, Block: ${event.blockNumber}`);
    }

    // Check recent LoanApproved events
    console.log("\n=== CHECKING LOAN APPROVED EVENTS ===");
    const approvedFilter = zkLending.filters.LoanApproved();
    const approvedEvents = await zkLending.queryFilter(approvedFilter, -1000);

    console.log(`Found ${approvedEvents.length} LoanApproved events total`);
    for (const event of approvedEvents) {
      console.log(`- Loan ID: ${event.args[0]}, Rate: ${event.args[1]}, Block: ${event.blockNumber}`);
    }

    // Check the next loan ID to see if any loans were created
    console.log("\n=== LOAN COUNTER ===");
    const nextLoanId = await zkLending.nextLoanId();
    console.log("Next loan ID:", nextLoanId.toString());
    console.log("Total loans created:", Number(nextLoanId) - 1);

    // Check pool status
    console.log("\n=== POOL STATUS ===");
    const poolInfo = await zkLending.getPoolInfo();
    console.log("Pool info:", {
      totalFunds: ethers.formatEther(poolInfo[0]),
      availableFunds: ethers.formatEther(poolInfo[1]),
      totalLoaned: ethers.formatEther(poolInfo[2]),
      utilization: poolInfo[3].toString(),
      totalInterestEarned: ethers.formatEther(poolInfo[4]),
    });

    // Check user's credit profile
    console.log("\n=== USER CREDIT PROFILE ===");
    const zkScoringAddress = "0xF8b299F87EBb62E0b625eAF440B73Cc6b7717dbd";
    const zkScoring = await ethers.getContractAt("ZKCreditScoring", zkScoringAddress);

    const profile = await zkScoring.getCreditProfile(userAddress);
    console.log("Credit profile:", {
      score: profile[0].toString(),
      lastUpdated: new Date(Number(profile[1]) * 1000).toISOString(),
      isActive: profile[2],
      privacyLevel: profile[3],
      isVerified: profile[4],
    });
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
