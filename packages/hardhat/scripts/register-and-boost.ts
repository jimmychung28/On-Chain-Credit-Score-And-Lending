import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get the deployed CreditScoring contract
  const creditScoring = (await ethers.getContract("CreditScoring", deployer)) as any;

  const testAddress = "0x86e04523546Ca4b045C000a04a7a62394258C61E";

  console.log("Registering and boosting credit for:", testAddress);
  console.log("Deployer address:", deployer.address);

  try {
    // First, check if user is already registered
    let isRegistered = false;
    try {
      const profile = await creditScoring.getCreditProfile(testAddress);
      console.log("User already registered with score:", profile.score.toString());
      isRegistered = true;
    } catch {
      console.log("User not registered. Using createTestUser to register with excellent credit...");

      // Use createTestUser to register with excellent credit immediately
      const createTx = await creditScoring.createTestUser(testAddress);
      await createTx.wait();
      console.log("✅ User registered with excellent credit profile!");
      isRegistered = true;
    }

    if (isRegistered) {
      // Check current block number
      const currentBlock = await ethers.provider.getBlockNumber();
      console.log("Current block number:", currentBlock);

      // Now use setTestCreditProfile to fine-tune the credit score
      console.log("Maximizing credit profile for 750+ excellent credit...");
      const tx = await creditScoring.setTestCreditProfile(
        testAddress,
        ethers.parseEther("2000"), // 2000 ETH total volume (maximum)
        500, // 500 transactions (maximum activity)
        Math.min(2500000, currentBlock), // Account age: either 1+ year or current block
        100, // 100 repaid loans (perfect history)
        0, // 0 defaulted loans (perfect record)
      );
      await tx.wait();
      console.log("✅ Credit profile maximized for excellent credit!");
    }

    // Get final profile
    const finalProfile = await creditScoring.getCreditProfile(testAddress);
    console.log("\n🎉 Final Credit Profile:");
    console.log("Credit Score:", finalProfile.score.toString());
    console.log("Total Volume:", ethers.formatEther(finalProfile.totalVolume), "ETH");
    console.log("Transaction Count:", finalProfile.transactionCount.toString());
    console.log("Account Age:", finalProfile.accountAge.toString(), "blocks");
    console.log("Repaid Loans:", finalProfile.repaidLoans.toString());
    console.log("Defaulted Loans:", finalProfile.defaultedLoans.toString());

    // Determine interest rate based on score
    const score = Number(finalProfile.score);
    let interestRate;
    if (score >= 750) interestRate = "3%";
    else if (score >= 700) interestRate = "5%";
    else if (score >= 650) interestRate = "8%";
    else if (score >= 600) interestRate = "11%";
    else if (score >= 500) interestRate = "15%";
    else if (score >= 450) interestRate = "20%";
    else if (score >= 400) interestRate = "30%";
    else if (score >= 350) interestRate = "50%";
    else if (score >= 320) interestRate = "70%";
    else interestRate = "100%";

    console.log("\n💰 Loan Eligibility:");
    console.log("Interest Rate:", interestRate);
    console.log("Max Loan Amount: 100 ETH");
    console.log("Loan Duration: 30 days");

    if (score >= 750) {
      console.log("🎉 EXCELLENT! You have excellent credit (750+) with 3% interest!");
    } else if (score >= 650) {
      console.log("🎉 GREAT! You have good credit (650+) with low interest rates!");
    } else if (score >= 600) {
      console.log("✅ Good! You have fair credit (600+) with reasonable rates.");
    } else {
      console.log("⚠️  Credit improved but could be better. Keep building!");
    }

    console.log("\n🚀 Ready to test at: http://localhost:3001/credit-scoring");
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
