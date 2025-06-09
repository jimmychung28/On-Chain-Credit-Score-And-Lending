import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get the deployed CreditScoring contract
  const creditScoring = (await ethers.getContract("CreditScoring", deployer)) as any;

  const testAddress = "0x010C5E560D0e042B53Cedba9A7404E90F82D7592";

  console.log("Simple credit setup for:", testAddress);

  try {
    // Check if user is registered
    const profile = await creditScoring.getCreditProfile(testAddress);
    console.log("Current credit score:", profile.score.toString());

    // Record some good transactions to improve score
    console.log("Recording positive transactions...");

    for (let i = 0; i < 10; i++) {
      const tx = await creditScoring.recordTransaction(
        testAddress,
        ethers.parseEther("1"), // 1 ETH transaction
        deployer.address,
      );
      await tx.wait();
      console.log(`Transaction ${i + 1}/10 recorded`);
    }

    // Record some successful loan repayments
    console.log("Recording successful loan repayments...");

    for (let i = 0; i < 3; i++) {
      const tx = await creditScoring.recordLoan(
        testAddress,
        ethers.parseEther("5"), // 5 ETH loan
        true, // successfully repaid
      );
      await tx.wait();
      console.log(`Loan repayment ${i + 1}/3 recorded`);
    }

    // Check final score
    const finalProfile = await creditScoring.getCreditProfile(testAddress);
    console.log("✅ Final credit score:", finalProfile.score.toString());
    console.log("Total volume:", ethers.formatEther(finalProfile.totalVolume), "ETH");
    console.log("Transaction count:", finalProfile.transactionCount.toString());
    console.log("Repaid loans:", finalProfile.repaidLoans.toString());
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
