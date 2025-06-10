import { parseEther } from "viem";
import hre from "hardhat";

async function main() {
  console.log("🚀 Testing Enhanced Credit Scoring System\n");

  const [deployer] = await hre.ethers.getSigners();
  const testUser = "0x010C5E560D0e042B53Cedba9A7404E90F82D7592";

  // Get contract instances
  const creditScoring = (await hre.ethers.getContract("CreditScoring", deployer)) as any;

  console.log("📋 Current Contract State:");
  console.log(`- CreditScoring: ${await creditScoring.getAddress()}`);
  console.log(`- Test User: ${testUser}\n`);

  try {
    // Add deployer as verified address for testing
    console.log("🔧 Adding deployer as verified address...");
    await creditScoring.addVerifiedAddress(deployer.address);
    console.log("✅ Deployer added as verified address\n");

    // Check if user is registered
    let isRegistered = false;
    try {
      const profile = await creditScoring.getCreditProfile(testUser);
      isRegistered = profile.isActive;
    } catch {
      console.log("❌ User not registered, registering now...");
    }

    // Register user if not already registered
    if (!isRegistered) {
      console.log("🔄 Registering test user...");
      await creditScoring.createTestUser(testUser);
      console.log("✅ User registered successfully\n");
    }

    // Demonstrate sophisticated transaction recording
    console.log("💰 Recording sophisticated transactions...");

    // Record various types of transactions
    const transactions = [
      {
        volume: parseEther("5.0"),
        gasUsed: 50000,
        counterparty: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI token
        methodSignature: "0xa9059cbb", // transfer
        transactionType: 1, // DeFi
        description: "DeFi swap transaction",
      },
      {
        volume: parseEther("2.5"),
        gasUsed: 150000,
        counterparty: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Aave
        methodSignature: "0xe8eda9df", // deposit
        transactionType: 1, // DeFi
        description: "Liquidity provision",
      },
      {
        volume: parseEther("0.1"),
        gasUsed: 80000,
        counterparty: "0x60f80121c31a0d46b5279700f9df786054aa5ee5", // NFT marketplace
        methodSignature: "0x23b872dd", // transferFrom
        transactionType: 2, // NFT
        description: "NFT purchase",
      },
    ];

    for (const tx of transactions) {
      console.log(`  🔄 Recording ${tx.description}...`);
      await creditScoring.recordTransaction(
        testUser,
        tx.volume,
        tx.gasUsed,
        tx.counterparty,
        tx.methodSignature,
        tx.transactionType,
      );
    }
    console.log("✅ Transactions recorded\n");

    // Record protocol interactions
    console.log("🏛️ Recording protocol interactions...");
    await creditScoring.recordProtocolInteraction(
      testUser,
      "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // Uniswap
      parseEther("10.0"),
    );

    await creditScoring.recordProtocolInteraction(
      testUser,
      "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Aave
      parseEther("5.0"),
    );
    console.log("✅ Protocol interactions recorded\n");

    // Record asset holdings
    console.log("🏦 Recording asset holdings...");
    const assets = [
      { token: "0xa0b86a33e6441e0412b7b06b2e3ef51bf39c02a", amount: parseEther("1000"), isStablecoin: true }, // USDC
      { token: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", amount: parseEther("50"), isStablecoin: false }, // UNI
      { token: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", amount: parseEther("10"), isStablecoin: false }, // AAVE
      { token: "0x514910771af9ca656af840dff83e8264ecf986ca", amount: parseEther("20"), isStablecoin: false }, // LINK
    ];

    for (const asset of assets) {
      console.log(`  🔄 Recording holding: ${asset.isStablecoin ? "Stablecoin" : "Token"}...`);
      await creditScoring.recordAssetHolding(testUser, asset.token, asset.amount, asset.isStablecoin);
    }
    console.log("✅ Asset holdings recorded\n");

    // Record DeFi activities
    console.log("💎 Recording DeFi activities...");
    await creditScoring.recordLiquidityProvision(testUser, parseEther("15.0"));
    await creditScoring.recordStakingRewards(testUser, parseEther("0.5"));
    console.log("✅ DeFi activities recorded\n");

    // Record governance participation
    console.log("🗳️ Recording governance participation...");
    for (let i = 0; i < 3; i++) {
      await creditScoring.recordGovernanceVote(testUser);
    }
    console.log("✅ Governance votes recorded\n");

    // Add social attestations
    console.log("⭐ Adding social attestations...");
    const attestations = [
      { type: "0x677974636f696e5f6964656e74697479000000000000000000000000000000", score: 25 }, // gitcoin_identity
      { type: "0x74776974746572000000000000000000000000000000000000000000000000", score: 15 }, // twitter
      { type: "0x646973636f726400000000000000000000000000000000000000000000000000", score: 10 }, // discord
    ];

    for (const attestation of attestations) {
      console.log(`  🔄 Adding attestation: ${attestation.type.slice(0, 20)}...`);
      await creditScoring.addAttestation(testUser, attestation.type, attestation.score);
    }
    console.log("✅ Social attestations added\n");

    // Get and display enhanced profile
    console.log("📊 Enhanced Credit Profile Results:");
    console.log("=====================================");

    const profile = await creditScoring.getCreditProfile(testUser);
    const enhancedProfile = await creditScoring.getEnhancedProfile(testUser);
    const scoreBreakdown = await creditScoring.getScoreBreakdown(testUser);

    console.log(`\n🎯 Overall Credit Score: ${profile.score}`);
    console.log(`📅 Last Updated: ${new Date(Number(profile.lastUpdated) * 1000).toLocaleString()}\n`);

    console.log("🔍 Score Breakdown:");
    console.log(`  • Transactional Behavior: ${scoreBreakdown[0]} (20% weight)`);
    console.log(`  • Behavioral Patterns: ${scoreBreakdown[1]} (15% weight)`);
    console.log(`  • Asset Management: ${scoreBreakdown[2]} (15% weight)`);
    console.log(`  • DeFi Participation: ${scoreBreakdown[3]} (20% weight)`);
    console.log(`  • Repayment History: ${scoreBreakdown[4]} (20% weight)`);
    console.log(`  • Governance Participation: ${scoreBreakdown[5]} (5% weight)`);
    console.log(`  • Social Reputation: ${scoreBreakdown[6]} (5% weight)\n`);

    console.log("📈 Enhanced Metrics:");
    console.log(`  • Total Gas Paid: ${enhancedProfile[0]} units`);
    console.log(`  • Unique Protocols: ${enhancedProfile[1]}`);
    console.log(`  • Stablecoin Ratio: ${enhancedProfile[2]}%`);
    console.log(`  • Asset Diversity: ${enhancedProfile[3]} tokens`);
    console.log(`  • Avg Holding Period: ${enhancedProfile[4]} blocks`);
    console.log(`  • Liquidity Provided: ${enhancedProfile[5]} wei`);
    console.log(`  • Staking Rewards: ${enhancedProfile[6]} wei`);
    console.log(`  • Governance Votes: ${enhancedProfile[7]}`);
    console.log(`  • NFT Interactions: ${enhancedProfile[8]}`);
    console.log(`  • Social Score: ${enhancedProfile[9]}\n`);

    console.log("🏆 Credit Factors Analysis:");

    // Analyze transactional behavior
    const volumeInEth = Number(profile.totalVolume) / 1e18;
    console.log(`\n💰 Transactional Behavior (Score: ${scoreBreakdown[0]}):`);
    console.log(`  • Transaction Volume: ${volumeInEth.toFixed(2)} ETH`);
    console.log(`  • Transaction Count: ${profile.transactionCount}`);
    console.log(`  • Average Transaction: ${(volumeInEth / Number(profile.transactionCount)).toFixed(4)} ETH`);
    console.log(`  • Account Age: ${Number(profile.accountAge)} blocks`);

    // Analyze behavioral patterns
    const avgGas = Number(enhancedProfile[0]) / Number(profile.transactionCount);
    console.log(`\n🎯 Behavioral Patterns (Score: ${scoreBreakdown[1]}):`);
    console.log(`  • Average Gas Usage: ${avgGas.toFixed(0)} units`);
    console.log(`  • Protocol Diversity: ${enhancedProfile[1]} unique protocols`);
    console.log(`  • NFT Activity: ${enhancedProfile[8]} interactions`);

    // Analyze asset management
    console.log(`\n🏦 Asset Management (Score: ${scoreBreakdown[2]}):`);
    console.log(`  • Portfolio Diversity: ${enhancedProfile[3]} different tokens`);
    console.log(`  • Stablecoin Allocation: ${enhancedProfile[2]}% of portfolio`);
    console.log(`  • Average Holding Period: ${enhancedProfile[4]} blocks`);

    // Analyze DeFi participation
    const liquidityEth = Number(enhancedProfile[5]) / 1e18;
    const stakingEth = Number(enhancedProfile[6]) / 1e18;
    console.log(`\n💎 DeFi Participation (Score: ${scoreBreakdown[3]}):`);
    console.log(`  • Liquidity Provided: ${liquidityEth.toFixed(4)} ETH`);
    console.log(`  • Staking Rewards Earned: ${stakingEth.toFixed(4)} ETH`);

    // Analyze repayment history
    const repaymentRate =
      (Number(profile.repaidLoans) / (Number(profile.repaidLoans) + Number(profile.defaultedLoans))) * 100;
    console.log(`\n🏆 Repayment History (Score: ${scoreBreakdown[4]}):`);
    console.log(`  • Total Loans: ${Number(profile.loanCount)}`);
    console.log(`  • Successful Repayments: ${profile.repaidLoans}`);
    console.log(`  • Defaults: ${profile.defaultedLoans}`);
    console.log(`  • Success Rate: ${isNaN(repaymentRate) ? "N/A" : repaymentRate.toFixed(1)}%`);

    // Analyze governance participation
    console.log(`\n🗳️ Governance Participation (Score: ${scoreBreakdown[5]}):`);
    console.log(`  • DAO Votes Cast: ${enhancedProfile[7]}`);
    console.log(`  • Governance Engagement: ${Number(enhancedProfile[7]) > 0 ? "Active" : "None"}`);

    // Analyze social reputation
    console.log(`\n⭐ Social Reputation (Score: ${scoreBreakdown[6]}):`);
    console.log(`  • Social Score Points: ${enhancedProfile[9]}`);
    console.log(`  • Verified Attestations: 3 types added`);
    console.log(`  • Community Standing: ${Number(enhancedProfile[9]) > 30 ? "High" : "Medium"}`);

    console.log("\n🎉 Enhanced Credit Scoring System Test Completed!");
    console.log("=====================================");
    console.log("📊 The system now evaluates creditworthiness based on:");
    console.log("  ✅ Sophisticated transactional behavior patterns");
    console.log("  ✅ Gas efficiency and protocol diversity");
    console.log("  ✅ Asset portfolio management skills");
    console.log("  ✅ Active DeFi ecosystem participation");
    console.log("  ✅ Historical loan repayment performance");
    console.log("  ✅ Governance and community engagement");
    console.log("  ✅ Social attestations and reputation signals");
    console.log("\n🚀 This provides a much more comprehensive and fair");
    console.log("   assessment of creditworthiness in the DeFi ecosystem!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
