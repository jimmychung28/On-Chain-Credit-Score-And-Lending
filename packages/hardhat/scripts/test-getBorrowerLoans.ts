import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing getBorrowerLoans function...");

  const userAddress = "0x2c827c3E27744B1D83df71000F6c3B7FC59Fa0A1";
  console.log(`📍 User Address: ${userAddress}`);

  // Get the deployed contract
  const zkCreditLending = await ethers.getContractAt("ZKCreditLending", "0x31403b1e52051883f2Ce1B1b4C89f36034e1221D");

  try {
    console.log("\n1️⃣ Testing getBorrowerLoans function...");
    const borrowerLoans = await zkCreditLending.getBorrowerLoans(userAddress);
    console.log("✅ getBorrowerLoans result:", borrowerLoans);
    console.log(
      "✅ Loan IDs:",
      borrowerLoans.map((id: any) => id.toString()),
    );
    console.log("✅ Number of loans:", borrowerLoans.length);

    console.log("\n2️⃣ Testing getBorrowerLoanCount function...");
    const loanCount = await zkCreditLending.getBorrowerLoanCount(userAddress);
    console.log("✅ getBorrowerLoanCount result:", loanCount.toString());

    // Test each loan individually
    console.log("\n3️⃣ Testing individual loan details...");
    for (let i = 0; i < borrowerLoans.length; i++) {
      const loanId = borrowerLoans[i];
      console.log(`\n💰 Loan ID ${loanId.toString()}:`);

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
    }

    // Test ABI structure
    console.log("\n4️⃣ Testing contract interface...");
    const contractInterface = zkCreditLending.interface;
    const getBorrowerLoansFunc = contractInterface.getFunction("getBorrowerLoans");
    console.log("✅ getBorrowerLoans function signature:", getBorrowerLoansFunc.format());
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
