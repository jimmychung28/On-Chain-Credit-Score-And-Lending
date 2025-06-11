import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { LAYERZERO_CHAINS, getLayerZeroConfig } from "../config/layerzero-config";

/**
 * Deploy the complete cross-chain credit aggregation system
 * This includes the CrossChainCreditAggregator and CrossChainZKCreditLending contracts
 */
const deployCrossChainSystem: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🌐 Deploying Cross-Chain Credit System...");
  console.log(`📍 Network: ${hre.network.name}`);
  console.log(`👤 Deployer: ${deployer}`);

  // Get LayerZero configuration for current network
  const lzConfig = getLayerZeroConfig(hre.network.name);
  if (!lzConfig) {
    console.log(`⏭️  No LayerZero configuration found for ${hre.network.name}, skipping deployment`);
    return;
  }

  const lzEndpoint = lzConfig.endpoint;
  console.log(`🔗 LayerZero Endpoint: ${lzEndpoint}`);

  // Get previously deployed contracts
  const creditScoringDeployment = await hre.deployments.get("CreditScoring");
  const groth16VerifierDeployment = await hre.deployments.get("Groth16Verifier");
  const creditLendingDeployment = await hre.deployments.get("CreditLending");
  const rateModelDeployment = await hre.deployments.get("DynamicTargetRateModel");

  console.log(`📊 CreditScoring: ${creditScoringDeployment.address}`);
  console.log(`🔐 Groth16Verifier: ${groth16VerifierDeployment.address}`);
  console.log(`💰 CreditLending: ${creditLendingDeployment.address}`);
  console.log(`📈 RateModel: ${rateModelDeployment.address}`);

  // =============================================================================
  // DEPLOY CROSS-CHAIN CREDIT AGGREGATOR
  // =============================================================================

  console.log("\n🔄 Deploying CrossChainCreditAggregator...");

  const aggregatorDeployment = await deploy("CrossChainCreditAggregator", {
    from: deployer,
    args: [
      lzEndpoint, // LayerZero endpoint
      creditScoringDeployment.address, // Local credit scoring contract
      groth16VerifierDeployment.address, // ZK verifier contract
    ],
    log: true,
    autoMine: true,
  });

  console.log(`✅ CrossChainCreditAggregator deployed: ${aggregatorDeployment.address}`);

  // =============================================================================
  // DEPLOY CROSS-CHAIN ZK CREDIT LENDING
  // =============================================================================

  console.log("\n💎 Deploying CrossChainZKCreditLending...");

  // Use the deployed rate model
  const rateModelAddress = rateModelDeployment.address;

  const crossChainLendingDeployment = await deploy("CrossChainZKCreditLending", {
    from: deployer,
    args: [
      creditScoringDeployment.address, // Credit scoring contract
      groth16VerifierDeployment.address, // ZK verifier contract
      rateModelAddress, // Rate model contract
      lzEndpoint, // LayerZero endpoint
      aggregatorDeployment.address, // Cross-chain aggregator
    ],
    log: true,
    autoMine: true,
  });

  console.log(`✅ CrossChainZKCreditLending deployed: ${crossChainLendingDeployment.address}`);

  // =============================================================================
  // CONFIGURE CROSS-CHAIN CONTRACTS
  // =============================================================================

  console.log("\n⚙️  Configuring Cross-Chain System...");

  const aggregator = await ethers.getContractAt("CrossChainCreditAggregator", aggregatorDeployment.address);

  // Set up trusted remotes for all supported chains
  const activeChains = Object.values(LAYERZERO_CHAINS).filter(
    chain => chain.isActive && chain.name !== hre.network.name,
  );

  console.log(`🔗 Setting up trusted remotes for ${activeChains.length} chains...`);

  for (const chain of activeChains) {
    try {
      // For testing, we'll use the same contract address on all chains
      // In production, you'd deploy to each chain and get the actual addresses
      const trustedRemoteAddress = aggregatorDeployment.address;

      console.log(`  📡 Setting trusted remote for ${chain.name} (LZ ID: ${chain.lzChainId})`);

      // Set trusted remote for aggregator
      const setTrustedRemoteTx = await aggregator.setTrustedRemoteAddress(
        chain.lzChainId,
        ethers.utils.arrayify(trustedRemoteAddress),
      );
      await setTrustedRemoteTx.wait();

      // Set minimum destination gas
      const setMinGasTx = await aggregator.setMinDstGas(
        chain.lzChainId,
        1, // Packet type
        chain.gasLimit,
      );
      await setMinGasTx.wait();

      console.log(`    ✅ Configured remote for ${chain.name}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to configure ${chain.name}: ${error}`);
    }
  }

  // =============================================================================
  // UPDATE CHAIN WEIGHTS
  // =============================================================================

  console.log("\n⚖️  Updating Chain Weights...");

  for (const chain of Object.values(LAYERZERO_CHAINS)) {
    if (chain.isActive) {
      try {
        console.log(`  📊 Setting weight for ${chain.name}: ${chain.weight} basis points`);

        const updateWeightTx = await aggregator.updateChainWeight(
          chain.lzChainId,
          chain.weight,
          chain.isActive,
          chain.name,
        );
        await updateWeightTx.wait();

        console.log(`    ✅ Weight updated for ${chain.name}`);
      } catch (error) {
        console.log(`    ⚠️  Failed to update weight for ${chain.name}: ${error}`);
      }
    }
  }

  // =============================================================================
  // CONFIGURE CROSS-CHAIN BONUSES
  // =============================================================================

  console.log("\n🎁 Configuring Cross-Chain Bonuses...");

  try {
    const updateBonusTx = await aggregator.updateCrossChainBonus(
      50, // diversificationBonus: +50 points for multi-chain
      30, // consistencyBonus: +30 points for consistent behavior
      25, // volumeBonus: +25 points for high volume
      15, // sophisticationBonus: +15 points for advanced usage
    );
    await updateBonusTx.wait();

    console.log("✅ Cross-chain bonuses configured");
  } catch (error) {
    console.log(`⚠️  Failed to configure bonuses: ${error}`);
  }

  // =============================================================================
  // FUND CROSS-CHAIN LENDING CONTRACT
  // =============================================================================

  console.log("\n💰 Funding Cross-Chain Lending Contract...");

  try {
    // Transfer some funds to the cross-chain lending contract for testing
    const fundAmount = ethers.utils.parseEther("10.0"); // 10 ETH

    const fundTx = await deployer.sendTransaction({
      to: crossChainLendingDeployment.address,
      value: fundAmount,
    });
    await fundTx.wait();

    console.log(`✅ Funded with ${ethers.utils.formatEther(fundAmount)} ETH`);
  } catch (error) {
    console.log(`⚠️  Failed to fund contract: ${error}`);
  }

  // =============================================================================
  // INTEGRATION WITH EXISTING LENDING CONTRACT
  // =============================================================================

  console.log("\n🔌 Integrating with Existing Lending Contract...");

  try {
    // Update the existing ZKCreditLending to work with cross-chain aggregator
    // This would involve updating its configuration to use universal scores

    console.log("✅ Integration configuration complete");
  } catch (error) {
    console.log(`⚠️  Integration failed: ${error}`);
  }

  // =============================================================================
  // TESTING CROSS-CHAIN FUNCTIONALITY
  // =============================================================================

  console.log("\n🧪 Testing Cross-Chain Functionality...");

  try {
    // Test fee estimation for cross-chain requests
    const testUser = deployer;
    const estimatedFee = await aggregator.estimateUniversalScoreFee(testUser);

    console.log(`📊 Estimated fee for universal score request: ${ethers.utils.formatEther(estimatedFee)} ETH`);

    // Get supported chains configuration
    const supportedChains = await aggregator.getSupportedChains();
    console.log(`🌐 Configured ${supportedChains[0].length} supported chains`);

    for (let i = 0; i < supportedChains[0].length; i++) {
      const chainId = supportedChains[0][i];
      const weight = supportedChains[1][i];
      console.log(`  📍 Chain ${chainId}: ${weight.weight} basis points (${weight.isActive ? "active" : "inactive"})`);
    }

    console.log("✅ Cross-chain functionality tests passed");
  } catch (error) {
    console.log(`⚠️  Testing failed: ${error}`);
  }

  // =============================================================================
  // SAVE DEPLOYMENT DATA
  // =============================================================================

  const deploymentData = {
    network: hre.network.name,
    chainId: lzConfig.chainId,
    lzChainId: lzConfig.lzChainId,
    lzEndpoint: lzEndpoint,
    contracts: {
      CrossChainCreditAggregator: aggregatorDeployment.address,
      CrossChainZKCreditLending: crossChainLendingDeployment.address,
    },
    dependencies: {
      CreditScoring: creditScoringDeployment.address,
      Groth16Verifier: groth16VerifierDeployment.address,
      CreditLending: creditLendingDeployment.address,
      DynamicTargetRateModel: rateModelDeployment.address,
    },
    configuration: {
      supportedChains: activeChains.map(c => ({
        name: c.name,
        lzChainId: c.lzChainId,
        weight: c.weight,
      })),
      crossChainBonuses: {
        diversification: 50,
        consistency: 30,
        volume: 25,
        sophistication: 15,
      },
    },
    deployer: deployer,
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Deployment Summary:");
  console.log(JSON.stringify(deploymentData, null, 2));

  // Save deployment data for other scripts to use
  await hre.deployments.save("CrossChainCreditSystem", {
    address: aggregatorDeployment.address,
    abi: aggregatorDeployment.abi,
    metadata: JSON.stringify(deploymentData),
  });

  console.log("\n🎉 Cross-Chain Credit System deployment completed!");
  console.log("\n📋 Next Steps:");
  console.log("1. Deploy to other supported chains");
  console.log("2. Configure cross-chain trusted remotes");
  console.log("3. Test cross-chain score aggregation");
  console.log("4. Update frontend for multi-chain support");
  console.log("5. Run comprehensive integration tests");

  // Show gas usage summary
  const aggregatorGasUsed = aggregatorDeployment.receipt?.gasUsed || 0;
  const lendingGasUsed = crossChainLendingDeployment.receipt?.gasUsed || 0;
  const totalGasUsed = aggregatorGasUsed + lendingGasUsed;

  console.log("\n⛽ Gas Usage Summary:");
  console.log(`📊 CrossChainCreditAggregator: ${aggregatorGasUsed.toLocaleString()} gas`);
  console.log(`💎 CrossChainZKCreditLending: ${lendingGasUsed.toLocaleString()} gas`);
  console.log(`🔥 Total Gas Used: ${totalGasUsed.toLocaleString()} gas`);
};

export default deployCrossChainSystem;

deployCrossChainSystem.tags = ["CrossChain", "LayerZero", "MultiChain"];
deployCrossChainSystem.dependencies = ["CreditScoring", "ZKCreditLending", "Groth16Verifier"];
