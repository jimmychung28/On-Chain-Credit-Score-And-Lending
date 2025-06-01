/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditScoring } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CreditScoring", function () {
  let creditScoring: CreditScoring;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let verifiedContract: HardhatEthersSigner;

  beforeEach(async function () {
    const [, _user1, _user2, _verifiedContract] = await ethers.getSigners();
    user1 = _user1;
    user2 = _user2;
    verifiedContract = _verifiedContract;

    const CreditScoringFactory = await ethers.getContractFactory("CreditScoring");
    creditScoring = await CreditScoringFactory.deploy();
    await creditScoring.waitForDeployment();

    // Add verifiedContract as a verified address
    await creditScoring.addVerifiedAddress(verifiedContract.address);
  });

  describe("User Registration", function () {
    it("Should allow user registration", async function () {
      await creditScoring.connect(user1).registerUser();

      const profile = await creditScoring.getCreditProfile(user1.address);
      expect(profile.isActive).to.be.true;
      expect(profile.score).to.equal(300); // MIN_SCORE
    });

    it("Should not allow duplicate registration", async function () {
      await creditScoring.connect(user1).registerUser();

      await expect(creditScoring.connect(user1).registerUser()).to.be.revertedWith("User already registered");
    });

    it("Should emit UserRegistered event", async function () {
      const tx = await creditScoring.connect(user1).registerUser();
      const receipt = await tx.wait();
      const blockNumber = receipt?.blockNumber;
      const block = await ethers.provider.getBlock(blockNumber!);

      await expect(tx).to.emit(creditScoring, "UserRegistered").withArgs(user1.address, block!.timestamp);
    });
  });

  describe("Transaction Recording", function () {
    beforeEach(async function () {
      await creditScoring.connect(user1).registerUser();
    });

    it("Should allow user to record their own transactions", async function () {
      const volume = ethers.parseEther("1.0");

      await creditScoring.connect(user1).recordTransaction(user1.address, volume, user2.address);

      const profile = await creditScoring.getCreditProfile(user1.address);
      expect(profile.totalVolume).to.equal(volume);
      expect(profile.transactionCount).to.equal(1);
    });

    it("Should allow verified contracts to record transactions", async function () {
      const volume = ethers.parseEther("2.0");

      await creditScoring.connect(verifiedContract).recordTransaction(user1.address, volume, user2.address);

      const profile = await creditScoring.getCreditProfile(user1.address);
      expect(profile.totalVolume).to.equal(volume);
    });

    it("Should not allow unauthorized addresses to record transactions", async function () {
      const volume = ethers.parseEther("1.0");

      await expect(
        creditScoring.connect(user2).recordTransaction(user1.address, volume, user2.address),
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should update credit score after recording transaction", async function () {
      const volume = ethers.parseEther("10.0");
      const initialProfile = await creditScoring.getCreditProfile(user1.address);

      await creditScoring.connect(user1).recordTransaction(user1.address, volume, user2.address);

      const updatedProfile = await creditScoring.getCreditProfile(user1.address);
      expect(updatedProfile.score).to.be.greaterThan(initialProfile.score);
    });
  });

  describe("Staking", function () {
    beforeEach(async function () {
      await creditScoring.connect(user1).registerUser();
    });

    it("Should allow users to deposit stake", async function () {
      const stakeAmount = ethers.parseEther("1.0");

      await creditScoring.connect(user1).depositStake({ value: stakeAmount });

      const stakingBalance = await creditScoring.stakingBalances(user1.address);
      expect(stakingBalance).to.equal(stakeAmount);
    });

    it("Should improve credit score when staking", async function () {
      const initialProfile = await creditScoring.getCreditProfile(user1.address);
      const stakeAmount = ethers.parseEther("5.0");

      await creditScoring.connect(user1).depositStake({ value: stakeAmount });

      const updatedProfile = await creditScoring.getCreditProfile(user1.address);
      expect(updatedProfile.score).to.be.greaterThan(initialProfile.score);
    });

    it("Should allow users to withdraw stake", async function () {
      const stakeAmount = ethers.parseEther("2.0");
      const withdrawAmount = ethers.parseEther("1.0");

      await creditScoring.connect(user1).depositStake({ value: stakeAmount });

      const initialBalance = await ethers.provider.getBalance(user1.address);
      await creditScoring.connect(user1).withdrawStake(withdrawAmount);
      const finalBalance = await ethers.provider.getBalance(user1.address);

      const stakingBalance = await creditScoring.stakingBalances(user1.address);
      expect(stakingBalance).to.equal(stakeAmount - withdrawAmount);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });

    it("Should not allow withdrawal of more than staked", async function () {
      const stakeAmount = ethers.parseEther("1.0");
      const withdrawAmount = ethers.parseEther("2.0");

      await creditScoring.connect(user1).depositStake({ value: stakeAmount });

      await expect(creditScoring.connect(user1).withdrawStake(withdrawAmount)).to.be.revertedWith(
        "Insufficient stake balance",
      );
    });
  });

  describe("Loan Recording", function () {
    beforeEach(async function () {
      await creditScoring.connect(user1).registerUser();
    });

    it("Should allow verified contracts to record loan repayment", async function () {
      const loanAmount = ethers.parseEther("1.0");

      await creditScoring.connect(verifiedContract).recordLoan(
        user1.address,
        loanAmount,
        true, // repaid
      );

      const profile = await creditScoring.getCreditProfile(user1.address);
      expect(profile.loanCount).to.equal(1);
      expect(profile.repaidLoans).to.equal(1);
      expect(profile.defaultedLoans).to.equal(0);
    });

    it("Should allow verified contracts to record loan default", async function () {
      const loanAmount = ethers.parseEther("1.0");

      await creditScoring.connect(verifiedContract).recordLoan(
        user1.address,
        loanAmount,
        false, // defaulted
      );

      const profile = await creditScoring.getCreditProfile(user1.address);
      expect(profile.loanCount).to.equal(1);
      expect(profile.repaidLoans).to.equal(0);
      expect(profile.defaultedLoans).to.equal(1);
    });

    it("Should not allow non-verified contracts to record loans", async function () {
      const loanAmount = ethers.parseEther("1.0");

      await expect(creditScoring.connect(user2).recordLoan(user1.address, loanAmount, true)).to.be.revertedWith(
        "Only verified contracts can record loans",
      );
    });
  });

  describe("Credit Score Calculation", function () {
    beforeEach(async function () {
      await creditScoring.connect(user1).registerUser();
    });

    it("Should return minimum score for new users", async function () {
      const score = await creditScoring.getCreditScore(user1.address);
      expect(score).to.equal(300); // MIN_SCORE
    });

    it("Should increase score with positive factors", async function () {
      // Add transaction volume
      await creditScoring.connect(user1).recordTransaction(user1.address, ethers.parseEther("50.0"), user2.address);

      // Add stake
      await creditScoring.connect(user1).depositStake({
        value: ethers.parseEther("5.0"),
      });

      // Record successful loan repayment
      await creditScoring.connect(verifiedContract).recordLoan(user1.address, ethers.parseEther("1.0"), true);

      const score = await creditScoring.getCreditScore(user1.address);
      expect(score).to.be.greaterThan(300);
    });

    it("Should decrease score with defaults", async function () {
      // First establish some positive history but not too much to avoid hitting max score
      await creditScoring.connect(user1).recordTransaction(user1.address, ethers.parseEther("5.0"), user2.address);
      
      // Record one successful loan first
      await creditScoring.connect(verifiedContract).recordLoan(user1.address, ethers.parseEther("1.0"), true);

      const scoreBeforeDefault = await creditScoring.getCreditScore(user1.address);

      // Record a default
      await creditScoring.connect(verifiedContract).recordLoan(
        user1.address,
        ethers.parseEther("1.0"),
        false, // defaulted
      );

      const scoreAfterDefault = await creditScoring.getCreditScore(user1.address);
      expect(scoreAfterDefault).to.be.lessThan(scoreBeforeDefault);
    });
  });

  describe("Loan Eligibility", function () {
    beforeEach(async function () {
      await creditScoring.connect(user1).registerUser();
    });

    it("Should return false for users below minimum score", async function () {
      const isEligible = await creditScoring.isEligibleForLoan(user1.address, 400);
      expect(isEligible).to.be.false;
    });

    it("Should return true for users above minimum score", async function () {
      // Boost the user's score
      await creditScoring.connect(user1).recordTransaction(user1.address, ethers.parseEther("100.0"), user2.address);

      await creditScoring.connect(user1).depositStake({
        value: ethers.parseEther("10.0"),
      });

      const isEligible = await creditScoring.isEligibleForLoan(user1.address, 400);
      expect(isEligible).to.be.true;
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to add verified addresses", async function () {
      await creditScoring.addVerifiedAddress(user2.address);

      const isVerified = await creditScoring.verifiedAddresses(user2.address);
      expect(isVerified).to.be.true;
    });

    it("Should allow owner to remove verified addresses", async function () {
      await creditScoring.addVerifiedAddress(user2.address);
      await creditScoring.removeVerifiedAddress(user2.address);

      const isVerified = await creditScoring.verifiedAddresses(user2.address);
      expect(isVerified).to.be.false;
    });

    it("Should allow owner to update scoring weights", async function () {
      await creditScoring.updateWeights(30, 25, 10, 25, 10);

      const volumeWeight = await creditScoring.volumeWeight();
      const frequencyWeight = await creditScoring.frequencyWeight();
      const ageWeight = await creditScoring.ageWeight();
      const repaymentWeight = await creditScoring.repaymentWeight();
      const stakingWeight = await creditScoring.stakingWeight();

      expect(volumeWeight).to.equal(30);
      expect(frequencyWeight).to.equal(25);
      expect(ageWeight).to.equal(10);
      expect(repaymentWeight).to.equal(25);
      expect(stakingWeight).to.equal(10);
    });

    it("Should not allow non-owners to update weights", async function () {
      await expect(creditScoring.connect(user1).updateWeights(30, 25, 10, 25, 10)).to.be.revertedWithCustomError(
        creditScoring,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should require weights to sum to 100", async function () {
      await expect(
        creditScoring.updateWeights(30, 25, 10, 25, 15), // sums to 105
      ).to.be.revertedWith("Weights must sum to 100");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await creditScoring.connect(user1).registerUser();
      await creditScoring.connect(user1).recordTransaction(user1.address, ethers.parseEther("1.0"), user2.address);
    });

    it("Should return transaction history length", async function () {
      const length = await creditScoring.getTransactionHistoryLength(user1.address);
      expect(length).to.equal(1);
    });

    it("Should return specific transaction data", async function () {
      const transaction = await creditScoring.getTransaction(user1.address, 0);
      expect(transaction.volume).to.equal(ethers.parseEther("1.0"));
      expect(transaction.counterparty).to.equal(user2.address);
    });

    it("Should revert for out of bounds transaction index", async function () {
      await expect(creditScoring.getTransaction(user1.address, 1)).to.be.revertedWith(
        "Transaction index out of bounds",
      );
    });
  });
});
