import { ethers } from "hardhat";

async function main() {
  const zkLendingAddress = "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6";

  console.log(`Adding liquidity to ZK Credit Lending: ${zkLendingAddress}`);

  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  const zkLending = await ethers.getContractAt("ZKCreditLending", zkLendingAddress);

  try {
    // Add 10 ETH to the lending pool
    const amount = ethers.parseEther("10");
    console.log(`\nAdding ${ethers.formatEther(amount)} ETH to lending pool...`);

    const tx = await zkLending.stakeETH({ value: amount });
    console.log(`Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt?.blockNumber}`);

    // Check pool status after adding liquidity
    console.log("\n=== POOL STATUS AFTER ADDING LIQUIDITY ===");
    const poolInfo = await zkLending.getPoolInfo();
    console.log("Pool info:", {
      totalFunds: ethers.formatEther(poolInfo[0]),
      availableFunds: ethers.formatEther(poolInfo[1]),
      totalLoaned: ethers.formatEther(poolInfo[2]),
      utilization: poolInfo[3].toString(),
      totalInterestEarned: ethers.formatEther(poolInfo[4]),
    });

    console.log("\n✅ Liquidity added successfully!");
    console.log("Users can now request loans from the pool.");
  } catch (error: any) {
    console.error("Error adding liquidity:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
