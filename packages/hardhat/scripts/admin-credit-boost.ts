import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Get the deployed CreditScoring contract
  const creditScoring = (await ethers.getContract("CreditScoring", deployer)) as any;

  const testAddress = "0x010C5E560D0e042B53Cedba9A7404E90F82D7592";

  console.log("Admin credit boost for:", testAddress);
  console.log("Deployer (admin) address:", deployer.address);

  try {
    // Check current profile
    const profile = await creditScoring.getCreditProfile(testAddress);
    console.log("Current credit score:", profile.score.toString());

    // Since setTestCreditProfile has overflow issues, let's use createTestUser instead
    // But first check if already registered
    if (profile.isActive) {
      console.log("User already registered. Let's try a direct score update...");

      // Let's try recording some successful loans as admin
      console.log("Recording successful loans as admin...");

      for (let i = 0; i < 5; i++) {
        try {
          const tx = await creditScoring.recordLoan(
            testAddress,
            ethers.parseEther("10"), // 10 ETH loan
            true, // successfully repaid
          );
          await tx.wait();
          console.log(`✅ Loan ${i + 1}/5 recorded successfully`);
        } catch (error: any) {
          console.log(`❌ Loan ${i + 1} failed:`, error.message);
        }
      }

      // Check updated score
      const updatedProfile = await creditScoring.getCreditProfile(testAddress);
      console.log("Updated credit score:", updatedProfile.score.toString());
      console.log("Repaid loans:", updatedProfile.repaidLoans.toString());
      console.log("Total loans:", updatedProfile.loanCount.toString());

      if (Number(updatedProfile.score) >= 650) {
        console.log("🎉 SUCCESS! You now have good credit (650+)");
        console.log("Interest rate: 8% or better");
      } else if (Number(updatedProfile.score) >= 600) {
        console.log("🎉 SUCCESS! You now have fair credit (600+)");
        console.log("Interest rate: 11%");
      } else {
        console.log("Score improved but still needs work. Current benefits:");
        console.log("- Can request loans up to 100 ETH");
        console.log("- Interest rate based on current score");
      }
    } else {
      console.log("User not registered. Please register first through the frontend.");
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
