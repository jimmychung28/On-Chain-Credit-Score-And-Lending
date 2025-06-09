import { ethers } from "hardhat";

async function verifyPool() {
  console.log("🔍 Verifying clean contract deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get contract instances using the clean addresses
  const zkLending = await ethers.getContractAt("ZKCreditLending", "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6");

  const zkScoring = await ethers.getContractAt("ZKCreditScoring", "0xF8b299F87EBb62E0b625eAF440B73Cc6b7717dbd");

  // Check pool status
  const poolInfo = await zkLending.getPoolInfo();
  console.log("\n💰 Pool Status:");
  console.log("  Total Funds:", ethers.formatEther(poolInfo[0]), "ETH");
  console.log("  Available Funds:", ethers.formatEther(poolInfo[1]), "ETH");
  console.log("  Total Loaned:", ethers.formatEther(poolInfo[2]), "ETH");
  console.log("  Utilization:", poolInfo[3].toString() + "%");

  // Check if contracts are linked correctly
  const linkedScoringAddress = await zkLending.zkCreditScoring();
  console.log("\n🔗 Contract Linkage:");
  console.log("  ZKScoring from Lending:", linkedScoringAddress);
  console.log("  Expected ZKScoring:", await zkScoring.getAddress());
  console.log(
    "  ✅ Properly linked:",
    linkedScoringAddress.toLowerCase() === (await zkScoring.getAddress()).toLowerCase(),
  );

  console.log("\n🎉 Clean deployment verification complete!");
}

verifyPool().catch(console.error);
