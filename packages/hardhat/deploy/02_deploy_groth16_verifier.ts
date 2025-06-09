import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the real Groth16 verifier contract
 */
const deployGroth16Verifier: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🔐 Deploying Groth16Verifier contract...");

  await deploy("Groth16Verifier", {
    from: deployer,
    args: [], // Constructor has no arguments
    log: true,
    autoMine: true,
  });

  // Get the deployed contract to interact with it
  const groth16Verifier = await hre.ethers.getContract<Contract>("Groth16Verifier", deployer);

  console.log("✅ Groth16Verifier deployed at:", await groth16Verifier.getAddress());

  // Verify it's working by calling getVerificationInfo
  try {
    const info = await groth16Verifier.getVerificationInfo();
    console.log("📊 Verification Info:");
    console.log(`   Algorithm: ${info[0]}`);
    console.log(`   Curve: ${info[1]}`);
    console.log(`   Proof Size: ${info[2]} bytes`);
    console.log(`   Signal Count: ${info[3]}`);
  } catch (error) {
    console.log("⚠️  Could not get verification info:", error);
  }

  console.log("🎯 Groth16Verifier deployment complete!");
};

export default deployGroth16Verifier;

deployGroth16Verifier.tags = ["Groth16Verifier"];
