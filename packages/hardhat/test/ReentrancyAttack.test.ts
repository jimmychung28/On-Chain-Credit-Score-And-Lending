import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

describe("Reentrancy Attack Prevention Tests", function () {
  let creditScoring: any;
  let creditLending: any;
  let zkCreditLending: any;
  let zkCreditScoring: any;
  let owner: Signer;
  let attacker: Signer;
  let victim: Signer;

  beforeEach(async function () {
    [owner, attacker, victim] = await ethers.getSigners();

    // Deploy contracts
    const CreditScoringFactory = await ethers.getContractFactory("CreditScoring");
    creditScoring = await CreditScoringFactory.deploy();

    const CreditLendingFactory = await ethers.getContractFactory("CreditLending");
    creditLending = await CreditLendingFactory.deploy(await creditScoring.getAddress());

    const ZKCreditLendingFactory = await ethers.getContractFactory("ZKCreditLending");
    zkCreditLending = await ZKCreditLendingFactory.deploy(await creditScoring.getAddress());

    const ZKCreditScoringFactory = await ethers.getContractFactory("ZKCreditScoring");
    zkCreditScoring = await ZKCreditScoringFactory.deploy(await creditScoring.getAddress());
  });

  describe("CreditScoring Reentrancy Attack Prevention", function () {
    it("Should prevent reentrancy attack on withdrawStake", async function () {
      // Deploy malicious contract
      const MaliciousContractFactory = await ethers.getContractFactory("MaliciousReentrancyAttacker");
      const maliciousContract = await MaliciousContractFactory.deploy(await creditScoring.getAddress());

      // Register user and deposit stake
      await creditScoring.connect(attacker).registerUser();
      await creditScoring.connect(attacker).depositStake({ value: ethers.parseEther("2") });

      // Transfer ownership to malicious contract to allow it to withdraw
      const attackerAddress = await attacker.getAddress();
      const maliciousAddress = await maliciousContract.getAddress();

      // Transfer staking balance to malicious contract
      await creditScoring
        .connect(owner)
        .transferStakeBalance(attackerAddress, maliciousAddress, ethers.parseEther("2"));

      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(maliciousAddress);

      // Attempt reentrancy attack - should fail
      await expect((maliciousContract as any).connect(attacker).attack()).to.be.revertedWith(
        "ReentrancyGuard: reentrant call",
      );

      // Verify no extra funds were stolen
      const finalBalance = await ethers.provider.getBalance(maliciousAddress);
      expect(finalBalance).to.equal(initialBalance);
    });

    it("Should allow normal withdrawal after preventing reentrancy", async function () {
      // Register user and deposit stake
      await creditScoring.connect(victim).registerUser();
      await creditScoring.connect(victim).depositStake({ value: ethers.parseEther("1") });

      const initialBalance = await ethers.provider.getBalance(await victim.getAddress());

      // Normal withdrawal should work
      const tx = await creditScoring.connect(victim).withdrawStake(ethers.parseEther("0.5"));
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(await victim.getAddress());

      // Should have received 0.5 ETH minus gas
      const expectedBalance = initialBalance + ethers.parseEther("0.5") - BigInt(gasUsed);
      const tolerance = ethers.parseEther("0.01");
      expect(finalBalance).to.be.within(expectedBalance - tolerance, expectedBalance + tolerance);
    });
  });

  describe("CreditLending Reentrancy Attack Prevention", function () {
    it("Should prevent reentrancy attack on unstakeETH", async function () {
      // Deploy malicious contract
      const MaliciousLendingAttackerFactory = await ethers.getContractFactory("MaliciousLendingAttacker");
      const maliciousContract = await MaliciousLendingAttackerFactory.deploy(await creditLending.getAddress());

      // Fund the lending pool
      await creditLending.connect(victim).stakeETH({ value: ethers.parseEther("10") });

      // Transfer some shares to malicious contract
      const maliciousAddress = await maliciousContract.getAddress();
      await creditLending
        .connect(owner)
        .transferShares(await victim.getAddress(), maliciousAddress, ethers.parseEther("2"));

      // Get initial contract balance
      const initialBalance = await ethers.provider.getBalance(maliciousAddress);

      // Attempt reentrancy attack - should fail
      await expect((maliciousContract as any).connect(attacker).attackUnstake()).to.be.revertedWith(
        "ReentrancyGuard: reentrant call",
      );

      // Verify no extra funds were stolen
      const finalBalance = await ethers.provider.getBalance(maliciousAddress);
      expect(finalBalance).to.equal(initialBalance);
    });

    it("Should prevent reentrancy attack on withdrawFromPool", async function () {
      // Deploy malicious contract
      const MaliciousLendingAttackerFactory = await ethers.getContractFactory("MaliciousLendingAttacker");
      const maliciousContract = await MaliciousLendingAttackerFactory.deploy(await creditLending.getAddress());

      // Fund the lending pool
      await creditLending.connect(victim).stakeETH({ value: ethers.parseEther("10") });

      // Transfer some shares to malicious contract
      const maliciousAddress = await maliciousContract.getAddress();
      await creditLending
        .connect(owner)
        .transferShares(await victim.getAddress(), maliciousAddress, ethers.parseEther("2"));

      // Get initial contract balance
      const initialBalance = await ethers.provider.getBalance(maliciousAddress);

      // Attempt reentrancy attack - should fail
      await expect((maliciousContract as any).connect(attacker).attackWithdraw()).to.be.revertedWith(
        "ReentrancyGuard: reentrant call",
      );

      // Verify no extra funds were stolen
      const finalBalance = await ethers.provider.getBalance(maliciousAddress);
      expect(finalBalance).to.equal(initialBalance);
    });
  });

  describe("ZKCreditLending Reentrancy Attack Prevention", function () {
    it("Should prevent reentrancy attack on ZK lending functions", async function () {
      // Deploy malicious contract
      const MaliciousZKAttackerFactory = await ethers.getContractFactory("MaliciousZKLendingAttacker");
      const maliciousContract = await MaliciousZKAttackerFactory.deploy(await zkCreditLending.getAddress());

      // Fund the lending pool
      await zkCreditLending.connect(victim).stakeETH({ value: ethers.parseEther("10") });

      // Transfer some shares to malicious contract
      const maliciousAddress = await maliciousContract.getAddress();
      await zkCreditLending
        .connect(owner)
        .transferShares(await victim.getAddress(), maliciousAddress, ethers.parseEther("2"));

      // Get initial contract balance
      const initialBalance = await ethers.provider.getBalance(maliciousAddress);

      // Attempt reentrancy attack - should fail
      await expect((maliciousContract as any).connect(attacker).attackUnstake()).to.be.revertedWith(
        "ReentrancyGuard: reentrant call",
      );

      // Verify no extra funds were stolen
      const finalBalance = await ethers.provider.getBalance(maliciousAddress);
      expect(finalBalance).to.equal(initialBalance);
    });
  });

  describe("ZKCreditScoring Reentrancy Attack Prevention", function () {
    it("Should prevent reentrancy attack on ZK scoring withdrawStake", async function () {
      // Deploy malicious contract
      const MaliciousZKScoringAttackerFactory = await ethers.getContractFactory("MaliciousZKScoringAttacker");
      const maliciousContract = await MaliciousZKScoringAttackerFactory.deploy(await zkCreditScoring.getAddress());

      // Register and deposit stake
      await zkCreditScoring.connect(attacker).registerUser();
      await zkCreditScoring.connect(attacker).depositStake({ value: ethers.parseEther("2") });

      // Transfer staking balance to malicious contract
      const attackerAddress = await attacker.getAddress();
      const maliciousAddress = await maliciousContract.getAddress();
      await zkCreditScoring
        .connect(owner)
        .transferStakeBalance(attackerAddress, maliciousAddress, ethers.parseEther("2"));

      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(maliciousAddress);

      // Attempt reentrancy attack - should fail
      await expect((maliciousContract as any).connect(attacker).attack()).to.be.revertedWith(
        "ReentrancyGuard: reentrant call",
      );

      // Verify no extra funds were stolen
      const finalBalance = await ethers.provider.getBalance(maliciousAddress);
      expect(finalBalance).to.equal(initialBalance);
    });
  });

  describe("Gas Usage Verification", function () {
    it("Should not significantly increase gas usage after reentrancy fixes", async function () {
      // Register user and deposit stake
      await creditScoring.connect(victim).registerUser();
      await creditScoring.connect(victim).depositStake({ value: ethers.parseEther("1") });

      // Measure gas usage for withdrawal
      const tx = await creditScoring.connect(victim).withdrawStake(ethers.parseEther("0.5"));
      const receipt = await tx.wait();

      // Verify gas usage is reasonable (should be under 100k gas)
      expect(receipt!.gasUsed).to.be.lt(100000);
    });
  });

  describe("State Consistency After Failed Attacks", function () {
    it("Should maintain correct state after failed reentrancy attack", async function () {
      // Deploy malicious contract
      const MaliciousContractFactory = await ethers.getContractFactory("MaliciousReentrancyAttacker");
      const maliciousContract = await MaliciousContractFactory.deploy(await creditScoring.getAddress());

      // Register user and deposit stake
      await creditScoring.connect(attacker).registerUser();
      await creditScoring.connect(attacker).depositStake({ value: ethers.parseEther("2") });

      // Transfer to malicious contract and attempt attack
      const attackerAddress = await attacker.getAddress();
      const maliciousAddress = await maliciousContract.getAddress();
      await creditScoring
        .connect(owner)
        .transferStakeBalance(attackerAddress, maliciousAddress, ethers.parseEther("2"));

      // Failed attack attempt
      try {
        await (maliciousContract as any).connect(attacker).attack();
      } catch {
        // Expected to fail - error is intentionally ignored
      }

      // Verify state is still consistent
      const finalStakeBalance = await creditScoring.stakingBalances(maliciousAddress);
      expect(finalStakeBalance).to.equal(ethers.parseEther("2"));

      // Normal withdrawal should still work
      await expect(creditScoring.connect(owner).withdrawStakeAsOwner(maliciousAddress, ethers.parseEther("1"))).to.not
        .be.reverted;
    });
  });
});
