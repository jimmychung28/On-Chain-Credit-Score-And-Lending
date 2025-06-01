/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditLending, CreditScoring } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CreditLending", function () {
  let creditLending: CreditLending;
  let creditScoring: CreditScoring;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    const [, _user1, _user2] = await ethers.getSigners();
    user1 = _user1;
    user2 = _user2;

    // Deploy CreditScoring first
    const CreditScoringFactory = await ethers.getContractFactory("CreditScoring");
    creditScoring = await CreditScoringFactory.deploy();
    await creditScoring.waitForDeployment();

    // Deploy CreditLending
    const CreditLendingFactory = await ethers.getContractFactory("CreditLending");
    creditLending = await CreditLendingFactory.deploy(creditScoring.target);
    await creditLending.waitForDeployment();

    // Add creditLending as verified address in creditScoring
    await creditScoring.addVerifiedAddress(creditLending.target);
  });

  describe("Loan Information Views", function () {
    beforeEach(async function () {
      // Setup: Register user and deposit to pool
      await creditScoring.connect(user1).registerUser();
      await creditLending.depositToPool({ value: ethers.parseEther("10.0") });

      // Give user1 some transaction history to boost credit score
      await creditScoring.connect(user1).recordTransaction(user1.address, ethers.parseEther("50.0"), user2.address);
    });

    it("Should return user's total debt information", async function () {
      // Request a loan
      await creditLending.connect(user1).requestLoan(ethers.parseEther("2.0"));

      const debtInfo = await creditLending.getUserTotalDebt(user1.address);

      expect(debtInfo[0]).to.be.greaterThan(0); // totalOutstanding
      expect(debtInfo[1]).to.equal(1); // activeLoanCount
      expect(debtInfo[2]).to.equal(0); // overdueLoanCount (not overdue yet)
    });

    it("Should return user's active loans", async function () {
      // Request two loans
      await creditLending.connect(user1).requestLoan(ethers.parseEther("1.0"));
      await creditLending.connect(user1).requestLoan(ethers.parseEther("1.5"));

      const activeLoans = await creditLending.getUserActiveLoans(user1.address);

      expect(activeLoans[0].length).to.equal(2); // loanIds
      expect(activeLoans[1].length).to.equal(2); // remainingBalances
      expect(activeLoans[2].length).to.equal(2); // dueDates
      expect(activeLoans[3].length).to.equal(2); // interestRates

      // Check that balances are greater than principal (due to interest)
      expect(activeLoans[1][0]).to.be.greaterThan(ethers.parseEther("1.0"));
      expect(activeLoans[1][1]).to.be.greaterThan(ethers.parseEther("1.5"));
    });

    it("Should return correct remaining owed amount", async function () {
      // Request a loan
      const loanId = await creditLending.connect(user1).requestLoan.staticCall(ethers.parseEther("2.0"));
      await creditLending.connect(user1).requestLoan(ethers.parseEther("2.0"));

      const totalOwed = await creditLending.getTotalOwed(loanId);
      const remainingOwed = await creditLending.getRemainingOwed(loanId);

      expect(remainingOwed).to.equal(totalOwed); // No payments made yet

      // Make a partial payment
      const partialPayment = ethers.parseEther("1.0");
      await creditLending.connect(user1).repayLoan(loanId, { value: partialPayment });

      const remainingAfterPayment = await creditLending.getRemainingOwed(loanId);
      expect(remainingAfterPayment).to.equal(totalOwed - partialPayment);
    });

    it("Should return detailed loan information", async function () {
      // Request a loan
      const loanId = await creditLending.connect(user1).requestLoan.staticCall(ethers.parseEther("2.0"));
      await creditLending.connect(user1).requestLoan(ethers.parseEther("2.0"));

      const loanDetails = await creditLending.getLoanDetails(loanId);

      expect(loanDetails[0]).to.equal(user1.address); // borrower
      expect(loanDetails[1]).to.equal(ethers.parseEther("2.0")); // originalAmount
      expect(loanDetails[2]).to.be.greaterThan(0); // interestRate
      expect(loanDetails[3]).to.be.greaterThan(ethers.parseEther("2.0")); // totalOwed (with interest)
      expect(loanDetails[4]).to.equal(loanDetails[3]); // remainingOwed (no payments yet)
      expect(loanDetails[5]).to.equal(0); // amountPaid
      expect(loanDetails[7]).to.be.true; // isActive
      expect(loanDetails[8]).to.be.false; // isOverdue (not yet)
      expect(loanDetails[9]).to.be.false; // isRepaid
    });

    it("Should return user loan summary", async function () {
      // Request a loan and repay it
      const loanId = await creditLending.connect(user1).requestLoan.staticCall(ethers.parseEther("1.0"));
      await creditLending.connect(user1).requestLoan(ethers.parseEther("1.0"));

      const totalOwed = await creditLending.getTotalOwed(loanId);
      await creditLending.connect(user1).repayLoan(loanId, { value: totalOwed });

      // Request another active loan
      await creditLending.connect(user1).requestLoan(ethers.parseEther("1.5"));

      const summary = await creditLending.getUserLoanSummary(user1.address);

      expect(summary[0]).to.equal(2); // totalLoansCount
      expect(summary[1]).to.equal(1); // activeLoansCount
      expect(summary[2]).to.equal(1); // repaidLoansCount
      expect(summary[3]).to.equal(0); // defaultedLoansCount
      expect(summary[4]).to.equal(ethers.parseEther("2.5")); // totalAmountBorrowed
      expect(summary[5]).to.equal(totalOwed); // totalAmountRepaid
      expect(summary[6]).to.be.greaterThan(0); // currentOutstandingDebt
    });
  });
});
