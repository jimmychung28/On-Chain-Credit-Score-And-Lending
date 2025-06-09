"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { BanknotesIcon, ChartBarIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Toast notification system
type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const CustomToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`alert ${
          toast.type === "success" ? "alert-success" : toast.type === "error" ? "alert-error" : "alert-info"
        } shadow-lg max-w-md`}
      >
        <span>{toast.message}</span>
        <button onClick={() => removeToast(toast.id)} className="btn btn-sm btn-circle">
          ✕
        </button>
      </div>
    ))}
  </div>
);

const CreditScoringPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"profile" | "stake" | "borrow">("profile");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Contract read hooks
  const { data: creditProfile } = useScaffoldReadContract({
    contractName: "CreditScoring",
    functionName: "getCreditProfile",
    args: [connectedAddress],
  });

  const { data: poolInfo } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getPoolInfo",
  });

  const { data: lenderShare } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getLenderShare",
    args: [connectedAddress],
  });

  const { data: borrowerLoans } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getBorrowerLoans",
    args: [connectedAddress],
  });
  // Contract write hooks
  const { writeContractAsync: writeCreditScoringAsync } = useScaffoldWriteContract({
    contractName: "CreditScoring",
  });
  const { writeContractAsync: writeCreditLendingAsync, isMining: isCreditLendingPending } = useScaffoldWriteContract({
    contractName: "CreditLending",
  });

  // Toast functions
  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Registration function
  const registerUser = async () => {
    if (!connectedAddress) return;

    setIsRegistering(true);
    try {
      await writeCreditScoringAsync({
        functionName: "registerUser",
        // No args needed - the function uses msg.sender internally
      });
      addToast("success", "Successfully registered! Building your credit profile...");
    } catch (error: any) {
      console.error("Registration error:", error);
      addToast("error", `Registration failed: ${error.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Staking functions
  const stakeETH = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;

    try {
      await writeCreditLendingAsync({
        functionName: "stakeETH",
        value: parseEther(stakeAmount),
      });
      addToast("success", `Successfully staked ${stakeAmount} ETH!`);
      setStakeAmount("");
    } catch (error: any) {
      console.error("Staking error:", error);
      addToast("error", `Staking failed: ${error.message}`);
    }
  };

  const unstakeETH = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      await writeCreditLendingAsync({
        functionName: "unstakeETH",
        args: [parseEther(amount)],
      });
      addToast("success", `Successfully unstaked ${amount} ETH!`);
    } catch (error: any) {
      console.error("Unstaking error:", error);
      addToast("error", `Unstaking failed: ${error.message}`);
    }
  };

  // Loan functions
  const requestLoan = async () => {
    if (!loanAmount || parseFloat(loanAmount) <= 0) return;

    try {
      await writeCreditLendingAsync({
        functionName: "requestLoan",
        args: [parseEther(loanAmount)],
      });
      addToast("success", `Loan request for ${loanAmount} ETH submitted!`);
      setLoanAmount("");
    } catch (error: any) {
      console.error("Loan request error:", error);
      addToast("error", `Loan request failed: ${error.message}`);
    }
  };

  // Helper functions
  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-500";
    if (score >= 650) return "text-blue-500";
    if (score >= 550) return "text-yellow-500";
    return "text-red-500";
  };

  const getCreditRating = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Very Good";
    if (score >= 650) return "Good";
    if (score >= 600) return "Fair";
    if (score >= 550) return "Poor";
    return "Very Poor";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 750) return "bg-green-500";
    if (score >= 650) return "bg-blue-500";
    if (score >= 550) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getInterestRate = (score: number) => {
    if (score >= 750) return "3%";
    if (score >= 700) return "5%";
    if (score >= 650) return "8%";
    if (score >= 600) return "11%";
    if (score >= 500) return "15%";
    if (score >= 450) return "20%";
    if (score >= 400) return "30%";
    if (score >= 350) return "50%";
    if (score >= 320) return "70%";
    return "100%";
  };

  // Check if user is registered
  const isRegistered = creditProfile && creditProfile.isActive;

  // Registration screen
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <CustomToastContainer toasts={toasts} removeToast={removeToast} />
        <div className="max-w-md w-full bg-base-100 rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <ChartBarIcon className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Welcome to OnChain Credit</h1>
            <p className="text-base-content/70 mb-6">
              Build your credit score through on-chain behavior and access uncollateralized loans.
            </p>

            <button
              className={`btn btn-primary w-full ${isRegistering ? "loading" : ""}`}
              onClick={registerUser}
              disabled={isRegistering || !connectedAddress}
            >
              {isRegistering ? "Registering..." : "Get Started"}
            </button>

            <div className="mt-6 text-left">
              <h3 className="font-semibold mb-2">How it works:</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Your on-chain activity builds your credit score</li>
                <li>• No wealth bias - behavior matters, not balance</li>
                <li>• Stake ETH to earn yield from lending</li>
                <li>• Get loans based on your creditworthiness</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const creditScore = creditProfile && creditProfile.score ? Number(creditProfile.score) : 0;
  const scorePercentage = ((creditScore - 300) / 550) * 100;
  const currentAPY =
    poolInfo && poolInfo[0] && poolInfo[0] > 0
      ? ((Number(poolInfo[3]) / Number(poolInfo[0])) * 100 * 365).toFixed(1)
      : "0.0";

  return (
    <>
      <CustomToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="min-h-screen bg-base-200">
        {/* Header */}
        <div className="bg-base-100 shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">OnChain Credit</h1>
                <p className="text-base-content/70 mt-1">Behavioral credit scoring for DeFi</p>
              </div>
              <div className="bg-base-200 p-3 rounded-xl">
                <Address address={connectedAddress} />
              </div>
            </div>
          </div>
        </div>

        {/* Credit Score Overview */}
        <div className="container mx-auto px-4 py-8">
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
                      Your loan rate: <span className="font-semibold">{getInterestRate(creditScore)}</span>
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
                    <div className="text-sm text-base-content/70">Staked ETH</div>
                    <div className="text-xl font-bold">{lenderShare ? `${formatEther(lenderShare)} ETH` : "0 ETH"}</div>
                  </div>
                </div>
              </div>

              <div className="bg-base-100 rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="h-8 w-8 text-accent" />
                  <div>
                    <div className="text-sm text-base-content/70">Active Loans</div>
                    <div className="text-xl font-bold">{borrowerLoans ? borrowerLoans.length : 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs tabs-boxed bg-base-100 shadow-lg mb-6">
            <button
              className={`tab tab-lg ${activeTab === "profile" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              Credit Profile
            </button>
            <button
              className={`tab tab-lg ${activeTab === "stake" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("stake")}
            >
              Stake ETH
            </button>
            <button
              className={`tab tab-lg ${activeTab === "borrow" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("borrow")}
            >
              Borrow
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "profile" && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Credit Score Breakdown */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Credit Score Factors</h3>
                <div className="space-y-6">
                  {/* Repayment History - 25% */}
                  <div className="border-l-4 border-primary pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Repayment History</span>
                      <span className="text-sm text-base-content/70">25% weight</span>
                    </div>
                    <div className="text-sm text-base-content/80 mb-2">
                      {creditProfile ? (
                        <>
                          <div>Total Loans: {Number(creditProfile.loanCount)}</div>
                          <div className="text-green-600">Repaid: {Number(creditProfile.repaidLoans)}</div>
                          <div className="text-red-600">Defaulted: {Number(creditProfile.defaultedLoans)}</div>
                          <div className="mt-1">
                            Success Rate:{" "}
                            {Number(creditProfile.loanCount) > 0
                              ? `${((Number(creditProfile.repaidLoans) / Number(creditProfile.loanCount)) * 100).toFixed(1)}%`
                              : "No loan history"}
                          </div>
                        </>
                      ) : (
                        <div>Loading...</div>
                      )}
                    </div>
                  </div>

                  {/* Transaction Volume - 30% */}
                  <div className="border-l-4 border-secondary pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Transaction Volume</span>
                      <span className="text-sm text-base-content/70">30% weight</span>
                    </div>
                    <div className="text-sm text-base-content/80 mb-2">
                      {creditProfile ? (
                        <>
                          <div>Total Volume: {formatEther(creditProfile.totalVolume)} ETH</div>
                          <div>Average Transaction: {formatEther(creditProfile.avgTransactionValue)} ETH</div>
                        </>
                      ) : (
                        <div>Loading...</div>
                      )}
                    </div>
                  </div>

                  {/* Activity Frequency - 25% */}
                  <div className="border-l-4 border-accent pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Activity Frequency</span>
                      <span className="text-sm text-base-content/70">25% weight</span>
                    </div>
                    <div className="text-sm text-base-content/80 mb-2">
                      {creditProfile ? (
                        <>
                          <div>Total Transactions: {Number(creditProfile.transactionCount)}</div>
                          <div>
                            Activity Level:{" "}
                            {Number(creditProfile.transactionCount) > 50
                              ? "High"
                              : Number(creditProfile.transactionCount) > 10
                                ? "Medium"
                                : "Low"}
                          </div>
                        </>
                      ) : (
                        <div>Loading...</div>
                      )}
                    </div>
                  </div>

                  {/* Account Age - 20% */}
                  <div className="border-l-4 border-warning pl-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Account Age</span>
                      <span className="text-sm text-base-content/70">20% weight</span>
                    </div>
                    <div className="text-sm text-base-content/80 mb-2">
                      {creditProfile ? (
                        <>
                          <div>Account Age: {Number(creditProfile.accountAge)} blocks</div>
                          <div>Status: {Number(creditProfile.accountAge) > 100000 ? "Established" : "New"}</div>
                        </>
                      ) : (
                        <div>Loading...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Improve */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">How to Improve Your Score</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold">Make Timely Payments</div>
                      <div className="text-sm text-base-content/70">Repay all loans on time to build trust</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold">Stay Active On-Chain</div>
                      <div className="text-sm text-base-content/70">Regular transactions show economic activity</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold">Build Transaction History</div>
                      <div className="text-sm text-base-content/70">More transactions = better credit assessment</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-semibold">Maintain Your Account</div>
                      <div className="text-sm text-base-content/70">Older accounts show stability</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-info/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-info" />
                    <span className="font-semibold text-info">No Wealth Bias</span>
                  </div>
                  <p className="text-sm text-base-content/70">
                    Your credit score is based purely on behavior, not how much ETH you have. This ensures fair access
                    to credit for everyone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stake" && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Staking Interface */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Stake ETH to Earn Yield</h3>

                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Current APY</div>
                      <div className="stat-value text-2xl">{currentAPY}%</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Your Staked</div>
                      <div className="stat-value text-2xl">{lenderShare ? formatEther(lenderShare) : "0"} ETH</div>
                    </div>
                  </div>

                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Amount to Stake</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0.0"
                      className="input input-bordered"
                      value={stakeAmount}
                      onChange={e => setStakeAmount(e.target.value)}
                    />
                  </div>

                  <button
                    className={`btn btn-primary w-full ${isCreditLendingPending ? "loading" : ""}`}
                    onClick={stakeETH}
                    disabled={!stakeAmount || isCreditLendingPending || parseFloat(stakeAmount) <= 0}
                  >
                    {isCreditLendingPending ? "Staking..." : "Stake ETH"}
                  </button>
                </div>

                {lenderShare && Number(formatEther(lenderShare)) > 0 && (
                  <div>
                    <div className="divider">Manage Stake</div>
                    <button
                      className="btn btn-outline btn-secondary w-full"
                      onClick={() => unstakeETH(formatEther(lenderShare))}
                    >
                      Unstake All ({formatEther(lenderShare)} ETH)
                    </button>
                  </div>
                )}
              </div>

              {/* Pool Information */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Lending Pool Stats</h3>

                {poolInfo && (
                  <div className="space-y-4">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Total Pool Size</div>
                      <div className="stat-value">{formatEther(poolInfo[0])} ETH</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Available to Lend</div>
                      <div className="stat-value">{formatEther(poolInfo[1])} ETH</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Currently Loaned</div>
                      <div className="stat-value">{formatEther(poolInfo[2])} ETH</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Total Interest Earned</div>
                      <div className="stat-value">{formatEther(poolInfo[3])} ETH</div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-warning/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
                    <span className="font-semibold text-warning">Risk Notice</span>
                  </div>
                  <p className="text-sm text-base-content/70">
                    Your staked ETH is lent to borrowers. You earn interest but bear the risk of defaults. Staking does
                    not affect your credit score.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "borrow" && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Loan Request */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Request a Loan</h3>

                <div className="mb-6">
                  <div className="alert alert-info mb-4">
                    <div>
                      <div className="font-semibold">Your Loan Terms</div>
                      <div className="text-sm">Interest Rate: {getInterestRate(creditScore)}</div>
                      <div className="text-sm">Max Amount: 100 ETH</div>
                      <div className="text-sm">Duration: 30 days</div>
                    </div>
                  </div>

                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Loan Amount (ETH)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0.0"
                      className="input input-bordered"
                      value={loanAmount}
                      onChange={e => setLoanAmount(e.target.value)}
                    />
                  </div>

                  {creditScore < 350 ? (
                    <div className="alert alert-error">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      <div>
                        <div className="font-semibold">Very High Risk</div>
                        <div className="text-sm">Credit score too low for favorable terms</div>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={`btn btn-primary w-full ${isCreditLendingPending ? "loading" : ""}`}
                      onClick={requestLoan}
                      disabled={!loanAmount || isCreditLendingPending || parseFloat(loanAmount) <= 0}
                    >
                      {isCreditLendingPending ? "Processing..." : "Request Loan"}
                    </button>
                  )}
                </div>
              </div>

              {/* Interest Rate Tiers */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Interest Rate Tiers</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-green-50">
                    <span className="text-green-700">750+ (Excellent)</span>
                    <span className="font-semibold text-green-700">3%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50">
                    <span className="text-blue-700">700-749 (Very Good)</span>
                    <span className="font-semibold text-blue-700">5%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-yellow-50">
                    <span className="text-yellow-700">650-699 (Good)</span>
                    <span className="font-semibold text-yellow-700">8%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-orange-50">
                    <span className="text-orange-700">600-649 (Fair)</span>
                    <span className="font-semibold text-orange-700">11%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-50">
                    <span className="text-red-700">500-599 (Poor)</span>
                    <span className="font-semibold text-red-700">15%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-100">
                    <span className="text-red-800">450-499 (Bad)</span>
                    <span className="font-semibold text-red-800">20%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-200">
                    <span className="text-red-900">400-449 (Terrible)</span>
                    <span className="font-semibold text-red-900">30%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-300">
                    <span className="text-red-900">350-399 (High Risk)</span>
                    <span className="font-semibold text-red-900">50%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-400">
                    <span className="text-red-900">300-349 (Extreme Risk)</span>
                    <span className="font-semibold text-red-900">70-100%</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-info/10 rounded-lg">
                  <p className="text-sm text-base-content/70">
                    All loans are uncollateralized and based purely on your behavioral credit score. Build good credit
                    through consistent repayment and on-chain activity.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CreditScoringPage;
