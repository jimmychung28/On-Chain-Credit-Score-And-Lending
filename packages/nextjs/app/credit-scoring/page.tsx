"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CreditScoringPage = () => {
  const { address: connectedAddress } = useAccount();
  const [loanAmount, setLoanAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [poolAmount, setPoolAmount] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Read user's credit profile
  const { data: creditProfile, refetch: refetchProfile } = useScaffoldReadContract({
    contractName: "CreditScoring",
    functionName: "getCreditProfile",
    args: [connectedAddress],
  });

  // Read staking balance
  const { data: stakingBalance, refetch: refetchStaking } = useScaffoldReadContract({
    contractName: "CreditScoring",
    functionName: "stakingBalances",
    args: [connectedAddress],
  });

  // Read pool information
  const { data: poolInfo, refetch: refetchPool } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getPoolInfo",
  });

  // Read user's total debt
  const { data: userDebt } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getUserTotalDebt",
    args: [connectedAddress],
  });

  // Read user's active loans
  const { data: activeLoans } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getUserActiveLoans",
    args: [connectedAddress],
  });

  // Write contracts
  const { writeContractAsync: writeCreditScoring, isPending: isCreditScoringPending } =
    useScaffoldWriteContract("CreditScoring");
  const { writeContractAsync: writeCreditLending, isPending: isCreditLendingPending } =
    useScaffoldWriteContract("CreditLending");

  useEffect(() => {
    if (creditProfile && creditProfile.isActive) {
      setIsRegistered(true);
    }
  }, [creditProfile]);

  const registerUser = async () => {
    try {
      await writeCreditScoring({
        functionName: "registerUser",
      });
      setTimeout(() => {
        refetchProfile();
      }, 2000);
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const depositStake = async () => {
    if (!stakeAmount) return;
    try {
      await writeCreditScoring({
        functionName: "depositStake",
        value: parseEther(stakeAmount),
      });
      setTimeout(() => {
        refetchProfile();
        refetchStaking();
      }, 2000);
    } catch (error) {
      console.error("Stake deposit failed:", error);
    }
  };

  const requestLoan = async () => {
    if (!loanAmount) return;
    try {
      await writeCreditLending({
        functionName: "requestLoan",
        args: [parseEther(loanAmount)],
      });
      setTimeout(() => {
        refetchProfile();
        refetchPool();
      }, 2000);
    } catch (error) {
      console.error("Loan request failed:", error);
    }
  };

  const depositToPool = async () => {
    if (!poolAmount) return;
    try {
      await writeCreditLending({
        functionName: "depositToPool",
        value: parseEther(poolAmount),
      });
      setTimeout(() => {
        refetchPool();
      }, 2000);
    } catch (error) {
      console.error("Pool deposit failed:", error);
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-500";
    if (score >= 700) return "text-blue-500";
    if (score >= 650) return "text-yellow-500";
    if (score >= 600) return "text-orange-500";
    return "text-red-500";
  };

  const getCreditRating = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    if (score >= 600) return "Poor";
    return "Very Poor";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 750) return "bg-green-500";
    if (score >= 700) return "bg-blue-500";
    if (score >= 650) return "bg-yellow-500";
    if (score >= 600) return "bg-orange-500";
    return "bg-red-500";
  };

  const getInterestRate = (score: number) => {
    if (score >= 750) return "3%";
    if (score >= 700) return "5%";
    if (score >= 650) return "8%";
    if (score >= 600) return "11%";
    if (score >= 500) return "15%";
    return "20%";
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-base-100 p-8 rounded-2xl shadow-xl max-w-md">
            <CreditCardIcon className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-base-content/70 mb-6">
              Please connect your wallet to access your credit profile and start building your on-chain credit score.
            </p>
            <div className="alert alert-info">
              <InformationCircleIcon className="h-5 w-5" />
              <span>Your wallet is your identity in the decentralized credit system</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-base-100 p-8 rounded-2xl shadow-xl max-w-md">
            <UserPlusIcon className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Welcome to OnChain Credit</h1>
            <p className="text-base-content/70 mb-6">
              Register to start building your on-chain credit profile. Your blockchain activity will be analyzed to
              determine your creditworthiness.
            </p>

            <div className="bg-base-200 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Address address={connectedAddress} />
              </div>
              <p className="text-sm text-base-content/70">Connected Wallet</p>
            </div>

            <button
              className={`btn btn-primary btn-lg w-full gap-2 ${isCreditScoringPending ? "loading" : ""}`}
              onClick={registerUser}
              disabled={isCreditScoringPending}
            >
              {!isCreditScoringPending && <UserPlusIcon className="h-5 w-5" />}
              {isCreditScoringPending ? "Registering..." : "Register & Create Profile"}
            </button>

            <div className="mt-6 text-left">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Your wallet activity will be analyzed</li>
                <li>• Initial credit score will be calculated</li>
                <li>• You can stake ETH to boost your score</li>
                <li>• Access loans based on your score</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const creditScore = creditProfile ? Number(creditProfile.score) : 0;
  const scorePercentage = ((creditScore - 300) / 550) * 100;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Credit Dashboard</h1>
              <p className="text-base-content/70 mt-1">Manage your on-chain credit profile</p>
            </div>
            <div className="bg-base-200 p-3 rounded-xl">
              <Address address={connectedAddress} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Credit Score Overview */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Credit Score</h2>
                <div className="badge badge-primary badge-lg">{getCreditRating(creditScore)}</div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getCreditScoreColor(creditScore)}`}>{creditScore}</div>
                  <div className="text-sm text-base-content/70 mt-1">out of 850</div>
                </div>

                <div className="flex-1">
                  <div className="mb-2">
                    <div className="flex justify-between text-sm">
                      <span>300</span>
                      <span>850</span>
                    </div>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getScoreBarColor(creditScore)} transition-all duration-1000`}
                      style={{ width: `${scorePercentage}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-base-content/70">
                    Your interest rate: <span className="font-semibold">{getInterestRate(creditScore)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-base-100 rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-3">
                <BanknotesIcon className="h-8 w-8 text-secondary" />
                <div>
                  <div className="text-sm text-base-content/70">Total Debt</div>
                  <div className="text-xl font-bold">
                    {userDebt ? `${formatEther(userDebt[0] || 0n)} ETH` : "0 ETH"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-base-100 rounded-xl shadow-lg p-4">
              <div className="flex items-center gap-3">
                <ChartBarIcon className="h-8 w-8 text-accent" />
                <div>
                  <div className="text-sm text-base-content/70">Staked Amount</div>
                  <div className="text-xl font-bold">
                    {stakingBalance ? `${formatEther(stakingBalance)} ETH` : "0 ETH"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-100 shadow-lg mb-6">
          <button
            className={`tab tab-lg ${activeTab === "overview" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`tab tab-lg ${activeTab === "loans" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("loans")}
          >
            Loans
          </button>
          <button
            className={`tab tab-lg ${activeTab === "stake" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("stake")}
          >
            Stake
          </button>
          <button
            className={`tab tab-lg ${activeTab === "pool" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("pool")}
          >
            Lending Pool
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Credit Factors */}
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Credit Score Factors</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Repayment History</span>
                  <span className="font-semibold">30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Transaction Volume</span>
                  <span className="font-semibold">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Activity Frequency</span>
                  <span className="font-semibold">20%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Account Age</span>
                  <span className="font-semibold">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Staking Amount</span>
                  <span className="font-semibold">10%</span>
                </div>
              </div>
            </div>

            {/* Interest Rate Tiers */}
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4">Interest Rate Tiers</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-green-50">
                  <span className="text-green-700">750+ (Excellent)</span>
                  <span className="font-semibold text-green-700">3%</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50">
                  <span className="text-blue-700">700-749 (Good)</span>
                  <span className="font-semibold text-blue-700">5%</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-50">
                  <span className="text-yellow-700">650-699 (Fair)</span>
                  <span className="font-semibold text-yellow-700">8%</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50">
                  <span className="text-orange-700">600-649 (Poor)</span>
                  <span className="font-semibold text-orange-700">11%</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-red-50">
                  <span className="text-red-700">400-599 (Very Poor)</span>
                  <span className="font-semibold text-red-700">15-20%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "loans" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Request Loan */}
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BanknotesIcon className="h-6 w-6 text-primary" />
                Request Loan
              </h3>

              {creditScore < 400 ? (
                <div className="alert alert-error">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span>Credit score too low. Minimum 400 required.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Loan Amount (ETH)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0.0"
                      className="input input-bordered w-full"
                      value={loanAmount}
                      onChange={e => setLoanAmount(e.target.value)}
                      step="0.01"
                      max="100"
                    />
                    <label className="label">
                      <span className="label-text-alt">Max: 100 ETH</span>
                      <span className="label-text-alt">Rate: {getInterestRate(creditScore)}</span>
                    </label>
                  </div>

                  <div className="bg-base-200 p-4 rounded-xl">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Loan Amount:</span>
                      <span>{loanAmount || "0"} ETH</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Interest Rate:</span>
                      <span>{getInterestRate(creditScore)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Loan Term:</span>
                      <span>30 days</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total Repayment:</span>
                      <span>
                        {loanAmount
                          ? (parseFloat(loanAmount) * (1 + parseFloat(getInterestRate(creditScore)) / 100)).toFixed(4)
                          : "0"}{" "}
                        ETH
                      </span>
                    </div>
                  </div>

                  <button
                    className={`btn btn-primary w-full ${isCreditLendingPending ? "loading" : ""}`}
                    onClick={requestLoan}
                    disabled={!loanAmount || isCreditLendingPending || parseFloat(loanAmount) <= 0}
                  >
                    {isCreditLendingPending ? "Processing..." : "Request Loan"}
                  </button>
                </div>
              )}
            </div>

            {/* Active Loans */}
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ClockIcon className="h-6 w-6 text-accent" />
                Active Loans
              </h3>

              {activeLoans && activeLoans.length > 0 ? (
                <div className="space-y-3">
                  {activeLoans.map((loan: any, index: number) => (
                    <div key={index} className="bg-base-200 p-4 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{formatEther(loan.amount)} ETH</div>
                          <div className="text-sm text-base-content/70">
                            Due: {new Date(Number(loan.dueDate) * 1000).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="badge badge-warning">Active</div>
                      </div>
                      <div className="text-sm">
                        Interest: {loan.interestRate}% | Total Due: {formatEther(loan.totalDue)} ETH
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-base-content/70">
                  <BanknotesIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active loans</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "stake" && (
          <div className="max-w-md mx-auto">
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ArrowUpIcon className="h-6 w-6 text-success" />
                Stake ETH
              </h3>

              <div className="mb-4">
                <div className="alert alert-info">
                  <InformationCircleIcon className="h-5 w-5" />
                  <span>Staking ETH improves your credit score by 10%</span>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Amount to Stake (ETH)</span>
                </label>
                <input
                  type="number"
                  placeholder="0.0"
                  className="input input-bordered w-full"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                  step="0.01"
                />
              </div>

              <div className="bg-base-200 p-4 rounded-xl mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Current Staked:</span>
                  <span>{stakingBalance ? formatEther(stakingBalance) : "0"} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>New Total:</span>
                  <span>
                    {stakingBalance && stakeAmount
                      ? (parseFloat(formatEther(stakingBalance)) + parseFloat(stakeAmount)).toFixed(4)
                      : stakeAmount || "0"}{" "}
                    ETH
                  </span>
                </div>
              </div>

              <button
                className={`btn btn-success w-full ${isCreditScoringPending ? "loading" : ""}`}
                onClick={depositStake}
                disabled={!stakeAmount || isCreditScoringPending || parseFloat(stakeAmount) <= 0}
              >
                {isCreditScoringPending ? "Staking..." : "Stake ETH"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "pool" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pool Info */}
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-6 w-6 text-info" />
                Lending Pool
              </h3>

              <div className="space-y-4">
                <div className="stat">
                  <div className="stat-title">Total Pool Size</div>
                  <div className="stat-value text-info">
                    {poolInfo ? `${formatEther(poolInfo[0] || 0n)} ETH` : "0 ETH"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">Available to Lend</div>
                  <div className="stat-value text-success">
                    {poolInfo ? `${formatEther(poolInfo[1] || 0n)} ETH` : "0 ETH"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">Total Loans Outstanding</div>
                  <div className="stat-value text-warning">
                    {poolInfo ? `${formatEther(poolInfo[2] || 0n)} ETH` : "0 ETH"}
                  </div>
                </div>
              </div>
            </div>

            {/* Deposit to Pool */}
            <div className="bg-base-100 rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ArrowDownIcon className="h-6 w-6 text-primary" />
                Deposit to Pool
              </h3>

              <div className="mb-4">
                <div className="alert alert-success">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Earn fees from loan origination and interest</span>
                </div>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Amount to Deposit (ETH)</span>
                </label>
                <input
                  type="number"
                  placeholder="0.0"
                  className="input input-bordered w-full"
                  value={poolAmount}
                  onChange={e => setPoolAmount(e.target.value)}
                  step="0.01"
                />
              </div>

              <button
                className={`btn btn-primary w-full ${isCreditLendingPending ? "loading" : ""}`}
                onClick={depositToPool}
                disabled={!poolAmount || isCreditLendingPending || parseFloat(poolAmount) <= 0}
              >
                {isCreditLendingPending ? "Depositing..." : "Deposit to Pool"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditScoringPage;
