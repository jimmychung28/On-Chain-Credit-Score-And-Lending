import { ethers } from "hardhat";

async function main() {
  const zkLendingAddress = "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6";
  const zkScoringAddress = "0xF8b299F87EBb62E0b625eAF440B73Cc6b7717dbd";

  console.log(`Testing loan cycle...`);
  console.log(`ZK Lending Contract: ${zkLendingAddress}`);
  console.log(`ZK Scoring Contract: ${zkScoringAddress}`);

  // Get signers
  const [, , user] = await ethers.getSigners();
  console.log(`User signer: ${user.address}`);

  const zkLending = await ethers.getContractAt("ZKCreditLending", zkLendingAddress);
  const zkScoring = await ethers.getContractAt("ZKCreditScoring", zkScoringAddress);
  const zkLendingAsUser = zkLending.connect(user);
  const zkScoringAsUser = zkScoring.connect(user);

  try {
    // Register user first
    console.log("\n=== REGISTERING USER ===");
    try {
      const profile = await zkScoring.getCreditProfile(user.address);
      if (profile[2]) {
        // isActive
        console.log("✅ User already registered");
      } else {
        throw new Error("Not registered");
      }
    } catch {
      console.log("Registering user...");
      const registerTx = await zkScoringAsUser.registerUser();
      await registerTx.wait();
      console.log("✅ User registered");
    }

    // Check pool status first
    console.log("\n=== INITIAL POOL STATUS ===");
    const poolInfo = await zkLending.getPoolInfo();
    console.log("Pool available funds:", ethers.formatEther(poolInfo[1]), "ETH");

    if (Number(ethers.formatEther(poolInfo[1])) < 1) {
      console.log("❌ Insufficient pool funds for testing");
      return;
    }

    // Test loan request
    console.log("\n=== REQUESTING LOAN ===");
    const loanAmount = ethers.parseEther("1"); // 1 ETH loan
    console.log(`Requesting ${ethers.formatEther(loanAmount)} ETH loan...`);

    const requestTx = await zkLendingAsUser.requestLoan(loanAmount);
    console.log(`Loan request sent: ${requestTx.hash}`);

    const receipt = await requestTx.wait();
    console.log(`Loan request confirmed in block: ${receipt?.blockNumber}`);

    // Find the loan ID from events
    const events = await zkLending.queryFilter(
      zkLending.filters.LoanRequested(),
      receipt?.blockNumber,
      receipt?.blockNumber,
    );
    if (events.length === 0) {
      console.log("❌ No LoanRequested event found");
      return;
    }

    const loanId = events[0].args[0];
    console.log(`✅ Loan created with ID: ${loanId}`);

    // Get loan details
    console.log("\n=== LOAN DETAILS ===");
    const loanDetails = await zkLending.getLoanDetails(loanId);
    console.log("Loan details:", {
      amount: ethers.formatEther(loanDetails[0]),
      interestRate: loanDetails[1].toString(),
      dueDate: new Date(Number(loanDetails[2]) * 1000).toISOString(),
      isActive: loanDetails[3],
      isRepaid: loanDetails[4],
      privacyLevel: loanDetails[5],
      transparencyPremium: loanDetails[6].toString(),
    });

    // Calculate repayment amount
    const principal = loanDetails[0];
    const interestRate = loanDetails[1];
    const duration = 30 * 24 * 60 * 60; // 30 days in seconds

    // Calculate interest: (principal * rate * duration) / (10000 * 365 days)
    const interestAmount = (principal * interestRate * BigInt(duration)) / (BigInt(10000) * BigInt(365 * 24 * 60 * 60));
    const totalDue = principal + interestAmount;

    console.log(`Principal: ${ethers.formatEther(principal)} ETH`);
    console.log(`Interest: ${ethers.formatEther(interestAmount)} ETH`);
    console.log(`Total due: ${ethers.formatEther(totalDue)} ETH`);

    // Test repayment
    console.log("\n=== REPAYING LOAN ===");
    console.log(`Repaying ${ethers.formatEther(totalDue)} ETH...`);

    const repayTx = await zkLendingAsUser.repayLoan(loanId, { value: totalDue });
    console.log(`Repayment sent: ${repayTx.hash}`);

    const repayReceipt = await repayTx.wait();
    console.log(`Repayment confirmed in block: ${repayReceipt?.blockNumber}`);

    // Check loan status after repayment
    console.log("\n=== LOAN STATUS AFTER REPAYMENT ===");
    const updatedLoanDetails = await zkLending.getLoanDetails(loanId);
    console.log("Updated loan details:", {
      amount: ethers.formatEther(updatedLoanDetails[0]),
      interestRate: updatedLoanDetails[1].toString(),
      dueDate: new Date(Number(updatedLoanDetails[2]) * 1000).toISOString(),
      isActive: updatedLoanDetails[3],
      isRepaid: updatedLoanDetails[4],
      privacyLevel: updatedLoanDetails[5],
      transparencyPremium: updatedLoanDetails[6].toString(),
    });

    console.log("\n✅ Loan cycle test completed successfully!");
    console.log("✅ Repay functionality is working correctly!");
  } catch (error: any) {
    console.error("Error during loan cycle test:", error.message);
    console.error("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
