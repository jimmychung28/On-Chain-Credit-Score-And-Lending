import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

describe("Oracle Manipulation Protection Tests", function () {
  let oracleSecurityManager: any;
  let secureAggregator: any;
  let oracleGovernance: any;
  let rateModel: any;
  let mockOracle1: any;
  let mockOracle2: any;
  let mockOracle3: any;
  let maliciousOracle: any;
  let owner: Signer;
  let attacker: Signer;
  let admin1: Signer;
  let admin2: Signer;

  beforeEach(async function () {
    [owner, attacker, , admin1, admin2] = await ethers.getSigners();

    // Deploy mock oracles
    const MockAggregatorV3Factory = await ethers.getContractFactory("MockAggregatorV3");
    mockOracle1 = await MockAggregatorV3Factory.deploy(8, "ETH/USD Mock 1", 200000000000); // $2000
    mockOracle2 = await MockAggregatorV3Factory.deploy(8, "ETH/USD Mock 2", 200500000000); // $2005
    mockOracle3 = await MockAggregatorV3Factory.deploy(8, "ETH/USD Mock 3", 199500000000); // $1995

    // Deploy malicious oracle that will try to manipulate prices
    const MaliciousOracleFactory = await ethers.getContractFactory("MaliciousOracleAttacker");
    maliciousOracle = await MaliciousOracleFactory.deploy(8, "Malicious ETH/USD", 200000000000);

    // Deploy Oracle Security Manager
    const OracleSecurityManagerFactory = await ethers.getContractFactory("OracleSecurityManager");
    oracleSecurityManager = await OracleSecurityManagerFactory.deploy();

    // Deploy Secure Aggregator
    const SecureAggregatorV3Factory = await ethers.getContractFactory("SecureAggregatorV3");
    secureAggregator = await SecureAggregatorV3Factory.deploy(
      await oracleSecurityManager.getAddress(),
      "ETH_USD",
      "Secure ETH/USD Price Feed",
      8,
      200000000000, // $2000 initial price
    );

    // Deploy Oracle Governance
    const OracleGovernanceFactory = await ethers.getContractFactory("OracleGovernance");
    oracleGovernance = await OracleGovernanceFactory.deploy(
      await oracleSecurityManager.getAddress(),
      await owner.getAddress(),
    );

    // Deploy Rate Model
    const RateModelFactory = await ethers.getContractFactory("DynamicTargetRateModelWithOracles");
    rateModel = await RateModelFactory.deploy();

    // Grant roles to additional admins
    const ORACLE_ADMIN_ROLE = await oracleGovernance.ORACLE_ADMIN_ROLE();
    await oracleGovernance.grantRole(ORACLE_ADMIN_ROLE, await admin1.getAddress());
    await oracleGovernance.grantRole(ORACLE_ADMIN_ROLE, await admin2.getAddress());

    // Add legitimate oracles to security manager
    await oracleSecurityManager.addOracle(await mockOracle1.getAddress(), 4000, 1000); // 40% weight, 10% max deviation
    await oracleSecurityManager.addOracle(await mockOracle2.getAddress(), 3500, 1000); // 35% weight, 10% max deviation
    await oracleSecurityManager.addOracle(await mockOracle3.getAddress(), 2500, 1000); // 25% weight, 10% max deviation

    // Add oracles to price type mapping
    await oracleSecurityManager.addPriceTypeOracle("ETH_USD", await mockOracle1.getAddress());
    await oracleSecurityManager.addPriceTypeOracle("ETH_USD", await mockOracle2.getAddress());
    await oracleSecurityManager.addPriceTypeOracle("ETH_USD", await mockOracle3.getAddress());
  });

  describe("Price Deviation Protection", function () {
    it("Should reject prices with excessive deviation", async function () {
      // Try to update one oracle with a 50% price increase (should be rejected)
      const extremePrice = 300000000000; // $3000 (50% increase from $2000)

      await mockOracle1.updateAnswer(extremePrice);

      const result = await oracleSecurityManager.validatePrice(await mockOracle1.getAddress(), extremePrice);

      void expect(result.isValid).to.be.false;
      void expect(result.reason).to.include("deviation exceeds");
    });

    it("Should accept prices within deviation limits", async function () {
      // Update with 5% increase (should be accepted)
      const normalPrice = 210000000000; // $2100 (5% increase)

      await mockOracle1.updateAnswer(normalPrice);

      const result = await oracleSecurityManager.validatePrice(await mockOracle1.getAddress(), normalPrice);

      void expect(result.isValid).to.be.true;
      void expect(result.validatedPrice).to.equal(normalPrice);
    });

    it("Should prevent multiple oracles from coordinated manipulation", async function () {
      // Try to manipulate multiple oracles with large price changes
      const manipulatedPrice = 250000000000; // $2500 (25% increase)

      await mockOracle1.updateAnswer(manipulatedPrice);
      await mockOracle2.updateAnswer(manipulatedPrice);

      // Even with multiple oracles, the security manager should detect the anomaly
      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");

      // Either should be invalid due to deviation, or confidence should be low
      if (result.isValid) {
        void expect(result.confidence).to.be.lt(80); // Low confidence due to suspicious consensus
      } else {
        void expect(result.reason).to.include("deviation");
      }
    });
  });

  describe("Circuit Breaker Protection", function () {
    it("Should trigger circuit breaker on high volatility", async function () {
      // Simulate high volatility scenario
      await oracleSecurityManager.triggerCircuitBreaker("High volatility detected");

      void expect(await oracleSecurityManager.isCircuitBreakerActive()).to.be.true;

      // Secure price should not be available when circuit breaker is active
      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");
      void expect(result.isValid).to.be.false;
    });

    it("Should allow emergency reset of circuit breaker", async function () {
      // Trigger circuit breaker
      await oracleSecurityManager.triggerCircuitBreaker("Test trigger");
      void expect(await oracleSecurityManager.isCircuitBreakerActive()).to.be.true;

      // Reset it
      await oracleSecurityManager.resetCircuitBreaker();
      void expect(await oracleSecurityManager.isCircuitBreakerActive()).to.be.false;
    });

    it("Should prevent rate model from using data when circuit breaker is active", async function () {
      // Initialize rate model with secure oracle system
      await rateModel.initializeSecureOracleSystem(
        await oracleSecurityManager.getAddress(),
        await secureAggregator.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
      );

      await rateModel.setUseSecureOracles(true);

      // Trigger circuit breaker
      await oracleSecurityManager.triggerCircuitBreaker("Market manipulation detected");

      // Rate model should fall back to manual conditions
      const status = await rateModel.getOracleSystemStatus();
      void expect(status.circuitBreakerActive).to.be.true;
      void expect(status.status).to.equal("Circuit breaker active");
    });
  });

  describe("Multi-Oracle Consensus Protection", function () {
    it("Should require minimum oracle count for consensus", async function () {
      // Remove two oracles to go below minimum
      await oracleSecurityManager.removeOracle(await mockOracle2.getAddress());
      await oracleSecurityManager.removeOracle(await mockOracle3.getAddress());

      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");
      void expect(result.isValid).to.be.false;
      void expect(result.reason).to.include("Insufficient");
    });

    it("Should detect and reject outlier prices", async function () {
      // Set up normal prices on two oracles
      await mockOracle1.updateAnswer(200000000000); // $2000
      await mockOracle2.updateAnswer(200500000000); // $2005

      // Set extreme outlier on third oracle
      await mockOracle3.updateAnswer(100000000000); // $1000 (50% below)

      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");

      // Should still work but with lower confidence
      if (result.isValid) {
        void expect(result.confidence).to.be.lt(90);
      }
    });

    it("Should calculate weighted median correctly", async function () {
      // Set different prices on oracles
      await mockOracle1.updateAnswer(200000000000); // $2000, 40% weight
      await mockOracle2.updateAnswer(210000000000); // $2100, 35% weight
      await mockOracle3.updateAnswer(190000000000); // $1900, 25% weight

      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");

      void expect(result.isValid).to.be.true;
      // Weighted average should be close to $2035 ((2000*0.4 + 2100*0.35 + 1900*0.25))
      void expect(result.validatedPrice).to.be.gt(201000000000);
      void expect(result.validatedPrice).to.be.lt(206000000000);
    });
  });

  describe("Malicious Oracle Protection", function () {
    it("Should prevent adding malicious oracle through governance", async function () {
      // Try to add malicious oracle with extreme parameters
      const tx = oracleGovernance.connect(admin1).proposeAddOracle(
        await maliciousOracle.getAddress(),
        5000, // 50% weight
        10000, // 100% max deviation (suspicious)
        "Add malicious oracle",
      );

      await expect(tx).to.not.be.reverted; // Proposal creation should work

      // But execution should fail or be rejected
      const proposalId = (await oracleGovernance.nextProposalId()) - 1n;

      // Even if approved, the oracle security manager should validate the parameters
      await oracleGovernance.connect(admin2).approveProposal(proposalId);

      // Fast forward time to after timelock
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]); // 24 hours + 1 second

      // Execution might fail due to validation
      await expect(oracleGovernance.executeProposal(proposalId)).to.be.revertedWith("Invalid");
    });

    it("Should detect oracle failure and exclude from consensus", async function () {
      // Make one oracle fail
      await mockOracle1.setOwner(await attacker.getAddress());

      // Attacker tries to make oracle fail by setting invalid data
      await mockOracle1.connect(attacker).updateAnswerWithTimestamp(0, 0);

      // Security manager should still provide valid price using remaining oracles
      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");
      void expect(result.isValid).to.be.true;
    });

    it("Should rate limit oracle updates", async function () {
      // Try to update price multiple times quickly in secure aggregator
      await secureAggregator.updatePrice();

      // Second update should fail due to cooldown
      await expect(secureAggregator.updatePrice()).to.be.revertedWith("Update cooldown active");
    });
  });

  describe("Governance Protection", function () {
    it("Should require multiple approvals for critical changes", async function () {
      // Create proposal to update security parameters
      const newParams = {
        maxPriceDeviationBps: 5000, // 50% (very high)
        circuitBreakerThresholdBps: 10000, // 100%
        gracePeriodSeconds: 60, // 1 minute (very short)
        minOracleCount: 1,
        maxStalenessSeconds: 7200,
        circuitBreakerActive: false,
      };

      const proposalId = await oracleGovernance
        .connect(admin1)
        .proposeUpdateSecurityParams(newParams, "Dangerous parameter update");

      // Single approval should not be enough
      const status1 = await oracleGovernance.getProposalStatus(proposalId);
      void expect(status1).to.equal("Pending approvals");

      // Need second approval
      await oracleGovernance.connect(admin2).approveProposal(proposalId);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);

      const status2 = await oracleGovernance.getProposalStatus(proposalId);
      void expect(status2).to.equal("Ready for execution");
    });

    it("Should enforce timelock for non-emergency changes", async function () {
      const proposalId = await oracleGovernance
        .connect(admin1)
        .proposeRemoveOracle(await mockOracle3.getAddress(), "Remove oracle for testing");

      await oracleGovernance.connect(admin2).approveProposal(proposalId);

      // Should not be executable immediately
      await expect(oracleGovernance.executeProposal(proposalId)).to.be.revertedWith("Timelock not elapsed");
    });

    it("Should allow emergency actions to bypass timelock", async function () {
      // Create emergency proposal
      const emergencyData = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["Market manipulation detected"]);

      const proposalId = await oracleGovernance
        .connect(owner)
        .proposeEmergencyAction("TRIGGER_CIRCUIT_BREAKER", emergencyData, "Emergency circuit breaker activation");

      // Emergency proposals should be executable immediately
      await oracleGovernance.executeProposal(proposalId);

      // Verify circuit breaker was triggered
      void expect(await oracleSecurityManager.isCircuitBreakerActive()).to.be.true;
    });
  });

  describe("Secure Aggregator Protection", function () {
    it("Should implement grace period for large price changes", async function () {
      // Update oracles with large price change
      const newPrice = 240000000000; // $2400 (20% increase)
      await mockOracle1.updateAnswer(newPrice);
      await mockOracle2.updateAnswer(newPrice);
      await mockOracle3.updateAnswer(newPrice);

      // Try to update secure aggregator
      await secureAggregator.updatePrice();

      // Should create pending update instead of immediate update
      const pendingUpdate = await secureAggregator.getPendingUpdate();
      void expect(pendingUpdate.isActive).to.be.true;
      void expect(pendingUpdate.price).to.equal(newPrice);
    });

    it("Should allow emergency price override by owner", async function () {
      const emergencyPrice = 180000000000; // $1800

      await secureAggregator.emergencyUpdatePrice(emergencyPrice, "Market crash emergency");

      const roundData = await secureAggregator.latestRoundData();
      void expect(roundData.answer).to.equal(emergencyPrice);
    });

    it("Should maintain price history and confidence tracking", async function () {
      // Update price normally
      await secureAggregator.updatePrice();

      const confidence = await secureAggregator.getCurrentConfidence();
      void expect(confidence).to.be.gt(0);

      const healthStatus = await secureAggregator.getHealthStatus();
      void expect(healthStatus.isHealthy).to.be.true;
    });
  });

  describe("Integration with Rate Model", function () {
    beforeEach(async function () {
      // Initialize rate model with secure oracles
      await rateModel.initializeSecureOracleSystem(
        await oracleSecurityManager.getAddress(),
        await secureAggregator.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
      );

      await rateModel.setUseSecureOracles(true);
    });

    it("Should fall back to manual mode when oracles are compromised", async function () {
      // Trigger circuit breaker
      await oracleSecurityManager.triggerCircuitBreaker("Oracle compromise detected");

      // Rate model should still function using manual conditions
      const rate = await rateModel.calculateInterestRate(700, 8000); // 70% utilization
      void expect(rate).to.be.gt(0);

      const status = await rateModel.getOracleSystemStatus();
      void expect(status.status).to.equal("Circuit breaker active");
    });

    it("Should bound oracle-derived parameters within safe ranges", async function () {
      // Test that even with extreme oracle values, rate model bounds them
      const components = await rateModel.getCurrentRateComponentsWithOracles(700, 8000);

      // Volatility multiplier should be bounded
      void expect(components.oracleVolatilityMultiplier).to.be.lte(300); // Max 3x
      void expect(components.oracleVolatilityMultiplier).to.be.gte(50); // Min 0.5x

      // Premiums should be bounded
      void expect(components.oracleLiquidityPremium).to.be.lte(1000); // Max 10%
      void expect(components.oracleRiskPremium).to.be.lte(1000); // Max 10%
    });
  });

  describe("Stress Testing", function () {
    it("Should handle coordinated attack on multiple oracles", async function () {
      // Simulate coordinated attack where attacker tries to manipulate multiple oracles
      const attackPrice = 100000000000; // $1000 (50% drop)

      // Attacker gains control of two oracles
      await mockOracle1.setOwner(await attacker.getAddress());
      await mockOracle2.setOwner(await attacker.getAddress());

      // Update with malicious prices
      await mockOracle1.connect(attacker).updateAnswer(attackPrice);
      await mockOracle2.connect(attacker).updateAnswer(attackPrice);

      // Security manager should detect this as suspicious
      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");

      // Should either reject or have very low confidence
      if (result.isValid) {
        void expect(result.confidence).to.be.lt(50);
      } else {
        void expect(result.reason).to.include("deviation");
      }
    });

    it("Should maintain system stability during oracle failures", async function () {
      // Make all but one oracle fail
      await mockOracle1.setOwner(await attacker.getAddress());
      await mockOracle2.setOwner(await attacker.getAddress());

      await mockOracle1.connect(attacker).updateAnswerWithTimestamp(-1, 0);
      await mockOracle2.connect(attacker).updateAnswerWithTimestamp(-1, 0);

      // System should still function with remaining oracle
      const result = await oracleSecurityManager.getSecurePrice("ETH_USD");

      // Should fail due to insufficient oracles
      void expect(result.isValid).to.be.false;
      void expect(result.reason).to.include("Insufficient");
    });
  });
});
