"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CreditScoringPage = () => {
  const { address: connectedAddress } = useAccount();
  const [loanAmount, setLoanAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

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

  // Read user's loan summary
  const { data: loanSummary } = useScaffoldReadContract({
    contractName: "CreditLending",
    functionName: "getUserLoanSummary",
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
      // Refetch data after successful registration
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
    if (!stakeAmount) return;
    try {
      await writeCreditLending({
        functionName: "depositToPool",
        value: parseEther(stakeAmount),
      });
      setTimeout(() => {
        refetchPool();
      }, 2000);
    } catch (error) {
      console.error("Pool deposit failed:", error);
    }
  };

  const repayLoan = async (loanId: bigint, amount: string) => {
    if (!amount) return;
    try {
      await writeCreditLending({
        functionName: "repayLoan",
        args: [loanId],
        value: parseEther(amount),
      });
      setTimeout(() => {
        refetchProfile();
        refetchPool();
      }, 2000);
    } catch (error) {
      console.error("Loan repayment failed:", error);
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-600";
    if (score >= 700) return "text-blue-600";
    if (score >= 650) return "text-yellow-600";
    if (score >= 600) return "text-orange-600";
    return "text-red-600";
  };

  const getCreditRating = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    if (score >= 600) return "Poor";
    return "Very Poor";
  };

  if (!connectedAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h1 className="text-4xl font-bold mb-6 text-center">On-Chain Credit Scoring</h1>
          <p className="text-xl mb-8 text-center text-gray-600">
            Please connect your wallet to access the credit scoring system
          </p>
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body items-center text-center">
              <h2 className="card-title">Wallet Required</h2>
              <p>Connect your wallet to start building your on-chain credit profile</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center">On-Chain Credit Scoring</h1>

      <div className="mb-6">
        <Address address={connectedAddress} />
      </div>

      {!isRegistered ? (
        // Registration Section
        <div className="grid gap-6 mb-8">
          <div className="card w-full bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">Welcome to On-Chain Credit Scoring</h2>
              <p>Register to start building your on-chain credit profile</p>
              <div className="card-actions justify-end">
                <button
                  className={`btn btn-primary ${isCreditScoringPending ? "loading" : ""}`}
                  onClick={registerUser}
                  disabled={isCreditScoringPending}
                >
                  {isCreditScoringPending ? "Registering..." : "Register"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard Section
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Credit Profile Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Credit Profile</h2>
              {creditProfile ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getCreditScoreColor(Number(creditProfile.score))}`}>
                      {creditProfile.score?.toString() || "300"}
                    </div>
                    <div className="text-lg font-semibold">{getCreditRating(Number(creditProfile.score))} Credit</div>
                  </div>

                  <div className="divider"></div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Total Volume:</span>
                      <div>{formatEther(creditProfile.totalVolume || 0n)} ETH</div>
                    </div>
                    <div>
                      <span className="font-semibold">Transactions:</span>
                      <div>{creditProfile.transactionCount?.toString() || "0"}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Avg Transaction:</span>
                      <div>{formatEther(creditProfile.avgTransactionValue || 0n)} ETH</div>
                    </div>
                    <div>
                      <span className="font-semibold">Loans:</span>
                      <div>{creditProfile.loanCount?.toString() || "0"}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Repaid:</span>
                      <div className="text-green-600">{creditProfile.repaidLoans?.toString() || "0"}</div>
                    </div>
                    <div>
                      <span className="font-semibold">Defaulted:</span>
                      <div className="text-red-600">{creditProfile.defaultedLoans?.toString() || "0"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p>Loading credit profile...</p>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Loans Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Outstanding Loans</h2>

              {userDebt ? (
                <div className="space-y-4">
                  <div className="stats stats-vertical">
                    <div className="stat">
                      <div className="stat-title">Total Outstanding</div>
                      <div className="stat-value text-2xl">{formatEther(userDebt[0] || 0n)} ETH</div>
                      <div className="stat-desc">
                        {userDebt[1]?.toString() || "0"} active loans
                        {Number(userDebt[2]) > 0 && (
                          <span className="text-red-500 ml-2">({userDebt[2]?.toString()} overdue)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {activeLoans && Array.isArray(activeLoans[0]) && activeLoans[0].length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Active Loans:</h3>
                      {(activeLoans[0] as readonly bigint[]).map((loanId: bigint, index: number) => {
                        const remainingBalance = (activeLoans[1] as readonly bigint[])?.[index] || 0n;
                        const dueDate = (activeLoans[2] as readonly bigint[])?.[index] || 0n;
                        const interestRate = (activeLoans[3] as readonly bigint[])?.[index] || 0n;
                        const isOverdue = Number(dueDate) * 1000 < Date.now();

                        return (
                          <div key={loanId.toString()} className="border p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">Loan #{loanId.toString()}</span>
                                <div className="text-sm text-gray-600">{Number(interestRate) / 100}% APR</div>
                              </div>
                              <div className="text-right">
                                <div className={`font-semibold ${isOverdue ? "text-red-600" : "text-blue-600"}`}>
                                  {formatEther(remainingBalance)} ETH
                                </div>
                                <div className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                                  Due: {new Date(Number(dueDate) * 1000).toLocaleDateString()}
                                  {isOverdue && " (OVERDUE)"}
                                </div>
                                <button
                                  className="btn btn-xs btn-primary mt-1"
                                  onClick={() => repayLoan(loanId, formatEther(remainingBalance))}
                                  disabled={isCreditLendingPending}
                                >
                                  {isCreditLendingPending ? "Paying..." : "Repay Full"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">No outstanding loans</div>
                  )}

                  {loanSummary && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-semibold mb-2">Loan History</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Total Borrowed:</span>
                          <div>{formatEther(loanSummary[4] || 0n)} ETH</div>
                        </div>
                        <div>
                          <span className="font-medium">Total Repaid:</span>
                          <div>{formatEther(loanSummary[5] || 0n)} ETH</div>
                        </div>
                        <div>
                          <span className="font-medium">Completed Loans:</span>
                          <div className="text-green-600">{loanSummary[2]?.toString() || "0"}</div>
                        </div>
                        <div>
                          <span className="font-medium">Defaulted Loans:</span>
                          <div className="text-red-600">{loanSummary[3]?.toString() || "0"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <span className="loading loading-spinner loading-lg"></span>
                  <p>Loading loan information...</p>
                </div>
              )}
            </div>
          </div>

          {/* ETH Staking Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">ETH Staking</h2>
              <p className="text-sm text-gray-600">Stake ETH to improve your credit score (up to 10% boost)</p>

              <div className="mb-4">
                <span className="font-semibold">Current Stake: </span>
                {stakingBalance ? formatEther(stakingBalance) : "0"} ETH
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount to Stake (ETH)</span>
                </label>
                <input
                  type="number"
                  placeholder="0.1"
                  className="input input-bordered"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                />
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className={`btn btn-secondary ${isCreditScoringPending ? "loading" : ""}`}
                  onClick={depositStake}
                  disabled={!stakeAmount || isCreditScoringPending}
                >
                  {isCreditScoringPending ? "Staking..." : "Stake ETH"}
                </button>
              </div>
            </div>
          </div>

          {/* Loan Request Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Request Loan</h2>
              <p className="text-sm text-gray-600">Request a loan based on your credit score</p>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Loan Amount (ETH)</span>
                </label>
                <input
                  type="number"
                  placeholder="1.0"
                  className="input input-bordered"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                />
              </div>

              <div className="text-sm text-gray-600 mt-2">
                <p>• Minimum credit score: 400</p>
                <p>• Interest rate varies by credit score (3%-20%)</p>
                <p>• 30-day loan duration</p>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className={`btn btn-primary ${isCreditLendingPending ? "loading" : ""}`}
                  onClick={requestLoan}
                  disabled={!loanAmount || isCreditLendingPending}
                >
                  {isCreditLendingPending ? "Requesting..." : "Request Loan"}
                </button>
              </div>
            </div>
          </div>

          {/* Lending Pool Card */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Lending Pool</h2>
              <p className="text-sm text-gray-600">Earn interest by providing liquidity to the lending pool</p>

              {poolInfo && (
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>
                    <span className="font-semibold">Total Pool:</span>
                    <div>{formatEther(poolInfo[0] || 0n)} ETH</div>
                  </div>
                  <div>
                    <span className="font-semibold">Available:</span>
                    <div>{formatEther(poolInfo[1] || 0n)} ETH</div>
                  </div>
                  <div>
                    <span className="font-semibold">Loaned:</span>
                    <div>{formatEther(poolInfo[2] || 0n)} ETH</div>
                  </div>
                  <div>
                    <span className="font-semibold">Lenders:</span>
                    <div>{poolInfo[4]?.toString() || "0"}</div>
                  </div>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount to Deposit (ETH)</span>
                </label>
                <input
                  type="number"
                  placeholder="1.0"
                  className="input input-bordered"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                />
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  className={`btn btn-accent ${isCreditLendingPending ? "loading" : ""}`}
                  onClick={depositToPool}
                  disabled={!stakeAmount || isCreditLendingPending}
                >
                  {isCreditLendingPending ? "Depositing..." : "Deposit to Pool"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditScoringPage;
