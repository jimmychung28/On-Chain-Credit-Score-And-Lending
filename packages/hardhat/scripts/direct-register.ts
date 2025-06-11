import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Testing direct registration...");

  // Get the test wallet that's having issues
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring");

  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);

  // Create a wallet with private key (you'll need to replace this with your test wallet's private key)
  // For now, let's use a hardhat test account
  const [signer] = await ethers.getSigners();
  console.log(`👤 Testing with signer: ${signer.address}`);

  // Check if this works
  try {
    console.log("📝 Attempting direct registration...");
    const tx = await zkCreditScoring.connect(signer).registerUser();
    console.log("✅ Transaction sent!");
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (error: any) {
    console.error("❌ Registration failed:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.code) console.error("Code:", error.code);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
