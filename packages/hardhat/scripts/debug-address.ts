import { ethers } from "hardhat";

async function main() {
  console.log("🐛 Debugging Address Registration Issue...");

  const problemAddress = "0xED46EB6313fEB535aA7bD4969A5aD84af4D42566";
  const zkCreditScoringAddress = "0xb6057e08a11da09a998985874FE2119e98dB3D5D";

  // Get contract instance
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", zkCreditScoringAddress);

  console.log("📍 Problem Address:", problemAddress);
  console.log("📋 Contract Address:", zkCreditScoringAddress);

  // Test 1: Check if address is already registered
  console.log("\n🔍 Checking current registration status...");
  try {
    const profile = await zkCreditScoring.getCreditProfile(problemAddress);
    console.log("Profile found:", {
      score: profile[0].toString(),
      lastUpdated: profile[1].toString(),
      isActive: profile[2],
      privacyLevel: profile[3].toString(),
      isVerified: profile[4],
    });
  } catch (error) {
    console.log("❌ Profile check failed:", (error as Error).message);
  }

  // Test 2: Check raw storage
  console.log("\n🔍 Checking raw storage...");
  try {
    const creditProfile = await zkCreditScoring.creditProfiles(problemAddress);
    console.log("Raw profile data:", {
      score: creditProfile[0].toString(),
      lastUpdated: creditProfile[1].toString(),
      isActive: creditProfile[2],
      dataCommitment: creditProfile[3],
      privacyLevel: creditProfile[4].toString(),
      isVerified: creditProfile[5],
    });
  } catch (error) {
    console.log("❌ Raw storage check failed:", (error as Error).message);
  }

  // Test 3: Check if we can get a signer for this address
  console.log("\n🔍 Checking if address is available as signer...");
  const signers = await ethers.getSigners();
  const availableAddresses = signers.map(s => s.address);
  console.log("Available signer addresses:", availableAddresses);
  console.log("Problem address in signers:", availableAddresses.includes(problemAddress));

  // Test 4: Try to impersonate the address and register
  console.log("\n🧪 Attempting to register the address...");
  try {
    // Impersonate the address
    await ethers.provider.send("hardhat_impersonateAccount", [problemAddress]);

    // Fund the address
    const [deployer] = signers;
    await deployer.sendTransaction({
      to: problemAddress,
      value: ethers.parseEther("1"),
    });

    // Get impersonated signer
    const impersonatedSigner = await ethers.getSigner(problemAddress);

    // Try to register
    console.log(
      "💰 Address balance:",
      ethers.formatEther(await impersonatedSigner.provider!.getBalance(problemAddress)),
    );

    const registerTx = await zkCreditScoring.connect(impersonatedSigner).registerUser();
    console.log("🚀 Registration transaction sent:", registerTx.hash);

    const receipt = await registerTx.wait();
    console.log("✅ Registration successful! Block:", receipt?.blockNumber);

    // Check profile after registration
    const newProfile = await zkCreditScoring.getCreditProfile(problemAddress);
    console.log("✅ New profile:", {
      score: newProfile[0].toString(),
      lastUpdated: newProfile[1].toString(),
      isActive: newProfile[2],
      privacyLevel: newProfile[3].toString(),
      isVerified: newProfile[4],
    });
  } catch (error) {
    console.log("❌ Registration failed:", (error as Error).message);

    // Check if it's a revert with reason
    if (error instanceof Error && error.message.includes("revert")) {
      console.log("🔍 Revert reason detected in error message");
    }
  }

  // Test 5: Check recent transactions/events
  console.log("\n📝 Checking recent registration events...");
  try {
    const filter = zkCreditScoring.filters.UserRegistered();
    const events = await zkCreditScoring.queryFilter(filter, -100); // Last 100 blocks

    console.log(`Found ${events.length} registration events in last 100 blocks:`);
    events.forEach((event, i) => {
      console.log(`  ${i + 1}. User: ${event.args[0]}, Privacy Level: ${event.args[1]}, Time: ${event.args[2]}`);
    });

    // Check if our problem address is in there
    const problemAddressEvents = events.filter(e => e.args[0].toLowerCase() === problemAddress.toLowerCase());
    console.log(`Problem address registration events: ${problemAddressEvents.length}`);
  } catch (error) {
    console.log("❌ Event query failed:", (error as Error).message);
  }

  console.log("\n🎯 Debug Summary:");
  console.log("================");
  console.log("1. Check contract deployedContracts.ts for correct addresses");
  console.log("2. Ensure frontend is connecting to localhost:8545");
  console.log("3. Check browser network settings");
  console.log("4. Verify wallet is connected to local network");
  console.log("5. Check for pending transactions in wallet");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
