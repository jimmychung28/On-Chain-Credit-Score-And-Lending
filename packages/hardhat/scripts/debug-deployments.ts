import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking deployed contracts...\n");

  const contracts = [
    "CreditScoring",
    "ZKCreditLending",
    "Groth16Verifier",
    "CrossChainCreditAggregator",
    "CrossChainZKCreditLending",
  ];

  for (const contractName of contracts) {
    try {
      const contract = await ethers.getContract(contractName);
      console.log(`✅ ${contractName}: ${contract.address}`);
    } catch {
      console.log(`❌ ${contractName}: Not deployed`);
    }
  }

  // Check if we can access the aggregator methods
  try {
    const aggregator = await ethers.getContract("CrossChainCreditAggregator");
    const [deployer] = await ethers.getSigners();

    console.log("\n🧪 Testing aggregator functionality...");

    // Test fee estimation
    try {
      const fee = await aggregator.estimateUniversalScoreFee(deployer.address);
      console.log(`💰 Estimated fee: ${ethers.utils.formatEther(fee)} ETH`);
    } catch (error) {
      console.log("⚠️  Fee estimation failed:", error.message);
    }

    // Test supported chains
    try {
      const [chainIds] = await aggregator.getSupportedChains();
      console.log(`🌐 Supported chains: ${chainIds.length}`);
    } catch (error) {
      console.log("⚠️  Chain configuration failed:", error.message);
    }
  } catch {
    console.log("❌ CrossChainCreditAggregator not accessible");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Debug failed:", error);
    process.exit(1);
  });
