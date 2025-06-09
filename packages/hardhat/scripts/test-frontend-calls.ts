import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing Frontend Contract Calls...");

  const testAddress = "0x3071CBb43429a095482a6bdE5bB50564c11E5020";
  const zkCreditScoringAddress = "0xb6057e08a11da09a998985874FE2119e98dB3D5D";

  console.log("📍 Test Address:", testAddress);
  console.log("📋 Contract Address:", zkCreditScoringAddress);

  // Get contract instance - this mimics what the frontend does
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", zkCreditScoringAddress);

  console.log("\n🌐 Testing contract connectivity...");

  // Test 1: Check contract is deployed and callable
  try {
    const contractCode = await ethers.provider.getCode(zkCreditScoringAddress);
    console.log("✅ Contract exists, code length:", contractCode.length);
  } catch (error) {
    console.error("❌ Contract not found:", error);
    return;
  }

  // Test 2: Test basic contract calls
  try {
    const minScore = await zkCreditScoring.MIN_SCORE();
    const maxScore = await zkCreditScoring.MAX_SCORE();
    console.log("✅ Contract constants:", { minScore: minScore.toString(), maxScore: maxScore.toString() });
  } catch (error) {
    console.error("❌ Contract constants failed:", error);
    return;
  }

  // Test 3: Test the exact call the frontend makes - getCreditProfile
  console.log("\n👤 Testing getCreditProfile call...");
  try {
    const profile = await zkCreditScoring.getCreditProfile(testAddress);
    console.log("✅ Profile result:", {
      score: profile[0].toString(),
      lastUpdated: profile[1].toString(),
      isActive: profile[2],
      privacyLevel: profile[3].toString(),
      isVerified: profile[4],
    });

    // Check if this would be considered "registered" by frontend logic
    const isRegistered = profile[2]; // isActive
    console.log("🎯 Frontend would see isRegistered as:", isRegistered);
  } catch (error) {
    console.error("❌ getCreditProfile failed:", error);
    console.error("Error details:", (error as Error).message);
  }

  // Test 4: Test raw creditProfiles mapping call
  console.log("\n📊 Testing raw creditProfiles mapping...");
  try {
    const rawProfile = await zkCreditScoring.creditProfiles(testAddress);
    console.log("✅ Raw profile:", {
      score: rawProfile[0].toString(),
      lastUpdated: rawProfile[1].toString(),
      isActive: rawProfile[2],
      dataCommitment: rawProfile[3],
      privacyLevel: rawProfile[4].toString(),
      isVerified: rawProfile[5],
    });
  } catch (error) {
    console.error("❌ Raw profile failed:", error);
  }

  // Test 5: Test transparency premium call
  console.log("\n💰 Testing transparency premium call...");
  try {
    const premium = await zkCreditScoring.getTransparencyPremium(testAddress);
    console.log("✅ Transparency premium:", premium.toString(), "basis points");
  } catch (error) {
    console.error("❌ Transparency premium failed:", error);
  }

  // Test 6: Test isEligibleForLoan call
  console.log("\n🏦 Testing loan eligibility call...");
  try {
    const eligible = await zkCreditScoring.isEligibleForLoan(testAddress, 600);
    console.log("✅ Loan eligible (score >= 600):", eligible);
  } catch (error) {
    console.error("❌ Loan eligibility failed:", error);
  }

  // Test 7: Test some of the additional addresses we've registered
  console.log("\n👥 Testing other registered addresses...");
  const otherAddresses = [
    "0xED46EB6313fEB535aA7bD4969A5aD84af4D42566",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  ];

  for (const addr of otherAddresses) {
    try {
      const profile = await zkCreditScoring.getCreditProfile(addr);
      console.log(`✅ ${addr}: isActive=${profile[2]}, privacyLevel=${profile[3]}`);
    } catch {
      console.log(`❌ ${addr}: Not registered or error`);
    }
  }

  // Test 8: Check blockchain info
  console.log("\n⛓️  Blockchain info...");
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("✅ Network:", { chainId: network.chainId.toString(), name: network.name });
    console.log("✅ Current block:", blockNumber);
  } catch (error) {
    console.error("❌ Blockchain info failed:", error);
  }

  // Test 9: Check recent events
  console.log("\n📝 Checking recent registration events...");
  try {
    const filter = zkCreditScoring.filters.UserRegistered();
    const events = await zkCreditScoring.queryFilter(filter, -50); // Last 50 blocks

    console.log(`✅ Found ${events.length} registration events in last 50 blocks:`);
    events.forEach((event, i) => {
      const address = event.args[0];
      const privacyLevel = event.args[1];
      const timestamp = event.args[2];
      console.log(
        `  ${i + 1}. ${address} (Privacy: ${privacyLevel}) at ${new Date(Number(timestamp) * 1000).toISOString()}`,
      );
    });
  } catch (error) {
    console.error("❌ Events query failed:", error);
  }

  console.log("\n🎯 Summary:");
  console.log("===========");
  console.log("If the profile shows as registered here but not in frontend:");
  console.log("1. Check wallet network (should be localhost:8545)");
  console.log("2. Check browser console for RPC errors");
  console.log("3. Try hard refresh (Cmd+Shift+R)");
  console.log("4. Check if wallet is connected to the correct network");
  console.log("5. Verify contract addresses in deployedContracts.ts");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
