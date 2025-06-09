"use client";

import { useEffect, useState } from "react";
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

const SingleLoanDisplay = ({ loanId }: { loanId: any }) => {
  const { data: loanData } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getLoan",
    args: [loanId],
  });

  const { writeContractAsync: writeCreditLendingAsync, isMining: isCreditLendingPending } = useScaffoldWriteContract({
    contractName: "CreditLending",
  });

  const repayLoan = async (loanId: number, repaymentAmount: bigint) => {
    try {
      await writeCreditLendingAsync({
        functionName: "repayLoan",
        args: [BigInt(loanId)],
        value: repaymentAmount,
      });
    } catch (error: any) {
      console.error("Loan repayment error:", error);
    }
  };

  if (!loanData) {
    return (
      <div className="card bg-base-200 shadow-md animate-pulse">
        <div className="card-body">
          <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-base-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Calculate loan details with safe fallbacks
  const loanAmount = loanData.amount ? formatEther(loanData.amount) : "0";
  const interestRateRaw = loanData.interestRate ? Number(loanData.interestRate) : 0;
  const interestRate = interestRateRaw / 100; // Convert from basis points
  const interest = (parseFloat(loanAmount) * interestRate) / 100;
  const totalRepayment = parseFloat(loanAmount) + interest;

  // Safe date handling
  const dueDateTimestamp = loanData.dueDate ? Number(loanData.dueDate) : 0;
  const dueDate = new Date(dueDateTimestamp * 1000);
  const isValidDate = !isNaN(dueDate.getTime()) && dueDateTimestamp > 0;
  const isOverdue = isValidDate && Date.now() > dueDate.getTime();
  const daysUntilDue = isValidDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div
      className={`card bg-base-200 shadow-md ${isOverdue ? "border-l-4 border-error" : loanData.isActive ? "border-l-4 border-primary" : "border-l-4 border-success"}`}
    >
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-lg font-bold">Loan #{loanId.toString()}</h4>
            <div
              className={`badge ${loanData.isActive ? (isOverdue ? "badge-error" : "badge-primary") : "badge-success"}`}
            >
              {loanData.isRepaid ? "Repaid" : isOverdue ? "Overdue" : "Active"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{loanAmount} ETH</div>
            <div className="text-sm text-base-content/70">Principal</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="stat bg-base-100 rounded p-3">
            <div className="stat-title text-xs">Interest Rate</div>
            <div className="stat-value text-lg">{interestRate}%</div>
          </div>
          <div className="stat bg-base-100 rounded p-3">
            <div className="stat-title text-xs">Interest</div>
            <div className="stat-value text-lg">{interest.toFixed(4)} ETH</div>
          </div>
          <div className="stat bg-base-100 rounded p-3">
            <div className="stat-title text-xs">Total Due</div>
            <div className="stat-value text-lg">{totalRepayment.toFixed(4)} ETH</div>
          </div>
          <div className="stat bg-base-100 rounded p-3">
            <div className="stat-title text-xs">Due Date</div>
            <div className="stat-value text-sm">{isValidDate ? dueDate.toLocaleDateString() : "N/A"}</div>
          </div>
        </div>

        {loanData.isActive && !loanData.isRepaid && (
          <div className="flex flex-col gap-3">
            <div className={`alert ${isOverdue ? "alert-error" : daysUntilDue <= 3 ? "alert-warning" : "alert-info"}`}>
              <div>
                {!isValidDate ? (
                  <>
                    <div className="font-semibold">Active Loan</div>
                    <div className="text-sm">Loan is active. Due date information not available.</div>
                  </>
                ) : isOverdue ? (
                  <>
                    <div className="font-semibold">Loan Overdue!</div>
                    <div className="text-sm">
                      This loan is {Math.abs(daysUntilDue)} days overdue. Repay immediately to avoid credit score
                      damage.
                    </div>
                  </>
                ) : daysUntilDue <= 3 ? (
                  <>
                    <div className="font-semibold">Due Soon</div>
                    <div className="text-sm">
                      This loan is due in {daysUntilDue} {daysUntilDue === 1 ? "day" : "days"}.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">Active Loan</div>
                    <div className="text-sm">
                      Due in {daysUntilDue} days. Make timely payments to maintain good credit.
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              className={`btn ${isOverdue ? "btn-error" : "btn-primary"} w-full ${isCreditLendingPending ? "loading" : ""}`}
              onClick={() => {
                if (!isNaN(totalRepayment) && totalRepayment > 0) {
                  repayLoan(Number(loanId), parseEther(totalRepayment.toString()));
                }
              }}
              disabled={isCreditLendingPending || isNaN(totalRepayment) || totalRepayment <= 0}
            >
              {isCreditLendingPending
                ? "Processing..."
                : `Repay ${!isNaN(totalRepayment) ? totalRepayment.toFixed(4) : "0.0000"} ETH`}
            </button>
          </div>
        )}

        {loanData.isRepaid && (
          <div className="alert alert-success">
            <CheckCircleIcon className="h-5 w-5" />
            <div>
              <div className="font-semibold">Loan Repaid</div>
              <div className="text-sm">This loan has been successfully repaid. Great job maintaining your credit!</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreditScoringPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<"profile" | "stake" | "borrow" | "loans">("profile");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedRateSection, setExpandedRateSection] = useState<string | null>(null);

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

  const { data: borrowerLoanIds } = useScaffoldReadContract({
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

  // Dynamic rate state
  const [dynamicRate, setDynamicRate] = useState<string>("Loading...");
  const [currentUtilization, setCurrentUtilization] = useState<number>(0);
  const [rateComponents, setRateComponents] = useState<any>(null);

  // Get current pool utilization
  const { data: poolUtilizationData } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getCurrentUtilization",
  });

  // Get loan eligibility (which includes dynamic rate)
  const { data: loanEligibility } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "checkLoanEligibility",
    args: [connectedAddress, parseEther(loanAmount || "1")],
  });

  // Get rate components if connected
  const { data: rateComponentsData } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getRateComponents",
    args: [connectedAddress, parseEther(loanAmount || "1")],
  });

  // Update dynamic rate when data changes
  useEffect(() => {
    if (poolUtilizationData) {
      setCurrentUtilization(Number(poolUtilizationData) / 100);
    }

    if (loanEligibility && loanEligibility[0]) {
      const rate = Number(loanEligibility[2]) / 100;
      setDynamicRate(`${rate.toFixed(2)}%`);
    } else if (loanEligibility && !loanEligibility[0]) {
      setDynamicRate("N/A");
    }

    if (rateComponentsData) {
      setRateComponents({
        creditScore: Number(rateComponentsData[0]),
        poolUtilization: Number(rateComponentsData[1]) / 100,
        baseUtilizationRate: Number(rateComponentsData[2]) / 100,
        creditAdjustedRate: Number(rateComponentsData[3]) / 100,
        marketAdjustedRate: Number(rateComponentsData[4]) / 100,
        finalRate: Number(rateComponentsData[5]) / 100,
      });
    }
  }, [poolUtilizationData, loanEligibility, rateComponentsData]);

  const getInterestRate = (score: number) => {
    if (dynamicRate === "Loading..." || dynamicRate === "Error") {
      // Fallback to static calculation while loading
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
    }
    return dynamicRate;
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

  // Calculate realistic APY based on current utilization and base rates
  const calculateCurrentAPY = () => {
    if (!poolInfo || !poolInfo[0] || Number(poolInfo[0]) === 0) return "0.0";

    const totalPool = Number(poolInfo[0]);
    const currentlyLoaned = Number(poolInfo[2]);
    const utilization = totalPool > 0 ? (currentlyLoaned / totalPool) * 100 : 0;

    // Base rate calculation similar to the dynamic rate model
    // Using a simplified version for APY display
    let baseRate;
    if (utilization <= 80) {
      // Below target utilization: 2% + (utilization/80) * 2%
      baseRate = 2 + (utilization / 80) * 2;
    } else {
      // Above target utilization: 4% + ((utilization-80)/20) * 56%
      baseRate = 4 + ((utilization - 80) / 20) * 56;
    }

    // APY for lenders = base lending rate * utilization rate * 0.9 (90% to lenders, 10% protocol fee)
    const lenderAPY = baseRate * (utilization / 100) * 0.9;

    return Math.max(0, lenderAPY).toFixed(1);
  };

  const currentAPY = calculateCurrentAPY();

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
                    <div className="text-xl font-bold">{borrowerLoanIds ? borrowerLoanIds.length : 0}</div>
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
            <button
              className={`tab tab-lg ${activeTab === "loans" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("loans")}
            >
              My Loans{" "}
              {borrowerLoanIds && borrowerLoanIds.length > 0 && (
                <span className="badge badge-primary ml-2">{borrowerLoanIds.length}</span>
              )}
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
                      <div className="stat-desc text-xs">
                        {poolInfo && `${((Number(poolInfo[2]) / Number(poolInfo[0])) * 100).toFixed(1)}% utilization`}
                      </div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Your Staked</div>
                      <div className="stat-value text-2xl">{lenderShare ? formatEther(lenderShare) : "0"} ETH</div>
                      <div className="stat-desc text-xs">
                        {lenderShare && Number(formatEther(lenderShare)) > 0
                          ? `~${((Number(formatEther(lenderShare)) * parseFloat(currentAPY)) / 100).toFixed(4)} ETH/year`
                          : "No earnings yet"}
                      </div>
                    </div>
                  </div>

                  {/* APY Explanation */}
                  <div className="bg-info/10 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <ChartBarIcon className="h-4 w-4 text-info" />
                      <span className="font-semibold text-info text-sm">Dynamic APY</span>
                    </div>
                    <p className="text-xs text-base-content/70">
                      APY adjusts based on pool utilization and lending rates. Higher utilization = higher APY for
                      stakers.
                      {poolInfo &&
                        Number(poolInfo[0]) > 0 &&
                        ` Current rate: ${((Number(poolInfo[2]) / Number(poolInfo[0])) * 100).toFixed(1)}% of pool lent out.`}
                    </p>
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

                {lenderShare && Number(formatEther(lenderShare)) > 0 ? (
                  <div>
                    <div className="divider">Manage Stake</div>
                    <button
                      className="btn btn-outline btn-secondary w-full"
                      onClick={() => unstakeETH(formatEther(lenderShare))}
                    >
                      Unstake All ({formatEther(lenderShare)} ETH)
                    </button>
                  </div>
                ) : null}
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
                      <div className="font-semibold">Your Dynamic Loan Terms</div>
                      <div className="text-sm">
                        Interest Rate:{" "}
                        <span className="font-semibold text-primary">{getInterestRate(creditScore)}</span>
                      </div>
                      <div className="text-sm">Pool Utilization: {currentUtilization.toFixed(1)}%</div>
                      <div className="text-sm">Max Amount: 100 ETH • Duration: 30 days</div>
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

              {/* Dynamic Rate Information */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Dynamic Rate Model</h3>

                {/* Current Rate Display */}
                <div className="bg-primary/10 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Your Current Rate</span>
                    <span className="text-2xl font-bold text-primary">{dynamicRate}</span>
                  </div>
                  <div className="text-sm text-base-content/70 mt-1">
                    Pool Utilization: {currentUtilization.toFixed(1)}%
                  </div>
                </div>

                {/* Rate Components Breakdown */}
                {rateComponents && (
                  <div className="mb-6">
                    <h4 className="font-bold text-base mb-4 flex items-center gap-2">
                      <ChartBarIcon className="h-5 w-5 text-primary" />
                      Rate Breakdown
                    </h4>
                    <div className="bg-base-200 rounded-lg p-4 space-y-3">
                      {/* Base Rate (Utilization) */}
                      <div className="border-b border-base-300">
                        <button
                          className="w-full flex justify-between items-center py-2 hover:bg-base-300/50 rounded px-2"
                          onClick={() => setExpandedRateSection(expandedRateSection === "base" ? null : "base")}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Base Rate (Utilization)</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedRateSection === "base" ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <span className="font-bold text-blue-600">
                            {rateComponents.baseUtilizationRate.toFixed(2)}%
                          </span>
                        </button>
                        {expandedRateSection === "base" && (
                          <div className="pl-4 pb-3 pt-2 text-sm space-y-2 bg-blue-50/50 rounded-b-lg">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium text-blue-700">Current Utilization:</span>
                                <div className="text-blue-600">{rateComponents.poolUtilization.toFixed(1)}%</div>
                              </div>
                              <div>
                                <span className="font-medium text-blue-700">Target Utilization:</span>
                                <div className="text-blue-600">80%</div>
                              </div>
                            </div>
                            <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                              {rateComponents.poolUtilization <= 80
                                ? `Below target: 2% + (${rateComponents.poolUtilization.toFixed(1)}% ÷ 80%) × 2% = ${rateComponents.baseUtilizationRate.toFixed(2)}%`
                                : `Above target: 4% + ((${rateComponents.poolUtilization.toFixed(1)}% - 80%) ÷ 20%) × 56% = ${rateComponents.baseUtilizationRate.toFixed(2)}%`}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Credit Score Adjustment */}
                      <div className="border-b border-base-300">
                        <button
                          className="w-full flex justify-between items-center py-2 hover:bg-base-300/50 rounded px-2"
                          onClick={() => setExpandedRateSection(expandedRateSection === "credit" ? null : "credit")}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Credit Score Adjustment</span>
                            <div className="badge badge-sm badge-outline">{rateComponents.creditScore}</div>
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedRateSection === "credit" ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <span className="font-bold text-green-600">
                            {rateComponents.creditAdjustedRate.toFixed(2)}%
                          </span>
                        </button>
                        {expandedRateSection === "credit" && (
                          <div className="pl-4 pb-3 pt-2 text-sm space-y-2 bg-green-50/50 rounded-b-lg">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="font-medium text-green-700">Credit Tier:</span>
                                <div className="text-green-600">
                                  {rateComponents.creditScore >= 750
                                    ? "Excellent"
                                    : rateComponents.creditScore >= 700
                                      ? "Very Good"
                                      : rateComponents.creditScore >= 650
                                        ? "Good"
                                        : rateComponents.creditScore >= 600
                                          ? "Fair"
                                          : rateComponents.creditScore >= 500
                                            ? "Poor"
                                            : rateComponents.creditScore >= 450
                                              ? "Bad"
                                              : rateComponents.creditScore >= 400
                                                ? "Very Bad"
                                                : "Terrible"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-green-700">Risk Multiplier:</span>
                                <div className="text-green-600">
                                  {rateComponents.creditScore >= 750
                                    ? "0.8x"
                                    : rateComponents.creditScore >= 700
                                      ? "0.9x"
                                      : rateComponents.creditScore >= 650
                                        ? "1.0x"
                                        : rateComponents.creditScore >= 600
                                          ? "1.2x"
                                          : rateComponents.creditScore >= 500
                                            ? "1.5x"
                                            : rateComponents.creditScore >= 450
                                              ? "2.0x"
                                              : rateComponents.creditScore >= 400
                                                ? "3.0x"
                                                : "5.0x"}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-green-700">Tier Premium:</span>
                                <div className="text-green-600">
                                  {rateComponents.creditScore >= 750
                                    ? "0.0%"
                                    : rateComponents.creditScore >= 700
                                      ? "0.5%"
                                      : rateComponents.creditScore >= 650
                                        ? "1.0%"
                                        : rateComponents.creditScore >= 600
                                          ? "2.0%"
                                          : rateComponents.creditScore >= 500
                                            ? "4.0%"
                                            : rateComponents.creditScore >= 450
                                              ? "8.0%"
                                              : rateComponents.creditScore >= 400
                                                ? "15.0%"
                                                : "30.0%"}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                              {`(${rateComponents.baseUtilizationRate.toFixed(2)}% × ${
                                rateComponents.creditScore >= 750
                                  ? "0.8"
                                  : rateComponents.creditScore >= 700
                                    ? "0.9"
                                    : rateComponents.creditScore >= 650
                                      ? "1.0"
                                      : rateComponents.creditScore >= 600
                                        ? "1.2"
                                        : rateComponents.creditScore >= 500
                                          ? "1.5"
                                          : rateComponents.creditScore >= 450
                                            ? "2.0"
                                            : rateComponents.creditScore >= 400
                                              ? "3.0"
                                              : "5.0"
                              }) + ${
                                rateComponents.creditScore >= 750
                                  ? "0.0"
                                  : rateComponents.creditScore >= 700
                                    ? "0.5"
                                    : rateComponents.creditScore >= 650
                                      ? "1.0"
                                      : rateComponents.creditScore >= 600
                                        ? "2.0"
                                        : rateComponents.creditScore >= 500
                                          ? "4.0"
                                          : rateComponents.creditScore >= 450
                                            ? "8.0"
                                            : rateComponents.creditScore >= 400
                                              ? "15.0"
                                              : "30.0"
                              }% premium = ${rateComponents.creditAdjustedRate.toFixed(2)}%`}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Market Conditions */}
                      <div className="border-b border-base-300">
                        <button
                          className="w-full flex justify-between items-center py-2 hover:bg-base-300/50 rounded px-2"
                          onClick={() => setExpandedRateSection(expandedRateSection === "market" ? null : "market")}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Market Conditions</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedRateSection === "market" ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <span className="font-bold text-orange-600">
                            {rateComponents.marketAdjustedRate.toFixed(2)}%
                          </span>
                        </button>
                        {expandedRateSection === "market" && (
                          <div className="pl-4 pb-3 pt-2 text-sm space-y-2 bg-orange-50/50 rounded-b-lg">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-medium text-orange-700">Volatility Multiplier:</span>
                                <div className="text-orange-600">1.0x (Normal)</div>
                              </div>
                              <div>
                                <span className="font-medium text-orange-700">Liquidity Premium:</span>
                                <div className="text-orange-600">0.0%</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <span className="font-medium text-orange-700">Risk Premium:</span>
                                <div className="text-orange-600">0.5%</div>
                              </div>
                            </div>
                            <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                              ({rateComponents.creditAdjustedRate.toFixed(2)}% × 1.0) + 0.0% + 0.5% ={" "}
                              {rateComponents.marketAdjustedRate.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Final Rate */}
                      <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-3 mt-3">
                        <span className="font-bold text-primary">Final Interest Rate</span>
                        <span className="text-xl font-bold text-primary">{rateComponents.finalRate.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Utilization Impact with Visual Indicator */}
                <div className="mb-6">
                  <h4 className="font-bold text-base mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
                    Pool Utilization Impact
                  </h4>

                  {/* Current Utilization Bar */}
                  <div className="mb-4 bg-base-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">Current Pool Utilization</span>
                      <span className="font-bold">{currentUtilization.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-3 relative">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                        style={{ width: `${Math.min(currentUtilization, 100)}%` }}
                      ></div>
                      {/* Target marker at 80% */}
                      <div className="absolute top-0 left-[80%] w-0.5 h-3 bg-blue-600"></div>
                      <div className="absolute -top-6 left-[80%] transform -translate-x-1/2">
                        <span className="text-xs font-semibold text-blue-600">Target</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-base-content/70 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span className="text-blue-600 font-semibold">80%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Impact Zones */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                      className={`p-4 rounded-lg border-2 ${currentUtilization <= 50 ? "border-green-400 bg-green-50" : "border-green-200 bg-green-50/50"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-green-700">Low Utilization</span>
                        <span className="text-xs font-semibold text-green-600">0-50%</span>
                      </div>
                      <div className="text-sm text-green-700 mb-1">Lowest Interest Rates</div>
                      <div className="text-xs text-green-600">Pool has plenty of liquidity</div>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 ${currentUtilization > 50 && currentUtilization <= 90 ? "border-yellow-400 bg-yellow-50" : "border-yellow-200 bg-yellow-50/50"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-yellow-700">Target Zone</span>
                        <span className="text-xs font-semibold text-yellow-600">50-90%</span>
                      </div>
                      <div className="text-sm text-yellow-700 mb-1">Optimal Balance</div>
                      <div className="text-xs text-yellow-600">Efficient capital utilization</div>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 ${currentUtilization > 90 ? "border-red-400 bg-red-50" : "border-red-200 bg-red-50/50"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-red-700">High Utilization</span>
                        <span className="text-xs font-semibold text-red-600">90%+</span>
                      </div>
                      <div className="text-sm text-red-700 mb-1">Higher Interest Rates</div>
                      <div className="text-xs text-red-600">Limited liquidity available</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-info/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ChartBarIcon className="h-4 w-4 text-info" />
                    <span className="font-semibold text-info text-sm">Dynamic Pricing</span>
                  </div>
                  <p className="text-xs text-base-content/70">
                    Rates adjust automatically based on pool utilization, your credit score, market conditions, and loan
                    size. Lower utilization = better rates. Higher credit scores = lower rates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "loans" && (
            <div className="space-y-6">
              {/* Active Loans Header */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">My Active Loans</h3>

                {borrowerLoanIds && borrowerLoanIds.length > 0 ? (
                  <div className="space-y-4">
                    {borrowerLoanIds.map((loanId: any) => {
                      return <SingleLoanDisplay key={loanId.toString()} loanId={loanId} />;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BanknotesIcon className="h-16 w-16 text-base-content/30 mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">No Active Loans</h4>
                    <p className="text-base-content/70 mb-6">
                      You don&apos;t have any active loans. Visit the &quot;Borrow&quot; tab to request your first loan.
                    </p>
                    <button className="btn btn-primary" onClick={() => setActiveTab("borrow")}>
                      Request a Loan
                    </button>
                  </div>
                )}
              </div>

              {/* Loan History Summary */}
              {creditProfile && (
                <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold mb-4">Loan History Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Total Loans</div>
                      <div className="stat-value">{Number(creditProfile.loanCount)}</div>
                      <div className="stat-desc">All time</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Successfully Repaid</div>
                      <div className="stat-value text-success">{Number(creditProfile.repaidLoans)}</div>
                      <div className="stat-desc">
                        {Number(creditProfile.loanCount) > 0
                          ? `${((Number(creditProfile.repaidLoans) / Number(creditProfile.loanCount)) * 100).toFixed(1)}% success rate`
                          : "No history yet"}
                      </div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Defaults</div>
                      <div className="stat-value text-error">{Number(creditProfile.defaultedLoans)}</div>
                      <div className="stat-desc">
                        {Number(creditProfile.defaultedLoans) === 0 ? "Perfect record!" : "Impacts credit score"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-info/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ChartBarIcon className="h-5 w-5 text-info" />
                      <span className="font-semibold text-info">Credit Impact</span>
                    </div>
                    <p className="text-sm text-base-content/70">
                      Your repayment history accounts for 30% of your credit score. Timely payments significantly
                      improve your creditworthiness and reduce future loan interest rates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CreditScoringPage;
