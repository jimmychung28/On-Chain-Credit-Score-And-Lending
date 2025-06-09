import { ethers } from "hardhat";

async function main() {
  const zkLendingAddress = "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6"; // Clean ZK contract address
  const userAddress = "0x93d480c32913EDAa976b587FDf10345cA7CF9987"; // The user who took out a loan

  console.log(`Checking loans for user: ${userAddress}`);
  console.log(`ZK Lending Contract: ${zkLendingAddress}`);

  const zkLending = await ethers.getContractAt("ZKCreditLending", zkLendingAddress);

  try {
    // Use the new getBorrowerLoans function
    console.log("\n=== CALLING getBorrowerLoans ===");
    const borrowerLoans = await zkLending.getBorrowerLoans(userAddress);
    console.log("getBorrowerLoans result:", borrowerLoans);
    console.log("Type:", typeof borrowerLoans);
    console.log("Is Array:", Array.isArray(borrowerLoans));
    console.log("Length:", borrowerLoans.length);

    if (borrowerLoans.length > 0) {
      console.log("\n=== LOAN DETAILS ===");
      for (let i = 0; i < borrowerLoans.length; i++) {
        const loanId = borrowerLoans[i];
        console.log(`\nLoan ID ${i}: ${loanId}`);

        try {
          const loanDetails = await zkLending.getLoanDetails(loanId);
          console.log("Loan Details:", {
            amount: ethers.formatEther(loanDetails[0]),
            interestRate: loanDetails[1].toString(),
            dueDate: new Date(Number(loanDetails[2]) * 1000).toISOString(),
            isActive: loanDetails[3],
            isRepaid: loanDetails[4],
            privacyLevel: loanDetails[5],
            transparencyPremium: loanDetails[6].toString(),
          });
        } catch (error: any) {
          console.log(`Error getting details for loan ${loanId}:`, error.message);
        }
      }
    } else {
      console.log("No loans found for this user");
    }
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
