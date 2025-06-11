import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploy a mock CrossChainCreditAggregator for localhost testing
 * This version doesn't require LayerZero for local development
 */
const deployMockCrossChain: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Only deploy on localhost/hardhat
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("⏭️  Skipping mock cross-chain deployment on", hre.network.name);
    return;
  }

  console.log("\n🌐 Deploying Mock CrossChainCreditAggregator for localhost...");
  console.log(`👤 Deployer: ${deployer}`);

  // Get required contract addresses
  const zkCreditScoring = await hre.deployments.get("ZKCreditScoring");
  const zkVerifier = await hre.deployments.get("MockZKVerifier");

  console.log(`📍 ZKCreditScoring: ${zkCreditScoring.address}`);
  console.log(`📍 MockZKVerifier: ${zkVerifier.address}`);

  // Deploy with a mock LayerZero endpoint address (not used in mock)
  const mockLzEndpoint = "0x0000000000000000000000000000000000000001";

  const crossChainAggregator = await deploy("CrossChainCreditAggregator", {
    from: deployer,
    contract: "MockCrossChainAggregator", // Use the mock contract
    args: [mockLzEndpoint, zkCreditScoring.address, zkVerifier.address],
    log: true,
    autoMine: true,
  });

  console.log(`✅ CrossChainCreditAggregator deployed to: ${crossChainAggregator.address}`);

  // Initialize with mock chain support (just localhost)
  const aggregator = await hre.ethers.getContract("CrossChainCreditAggregator", deployer);

  // Add trusted remote (mock - just use same address)
  try {
    const mockRemoteChainId = 1; // Mock remote chain
    await aggregator.setTrustedRemote(mockRemoteChainId, crossChainAggregator.address);
    console.log("✅ Set trusted remote for mock chain");
  } catch {
    console.log("⚠️  Could not set trusted remote (may already be set)");
  }

  console.log("\n📊 Mock Cross-Chain System Summary:");
  console.log("=====================================");
  console.log(`CrossChainCreditAggregator: ${crossChainAggregator.address}`);
  console.log(`Note: This is a mock deployment for localhost testing`);
  console.log(`Universal Score requests will work but won't actually aggregate cross-chain data`);
  console.log("=====================================\n");
};

export default deployMockCrossChain;
deployMockCrossChain.tags = ["MockCrossChain", "CrossChainCreditAggregator"];
deployMockCrossChain.dependencies = ["ZKSystem"];
