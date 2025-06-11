import { ethers } from "hardhat";

async function main() {
  console.log("🌐 Testing Enhanced Universal Score Functionality...\n");

  // Get deployed contracts
  const zkCreditScoring = await ethers.getContract("ZKCreditScoring");
  const crossChainAggregator = await ethers.getContract("CrossChainCreditAggregator");

  console.log(`📍 ZK Credit Scoring: ${await zkCreditScoring.getAddress()}`);
  console.log(`📍 CrossChain Aggregator: ${await crossChainAggregator.getAddress()}\n`);

  // Get test signer
  const [signer] = await ethers.getSigners();
  const userAddress = signer.address;

  console.log(`👤 Testing with user: ${userAddress}\n`);

  // Check if user is registered
  const profile = await zkCreditScoring.getCreditProfile(userAddress);
  console.log(`📊 User Profile: [${profile[0]}, ${profile[1]}, ${profile[2]}, ${profile[3]}, ${profile[4]}]`);

  if (!profile[2]) {
    console.log("📝 User not registered. Registering first...");
    const registerTx = await zkCreditScoring.connect(signer).registerUser();
    await registerTx.wait();
    console.log("✅ User registered successfully!\n");
  } else {
    console.log(`✅ User already registered with score: ${profile[0]}\n`);
  }

  // Test fee estimation
  console.log("💰 Estimating Universal Score fee...");
  const estimatedFee = await crossChainAggregator.estimateUniversalScoreFee(userAddress);
  console.log(`   Estimated fee: ${ethers.formatEther(estimatedFee)} ETH\n`);

  // Request Universal Score
  console.log("🌐 Requesting Universal Score with enhanced multi-chain simulation...");
  try {
    const requestTx = await crossChainAggregator.connect(signer).requestUniversalScore(userAddress, {
      value: estimatedFee,
    });
    console.log("📤 Transaction sent, waiting for confirmation...");

    const receipt = await requestTx.wait();
    console.log("✅ Universal Score request completed!");
    console.log(`⛽ Gas used: ${receipt.gasUsed}\n`);

    // Check the events
    const events = receipt.logs;
    for (const event of events) {
      try {
        const parsedEvent = crossChainAggregator.interface.parseLog(event);
        if (parsedEvent) {
          console.log(`📡 Event: ${parsedEvent.name}`);
          if (parsedEvent.name === "UniversalScoreCalculated") {
            console.log(`   User: ${parsedEvent.args.user}`);
            console.log(`   Universal Score: ${parsedEvent.args.score}`);
            console.log(`   Request ID: ${parsedEvent.args.requestId}`);
          } else if (parsedEvent.name === "ChainScoreSimulated") {
            console.log(`   Chain ID: ${parsedEvent.args.chainId}`);
            console.log(`   Simulated Score: ${parsedEvent.args.score}`);
          } else if (parsedEvent.name === "CrossChainDataAggregated") {
            console.log(`   Total Chains: ${parsedEvent.args.totalChains}`);
            console.log(`   Final Score: ${parsedEvent.args.weightedScore}`);
          }
        }
      } catch {
        // Skip events we can't parse
      }
    }

    // Get the Universal Score
    console.log("\n📊 Retrieving Universal Score details...");
    const [score, timestamp, isStale] = await crossChainAggregator.getUniversalScore(userAddress);
    console.log(`   Universal Score: ${score}`);
    console.log(`   Last Updated: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
    console.log(`   Is Stale: ${isStale}`);

    // Get detailed chain data
    console.log("\n🔗 Chain-by-chain breakdown:");
    try {
      const chainData = await crossChainAggregator.getUserChainData(userAddress);
      const [chains, names, scores, weights, timestamps] = chainData;

      console.log("=====================================");
      for (let i = 0; i < chains.length; i++) {
        const weightPercent = (Number(weights[i]) / 100).toFixed(1);
        const updateTime = new Date(Number(timestamps[i]) * 1000).toLocaleString();
        console.log(`${names[i]} (Chain ${chains[i]})`);
        console.log(`   Score: ${scores[i]} | Weight: ${weightPercent}%`);
        console.log(`   Updated: ${updateTime}`);
        console.log("-------------------------------------");
      }
      console.log("=====================================");
    } catch (e) {
      console.log(`⚠️  Could not retrieve chain data: ${e}`);
    }
  } catch (error: any) {
    console.error("❌ Universal Score request failed:");
    console.error(`   Error: ${error.message}`);
    if (error.reason) console.error(`   Reason: ${error.reason}`);
  }

  console.log("\n🎉 Enhanced Universal Score test complete!");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
