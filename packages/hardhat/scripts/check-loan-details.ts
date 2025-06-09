import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking loan details...");

  const userAddress = "0x2c827c3E27744B1D83df71000F6c3B7FC59Fa0A1";
  const loanId = 1;

  console.log(`📍 User Address: ${userAddress}`);
  console.log(`🆔 Loan ID: ${loanId}`);

  // Get the deployed contract
  const zkCreditLending = await ethers.getContractAt("ZKCreditLending", "0x31403b1e52051883f2Ce1B1b4C89f36034e1221D");

  try {
    console.log("\n💰 Getting loan details...");
    const loanDetails = await zkCreditLending.getLoanDetails(loanId);
    console.log("✅ Loan Details:", {
      amount: ethers.formatEther(loanDetails.amount) + " ETH",
      interestRate: (Number(loanDetails.interestRate) / 100).toFixed(2) + "%",
      dueDate: new Date(Number(loanDetails.dueDate) * 1000).toLocaleString(),
      isActive: loanDetails.isActive,
      isRepaid: loanDetails.isRepaid,
      privacyLevel: loanDetails.privacyLevel.toString(),
      transparencyPremium: loanDetails.transparencyPremium.toString(),
    });

    // Get full loan data from mapping
    console.log("\n📋 Getting full loan data...");
    const loan = await zkCreditLending.loans(loanId);
    console.log("✅ Full Loan Data:", {
      amount: ethers.formatEther(loan.amount) + " ETH",
      interestRate: (Number(loan.interestRate) / 100).toFixed(2) + "%",
      duration: Number(loan.duration) / (24 * 60 * 60) + " days",
      startTime: new Date(Number(loan.startTime) * 1000).toLocaleString(),
      dueDate: new Date(Number(loan.dueDate) * 1000).toLocaleString(),
      isActive: loan.isActive,
      isRepaid: loan.isRepaid,
      amountRepaid: ethers.formatEther(loan.amountRepaid) + " ETH",
      borrower: loan.borrower,
      privacyLevel: loan.privacyLevel.toString(),
      transparencyPremium: loan.transparencyPremium.toString(),
    });

    // Check all loans for this user
    console.log("\n📃 All user loans...");
    const userLoans = await zkCreditLending.getBorrowerLoans(userAddress);
    console.log(
      "✅ User loan IDs:",
      userLoans.map(id => id.toString()),
    );

    // Check lending contract info
    console.log("\n🏦 Lending contract info...");
    const poolInfo = await zkCreditLending.getPoolInfo();
    console.log("✅ Pool Info:", {
      totalFunds: ethers.formatEther(poolInfo.totalFunds) + " ETH",
      availableFunds: ethers.formatEther(poolInfo.availableFunds) + " ETH",
      totalLoaned: ethers.formatEther(poolInfo.totalLoaned) + " ETH",
      utilization: poolInfo.utilization.toString() + "%",
      totalInterestEarned: ethers.formatEther(poolInfo.totalInterestEarned) + " ETH",
    });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
