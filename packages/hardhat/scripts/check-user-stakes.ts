import { ethers } from "hardhat";

async function main() {
  const zkLendingAddress = "0xEb0fCBB68Ca7Ba175Dc1D3dABFD618e7a3F582F6";
  const userAddress = "0x93d480c32913EDAa976b587FDf10345cA7CF9987";

  console.log(`Checking staking activity for: ${userAddress}`);
  console.log(`ZK Lending Contract: ${zkLendingAddress}`);

  const zkLending = await ethers.getContractAt("ZKCreditLending", zkLendingAddress);

  try {
    // Check user's lender info
    console.log("\n=== USER LENDER INFO ===");
    const lenderInfo = await zkLending.getLenderInfo(userAddress);
    console.log("Lender info:", {
      totalShares: ethers.formatEther(lenderInfo[0]),
      sharePercentage: lenderInfo[1].toString(),
    });

    // Check FundsDeposited events for this user
    console.log("\n=== CHECKING FUNDS DEPOSITED EVENTS ===");
    const depositFilter = zkLending.filters.FundsDeposited(userAddress);
    const depositEvents = await zkLending.queryFilter(depositFilter, -1000);

    console.log(`Found ${depositEvents.length} FundsDeposited events for this user:`);
    for (const event of depositEvents) {
      console.log(`- Amount: ${ethers.formatEther(event.args[1])} ETH, Block: ${event.blockNumber}`);
    }

    // Check all FundsDeposited events to see who staked
    console.log("\n=== ALL STAKING EVENTS ===");
    const allDepositFilter = zkLending.filters.FundsDeposited();
    const allDepositEvents = await zkLending.queryFilter(allDepositFilter, -1000);

    console.log(`Found ${allDepositEvents.length} total FundsDeposited events:`);
    for (const event of allDepositEvents) {
      console.log(
        `- User: ${event.args[0]}, Amount: ${ethers.formatEther(event.args[1])} ETH, Block: ${event.blockNumber}`,
      );
    }

    // Check pool status
    console.log("\n=== POOL STATUS ===");
    const poolInfo = await zkLending.getPoolInfo();
    console.log("Pool info:", {
      totalFunds: ethers.formatEther(poolInfo[0]),
      availableFunds: ethers.formatEther(poolInfo[1]),
      totalLoaned: ethers.formatEther(poolInfo[2]),
      utilization: poolInfo[3].toString(),
      totalInterestEarned: ethers.formatEther(poolInfo[4]),
    });

    // Check if user tried to request a loan and it failed
    console.log("\n=== CHECKING FOR FAILED TRANSACTIONS ===");
    const provider = ethers.provider;
    const blockNumber = await provider.getBlockNumber();
    console.log(`Current block: ${blockNumber}`);
    console.log("Note: Failed transactions don't show up in events, but successful ones do.");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
