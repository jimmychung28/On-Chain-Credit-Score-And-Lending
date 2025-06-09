import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get the deployed CreditScoring contract
  const creditScoring = (await ethers.getContract("CreditScoring", deployer)) as any;

  const testAddress = "0x010C5E560D0e042B53Cedba9A7404E90F82D7592";

  console.log("Setting up test credit data for:", testAddress);
  console.log("Deployer address:", deployer.address);

  try {
    // Check if user is already registered
    let profile;
    try {
      profile = await creditScoring.getCreditProfile(testAddress);
      console.log("User already registered with score:", profile.score.toString());
    } catch {
      // User not registered
      console.log("❌ User not registered yet.");
      console.log("\nPlease complete registration first:");
      console.log("1. Go to http://localhost:3001/credit-scoring");
      console.log("2. Connect wallet with address:", testAddress);
      console.log("3. Click 'Get Started' to register");
      console.log("4. Then run this script again");
      console.log("\nThe script will then boost your credit score for testing!");
      return;
    }

    // Set test credit profile data using the admin function
    console.log("Setting excellent credit profile...");
    const tx = await creditScoring.setTestCreditProfile(
      testAddress,
      ethers.parseEther("100"), // 100 ETH total volume
      50, // 50 transactions
      1000, // account age in blocks (safe value)
      5, // 5 repaid loans
      0, // 0 defaulted loans
    );
    await tx.wait();
    console.log("✅ Test credit profile set");

    // Get updated profile
    const updatedProfile = await creditScoring.getCreditProfile(testAddress);
    console.log("\n🎉 Credit Profile Updated:");
    console.log("Credit Score:", updatedProfile.score.toString());
    console.log("Total Volume:", ethers.formatEther(updatedProfile.totalVolume), "ETH");
    console.log("Transaction Count:", updatedProfile.transactionCount.toString());
    console.log("Account Age:", updatedProfile.accountAge.toString(), "blocks");
    console.log("Repaid Loans:", updatedProfile.repaidLoans.toString());
    console.log("Defaulted Loans:", updatedProfile.defaultedLoans.toString());

    // Determine interest rate based on score
    const score = Number(updatedProfile.score);
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

    if (score >= 650) {
      console.log("🎉 EXCELLENT! You qualify for low interest rates!");
    } else if (score >= 600) {
      console.log("✅ Good! You qualify for reasonable rates.");
    } else {
      console.log("⚠️  Fair credit. Consider building more credit history.");
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
