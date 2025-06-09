import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get the deployed CreditScoring contract
  const creditScoring = (await ethers.getContract("CreditScoring", deployer)) as any;

  const testAddress = "0x010C5E560D0e042B53Cedba9A7404E90F82D7592";

  console.log("Creating test user with excellent credit for:", testAddress);
  console.log("Deployer address:", deployer.address);

  try {
    // Check if user is already registered
    let isRegistered = false;
    try {
      const profile = await creditScoring.getCreditProfile(testAddress);
      console.log("User already registered with score:", profile.score.toString());
      isRegistered = true;

      // If user is already registered, we can't use createTestUser
      console.log("❌ User already exists. Cannot use createTestUser.");
      console.log("Let me try a different approach...");

      // Instead, let's try to directly record some good activity
      console.log("Attempting to record positive activities...");

      // Try to add some verified addresses first
      console.log("Adding deployer as verified address...");
      const addVerifiedTx = await creditScoring.addVerifiedAddress(deployer.address);
      await addVerifiedTx.wait();
      console.log("✅ Deployer added as verified address");

      // Now try to record transactions as verified address
      for (let i = 0; i < 3; i++) {
        try {
          const tx = await creditScoring.recordTransaction(
            testAddress,
            ethers.parseEther("5"), // 5 ETH transaction
            testAddress, // counterparty
          );
          await tx.wait();
          console.log(`✅ Transaction ${i + 1}/3 recorded`);
        } catch (error: any) {
          console.log(`❌ Transaction ${i + 1} failed:`, error.message.split("\n")[0]);
        }
      }

      // Try to record some successful loans
      for (let i = 0; i < 2; i++) {
        try {
          const tx = await creditScoring.recordLoan(
            testAddress,
            ethers.parseEther("3"), // 3 ETH loan
            true, // successfully repaid
          );
          await tx.wait();
          console.log(`✅ Successful loan ${i + 1}/2 recorded`);
        } catch (error: any) {
          console.log(`❌ Loan ${i + 1} failed:`, error.message.split("\n")[0]);
        }
      }
    } catch {
      console.log("User not registered. Creating new test user...");
      isRegistered = false;
    }

    if (!isRegistered) {
      // Create test user with excellent credit
      console.log("Creating test user with excellent credit profile...");
      const tx = await creditScoring.createTestUser(testAddress);
      await tx.wait();
      console.log("✅ Test user created successfully!");
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
