import hre from "hardhat";

async function main() {
  console.log("📋 Deployed contracts:\n");

  const deployments = await hre.deployments.all();

  for (const [name, deployment] of Object.entries(deployments)) {
    console.log(`✅ ${name}: ${deployment.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
