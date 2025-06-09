import { ethers } from "hardhat";

async function main() {
  console.log("🐛 Debugging Frontend Data Format Issue...");

  const testAddress = "0x3071CBb43429a095482a6bdE5bB50564c11E5020";
  console.log(`📍 Debug Address: ${testAddress}`);

  // Get the deployed contract
  const zkCreditScoring = await ethers.getContractAt("ZKCreditScoring", "0xb6057e08a11da09a998985874FE2119e98dB3D5D");

  try {
    console.log("\n1️⃣ Testing getCreditProfile function...");
    const profileResult = await zkCreditScoring.getCreditProfile(testAddress);
    console.log("Raw result:", profileResult);
    console.log("Type:", typeof profileResult);
    console.log("Is Array:", Array.isArray(profileResult));
    console.log("Length (if array):", Array.isArray(profileResult) ? profileResult.length : "N/A");

    // Try to access as object
    console.log("\n📊 As Object:");
    console.log("  score:", profileResult.score?.toString());
    console.log("  lastUpdated:", profileResult.lastUpdated?.toString());
    console.log("  isActive:", profileResult.isActive);
    console.log("  privacyLevel:", profileResult.privacyLevel?.toString());
    console.log("  isVerified:", profileResult.isVerified);

    // Try to access as array
    console.log("\n📋 As Array:");
    if (Array.isArray(profileResult)) {
      profileResult.forEach((item, index) => {
        console.log(`  [${index}]:`, item?.toString());
      });
    } else {
      console.log("  Result is not an array");
    }

    console.log("\n2️⃣ Testing raw creditProfiles mapping...");
    const rawProfile = await zkCreditScoring.creditProfiles(testAddress);
    console.log("Raw mapping result:", rawProfile);
    console.log("Type:", typeof rawProfile);
    console.log("Is Array:", Array.isArray(rawProfile));

    console.log("\n🎯 Frontend Logic Test:");
    console.log("Object check (profileResult.isActive):", profileResult.isActive);
    console.log("Array check (profileResult[2]):", Array.isArray(profileResult) ? profileResult[2] : "N/A");

    const frontendIsRegistered = !!(
      profileResult &&
      // Object format: { isActive: true, ... }
      (profileResult.isActive === true ||
        // Array format: [score, lastUpdated, isActive, ...]
        (Array.isArray(profileResult) && profileResult.length >= 3 && profileResult[2] === true))
    );

    console.log("Frontend would see isRegistered as:", frontendIsRegistered);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
