import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Get the CreditScoring contract address
  const creditScoring = await hre.deployments.get("CreditScoring");

  await deploy("CreditLending", {
    from: deployer,
    // Contract constructor arguments
    args: [creditScoring.address],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const creditLending = await hre.ethers.getContract<Contract>("CreditLending", deployer);
  console.log("👋 CreditLending deployed to:", await creditLending.getAddress());

  // Get the CreditScoring contract instance
  const creditScoringContract = await hre.ethers.getContract<Contract>("CreditScoring", deployer);

  // Add the CreditLending contract as a verified address in CreditScoring
  console.log("Adding CreditLending as verified address in CreditScoring...");
  const tx = await creditScoringContract.addVerifiedAddress(await creditLending.getAddress());
  await tx.wait();
  console.log("✅ CreditLending added as verified address");
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags CreditLending
deployYourContract.tags = ["CreditLending"];
