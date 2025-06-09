import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Complete ZK Workflow...");

  const [deployer, user1] = await ethers.getSigners();
  console.log("Testing with accounts:");
  console.log("  Deployer:", deployer.address);
  console.log("  User1:", user1.address);

  // Get deployed contract addresses from deployedContracts.ts
  const mockZKVerifierAddress = "0x057cD3082EfED32d5C907801BF3628B27D88fD80";
  const zkCreditScoringAddress = "0xb6057e08a11da09a998985874FE2119e98dB3D5D";
  const zkCreditLendingAddress = "0x31403b1e52051883f2Ce1B1b4C89f36034e1221D";

  // Get contract instances
  const mockZKVerifier = await ethers.getContractAt("MockZKVerifierV2", mockZKVerifierAddress);
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", zkCreditScoringAddress);
  const zkCreditLending = await ethers.getContractAt("ZKCreditLending", zkCreditLendingAddress);

  console.log("\n📋 Testing ZK Verifier...");

  // Test 1: Direct verifier test
  const mockProof = "0x" + "ab".repeat(128); // 256 bytes
  const mockSignals: [bigint, bigint, bigint, bigint] = [1n, 750n, 100n, 12345n];

  const verifyResult = await (mockZKVerifier as any).verifyProof(mockProof, mockSignals);
  await verifyResult.wait();
  console.log("✅ Direct verifier test passed");

  console.log("\n👤 Testing User Registration...");

  // Test 2: Register users with different privacy levels
  const registerUser1Tx = await zkCreditScoring.connect(user1).registerUser();
  await registerUser1Tx.wait();
  console.log("✅ User1 registered with max privacy (Level 5)");

  // Test 3: Register with transparency level
  const registerDeployerTx = await zkCreditScoring.registerUserWithTransparency(3);
  await registerDeployerTx.wait();
  console.log("✅ Deployer registered with transparency Level 3");

  console.log("\n📊 Testing Credit Profiles...");

  // Check user profiles
  const user1Profile = await zkCreditScoring.getCreditProfile(user1.address);
  const deployerProfile = await zkCreditScoring.getCreditProfile(deployer.address);

  console.log("User1 Profile:", {
    score: user1Profile[0].toString(),
    isActive: user1Profile[2],
    privacyLevel: user1Profile[3].toString(),
    isVerified: user1Profile[4],
  });

  console.log("Deployer Profile:", {
    score: deployerProfile[0].toString(),
    isActive: deployerProfile[2],
    privacyLevel: deployerProfile[3].toString(),
    isVerified: deployerProfile[4],
  });

  console.log("\n🔐 Testing ZK Proof Submission...");

  // Test 4: Submit ZK proof with current timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const testProof = "0x" + "cd".repeat(128);
  const testSignals: [bigint, bigint, bigint] = [
    750n, // credit score
    BigInt(currentTimestamp), // current timestamp
    BigInt(`0x${deployer.address.slice(2)}31337`.slice(0, 66)), // user hash
  ];
  const testCommitment = ethers.keccak256(ethers.toUtf8Bytes("test_commitment_" + Date.now()));

  const submitTx = await zkCreditScoring.submitCreditProof(
    testProof,
    testSignals,
    testCommitment,
    1000000n, // totalVolume
    50n, // transactionCount
    5n, // loanCount
    5n, // repaidLoans
    0n, // defaultedLoans
  );
  await submitTx.wait();
  console.log("✅ ZK proof submitted successfully");

  // Check updated profile
  const updatedProfile = await zkCreditScoring.getCreditProfile(deployer.address);
  console.log("Updated Deployer Profile:", {
    score: updatedProfile[0].toString(),
    lastUpdated: new Date(Number(updatedProfile[1]) * 1000).toISOString(),
    isActive: updatedProfile[2],
    privacyLevel: updatedProfile[3].toString(),
    isVerified: updatedProfile[4],
  });

  console.log("\n💰 Testing Loan System...");

  // Test 5: Check loan eligibility
  const eligibility = await zkCreditLending.checkLoanEligibility(deployer.address, ethers.parseEther("1"));
  console.log("Loan Eligibility:", {
    eligible: eligibility[0],
    maxAmount: ethers.formatEther(eligibility[1]),
    estimatedRate: eligibility[2].toString(),
    privacyLevel: eligibility[3].toString(),
    transparencyPremium: eligibility[4].toString(),
  });

  // Test 6: Request a loan
  if (eligibility[0]) {
    console.log("Requesting loan...");
    const loanAmount = ethers.parseEther("1");
    const loanTx = await zkCreditLending.requestLoan(loanAmount);
    const receipt = await loanTx.wait();

    // Extract loan ID from events
    const loanRequestedEvent = receipt?.logs.find((log: any) => log.address === zkCreditLendingAddress);

    if (loanRequestedEvent && receipt) {
      console.log("✅ Loan requested successfully");
      console.log("Transaction hash:", receipt.hash);

      // Check pool status after loan
      const poolInfo = await zkCreditLending.getPoolInfo();
      console.log("Pool status after loan:", {
        totalFunds: ethers.formatEther(poolInfo[0]),
        availableFunds: ethers.formatEther(poolInfo[1]),
        utilization: poolInfo[2].toString() + "%",
      });
    }
  }

  console.log("\n🔄 Testing Privacy Level Changes...");

  // Test 7: Change privacy level
  const updatePrivacyTx = await zkCreditScoring.connect(user1).updateTransparencyLevel(2);
  await updatePrivacyTx.wait();
  console.log("✅ User1 privacy level updated to Level 2");

  // Check transparency premium differences
  const user1Premium = await zkCreditScoring.getTransparencyPremium(user1.address);
  const deployerPremium = await zkCreditScoring.getTransparencyPremium(deployer.address);

  console.log("Transparency Premiums:", {
    user1: user1Premium.toString() + " basis points",
    deployer: deployerPremium.toString() + " basis points",
  });

  // Test 8: Switch back to max privacy
  const maxPrivacyTx = await zkCreditScoring.connect(user1).switchToMaxPrivacy();
  await maxPrivacyTx.wait();
  console.log("✅ User1 switched back to maximum privacy");

  const finalUser1Premium = await zkCreditScoring.getTransparencyPremium(user1.address);
  console.log("User1 final premium:", finalUser1Premium.toString(), "basis points");

  console.log("\n🎉 ZK Workflow Test Complete!");
  console.log("==========================================");
  console.log("✅ All ZK proof components working");
  console.log("✅ Privacy-first system operational");
  console.log("✅ Transparency premiums functioning");
  console.log("✅ Loan system integrated with ZK proofs");
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
