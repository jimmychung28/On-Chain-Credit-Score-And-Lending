import { ethers } from "hardhat";
import { network } from "hardhat";

async function main() {
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current block:", currentBlock);

  console.log("Mining blocks to increase age...");

  // Mine many blocks (2M blocks to simulate age)
  await network.provider.send("hardhat_mine", ["0x200000"]); // Mine ~2M blocks

  const newBlock = await ethers.provider.getBlockNumber();
  console.log("New block:", newBlock);
  console.log("Blocks mined:", newBlock - currentBlock);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
