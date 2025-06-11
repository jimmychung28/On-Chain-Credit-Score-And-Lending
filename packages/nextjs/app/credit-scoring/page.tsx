"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import {
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { EnhancedCreditDisplay } from "~~/components/EnhancedCreditDisplay";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

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
    contractName: "ZKCreditLending",
    functionName: "loans",
    args: [loanId],
  });

  const { writeContractAsync: writeCreditLendingAsync, isMining: isCreditLendingPending } = useScaffoldWriteContract({
    contractName: "ZKCreditLending",
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

  // Calculate loan details with safe fallbacks - ZK contract returns array: [amount, interestRate, dueDate, isActive, isRepaid, privacyLevel, transparencyPremium]
  const loanAmount = loanData && loanData[0] ? formatEther(BigInt(loanData[0])) : "0";
  const interestRateRaw = loanData && loanData[1] ? Number(loanData[1]) : 0;
  const interestRate = interestRateRaw / 100; // Convert from basis points
  const interest = (parseFloat(loanAmount) * interestRate) / 100;
  const totalRepayment = parseFloat(loanAmount) + interest;
  const isActive = loanData && loanData[3] ? loanData[3] : false;
  const isRepaid = loanData && loanData[4] ? loanData[4] : false;

  // Safe date handling
  const dueDateTimestamp = loanData && loanData[2] ? Number(loanData[2]) : 0;
  const dueDate = new Date(dueDateTimestamp * 1000);
  const isValidDate = !isNaN(dueDate.getTime()) && dueDateTimestamp > 0;
  const isOverdue = isValidDate && Date.now() > dueDate.getTime();
  const daysUntilDue = isValidDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div
      className={`card bg-base-200 shadow-md ${isOverdue ? "border-l-4 border-error" : isActive ? "border-l-4 border-primary" : "border-l-4 border-success"}`}
    >
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-lg font-bold">Loan #{loanId.toString()}</h4>
            <div className={`badge ${isActive ? (isOverdue ? "badge-error" : "badge-primary") : "badge-success"}`}>
              {isRepaid ? "Repaid" : isOverdue ? "Overdue" : "Active"}
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

        {isActive && !isRepaid && (
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

        {isRepaid && (
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
  const { address: connectedAddress, chain: accountChain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [activeTab, setActiveTab] = useState<"profile" | "stake" | "borrow" | "loans">("profile");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedRateSection, setExpandedRateSection] = useState<string | null>(null);

  // Multi-chain state
  const [isLoadingUniversal, setIsLoadingUniversal] = useState(false);
  const [universalScore, setUniversalScore] = useState<{
    score: number;
    timestamp: number;
    isStale: boolean;
  } | null>(null);
  const [chainScores, setChainScores] = useState<
    Array<{
      chainId: number;
      score: number;
      timestamp: number;
      isActive: boolean;
    }>
  >([]);

  // Contract read hooks - enhanced with privacy features
  const { data: creditProfile } = useScaffoldReadContract({
    contractName: "ZKCreditScoring",
    functionName: "getCreditProfile",
    args: [connectedAddress],
  });

  // Debug logging - use useEffect to avoid re-render loops
  useEffect(() => {
    console.log("=== DEBUG: Credit Profile Loading ===");
    console.log("Connected address:", connectedAddress);
    console.log("Credit profile raw data:", creditProfile);
    console.log("Credit profile type:", typeof creditProfile);
    console.log("Is credit profile array?", Array.isArray(creditProfile));
  }, [connectedAddress, creditProfile]);

  const { data: lenderInfo } = useScaffoldReadContract({
    contractName: "ZKCreditLending",
    functionName: "getLenderInfo",
    args: [connectedAddress],
  });

  const { data: borrowerLoanIds } = useScaffoldReadContract({
    contractName: "ZKCreditLending",
    functionName: "getBorrowerLoans",
    args: [connectedAddress],
  });

  // ZK privacy features - transparency premium available
  const { data: transparencyPremium } = useScaffoldReadContract({
    contractName: "ZKCreditScoring",
    functionName: "getTransparencyPremium",
    args: [connectedAddress],
  });

  // ZK contracts don't expose detailed breakdowns for privacy - use placeholder data
  const scoreBreakdown = null;
  const enhancedProfile = null;

  // Get current transparency premium for display
  const currentTransparencyPremium = transparencyPremium ? Number(transparencyPremium) / 100 : 0;

  // Contract write hooks - enhanced with privacy features
  const { writeContractAsync: writeCreditScoringAsync } = useScaffoldWriteContract({
    contractName: "ZKCreditScoring",
  });

  useEffect(() => {
    console.log("=== DEBUG: Contract Hooks ===");
    console.log("writeCreditScoringAsync available:", !!writeCreditScoringAsync);
    console.log("writeCreditScoringAsync type:", typeof writeCreditScoringAsync);
  }, [writeCreditScoringAsync]);
  const { writeContractAsync: writeCreditLendingAsync, isMining: isCreditLendingPending } = useScaffoldWriteContract({
    contractName: "ZKCreditLending",
  });

  // Multi-chain contract hooks (removed unused variables)

  // Universal score contract hooks
  const { data: universalScoreData } = useScaffoldReadContract({
    contractName: "CrossChainCreditAggregator",
    functionName: "getUniversalScore",
    args: [connectedAddress],
  });

  const { data: allChainScores } = useScaffoldReadContract({
    contractName: "CrossChainCreditAggregator",
    functionName: "getUserChainData",
    args: [connectedAddress],
  });

  const {
    data: estimatedFee,
    error: feeError,
    isLoading: feeLoading,
  } = useScaffoldReadContract({
    contractName: "CrossChainCreditAggregator",
    functionName: "estimateUniversalScoreFee",
    args: [connectedAddress],
  });

  // Debug fee estimation
  useEffect(() => {
    console.log("=== FEE ESTIMATION DEBUG ===");
    console.log("Estimated fee:", estimatedFee);
    console.log("Fee error:", feeError);
    console.log("Fee loading:", feeLoading);
    console.log("Connected address for fee:", connectedAddress);
  }, [estimatedFee, feeError, feeLoading, connectedAddress]);

  // Supported chains for multi-chain functionality (commented out to avoid console spam)
  // const { data: supportedChains } = useScaffoldReadContract({
  //   contractName: "CrossChainCreditAggregator",
  //   functionName: "getSupportedChains",
  // });

  const { writeContractAsync: requestUniversalScore } = useScaffoldWriteContract({
    contractName: "CrossChainCreditAggregator",
  });

  // Read user registration status for multi-chain
  const { data: userProfile } = useScaffoldReadContract({
    contractName: "ZKCreditScoring",
    functionName: "creditProfiles",
    args: [connectedAddress],
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
    console.log("=== REGISTRATION FUNCTION START ===");
    console.log("Function called at:", new Date().toISOString());
    console.log("Connected address:", connectedAddress);
    console.log("Is registered (before check):", isRegistered);
    console.log("Credit profile:", creditProfile);
    console.log("Wallet client available:", !!walletClient);

    if (!connectedAddress) {
      console.log("❌ No connected address, returning");
      return;
    }

    console.log("📝 Setting isRegistering to true...");
    setIsRegistering(true);

    try {
      console.log("🔍 Checking if user is already registered...");
      // Check if user is already registered first
      if (isRegistered) {
        console.log("ℹ️ User is already registered, showing toast");
        addToast("info", "You are already registered!");
        return;
      }

      console.log("✅ User not registered, proceeding with registration...");
      console.log("Wallet client status:", !!walletClient);
      console.log("Connected address:", connectedAddress);
      console.log("Account chain:", accountChain);

      try {
        // Try registration with clear user guidance
        console.log("🚀 Attempting transaction...");
        addToast("info", "Please check your wallet and approve the transaction when prompted.");

        console.log("=== Using scaffold-eth hook ===");
        console.log("About to call writeCreditScoringAsync with:");
        console.log("- functionName: registerUser");
        console.log("- args: []");
        console.log("- writeCreditScoringAsync type:", typeof writeCreditScoringAsync);

        // Use scaffold-eth hook (clean and simple)
        console.log("🔄 Calling writeCreditScoringAsync...");

        const tx = await writeCreditScoringAsync({
          functionName: "registerUser",
          args: undefined,
        });

        console.log("✅ Registration transaction successful:", tx);

        console.log("Transaction sent successfully!");
        console.log("Transaction details:", tx);

        addToast("success", "Successfully registered! Building your credit profile...");
      } catch (innerError: any) {
        console.error("Inner transaction error:", innerError);
        console.error("Error name:", innerError?.name);
        console.error("Error code:", innerError?.code);
        console.error("Error details:", innerError);
        throw innerError;
      }
    } catch (error: any) {
      console.error("=== DEBUG: Registration Error ===");
      console.error("Full error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      if (error.message?.includes("User already registered")) {
        addToast("info", "You are already registered!");
      } else {
        if (error.message?.includes("timeout")) {
          addToast(
            "error",
            "Registration is taking longer than expected. Please check your wallet for a pending transaction or try refreshing the page.",
          );
        } else {
          addToast("error", `Registration failed: ${error.message}`);
        }
      }
    } finally {
      console.log("Setting isRegistering to false");
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

  // Add Credit Scoring contract write hook for privacy functions
  const { writeContractAsync: writeZKCreditScoringAsync } = useScaffoldWriteContract({
    contractName: "ZKCreditScoring",
  });

  // Multi-chain functions
  const handleRequestUniversalScore = async () => {
    console.log("=== UNIVERSAL SCORE BUTTON CLICKED ===");
    console.log("Connected address:", connectedAddress);
    console.log("Estimated fee:", estimatedFee);
    console.log("User profile:", userProfile);

    if (!connectedAddress) {
      console.log("❌ No connected address");
      addToast("error", "Please connect your wallet first");
      return;
    }

    if (!estimatedFee) {
      console.log("❌ No estimated fee, but proceeding anyway");
      console.log("Fee error:", feeError);
      addToast("info", "Unable to estimate fee - proceeding with default amount");
    }

    try {
      console.log("📝 Setting loading state...");
      setIsLoadingUniversal(true);

      // Check if user is registered in credit scoring system
      console.log("🔍 Checking if user is registered...");
      if (!userProfile || !userProfile[2]) {
        // isActive at index 2
        console.log("ℹ️ User not registered, registering first...");
        notification.info("Registering user in credit scoring system...");

        // Use the same registration approach as the main register function
        await writeCreditScoringAsync({
          functionName: "registerUser",
          args: undefined,
        });

        notification.success("User registered successfully!");
        console.log("✅ User registration completed");

        // Wait a moment for the transaction to be mined
        console.log("⏳ Waiting for transaction to be mined...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log("✅ User already registered");
      }

      // Now request universal score
      console.log("🌐 Requesting universal score...");
      const feeToUse = estimatedFee || parseEther("0.01"); // Default to 0.01 ETH if estimation fails
      console.log("Using fee amount:", feeToUse);

      await requestUniversalScore({
        functionName: "requestUniversalScore",
        args: [connectedAddress],
        value: feeToUse,
      });
      console.log("✅ Universal score request submitted");
      addToast("success", "Universal score request submitted!");
    } catch (error: any) {
      console.error("Failed to request universal score:", error);

      // Check if the error is related to user registration
      if (error.message && error.message.includes("User not registered")) {
        addToast("error", "Please register in the credit scoring system first");
      } else {
        addToast(
          "error",
          "Failed to request universal score. This may be due to LayerZero configuration on localhost.",
        );
      }
    } finally {
      setIsLoadingUniversal(false);
    }
  };

  // Privacy/Transparency functions - now fully available with ZK contracts
  const updateTransparencyLevel = async (level: number) => {
    try {
      await writeZKCreditScoringAsync({
        functionName: "updateTransparencyLevel",
        args: [level],
      });
      addToast("success", `Privacy level updated to ${level}`);
    } catch (error: any) {
      console.error("Transparency update error:", error);
      addToast("error", `Failed to update transparency: ${error.message}`);
    }
  };

  const switchToMaxPrivacy = async () => {
    try {
      await writeZKCreditScoringAsync({
        functionName: "switchToMaxPrivacy",
      });
      addToast("success", "Switched to maximum privacy level (FREE)");
    } catch (error: any) {
      console.error("Privacy switch error:", error);
      addToast("error", `Failed to switch to privacy: ${error.message}`);
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

  // Get pool info (which includes utilization)
  const { data: poolInfoData } = useScaffoldReadContract({
    contractName: "ZKCreditLending",
    functionName: "getPoolInfo",
  });

  // Get loan eligibility (which includes dynamic rate)
  const { data: loanEligibility } = useScaffoldReadContract({
    contractName: "ZKCreditLending",
    functionName: "checkLoanEligibility",
    args: [connectedAddress, parseEther(loanAmount || "1")],
  });

  // Update dynamic rate when data changes
  useEffect(() => {
    if (poolInfoData && poolInfoData[3]) {
      setCurrentUtilization(Number(poolInfoData[3]) / 100);
    }

    if (loanEligibility && loanEligibility[0]) {
      const rate = Number(loanEligibility[2]) / 100;
      setDynamicRate(`${rate.toFixed(2)}%`);
    } else if (loanEligibility && !loanEligibility[0]) {
      setDynamicRate("N/A");
    }

    // For ZKCreditLending, we can build basic rate components from loan eligibility data
    if (loanEligibility) {
      setRateComponents({
        creditScore: 650, // Default since we don't have individual components
        poolUtilization: poolInfoData ? Number(poolInfoData[3]) / 100 : 0,
        baseUtilizationRate: loanEligibility[0] ? Number(loanEligibility[2]) / 100 : 0,
        creditAdjustedRate: loanEligibility[0] ? Number(loanEligibility[2]) / 100 : 0,
        marketAdjustedRate: loanEligibility[0] ? Number(loanEligibility[2]) / 100 : 0,
        finalRate: loanEligibility[0] ? Number(loanEligibility[2]) / 100 : 0,
      });
    }
  }, [poolInfoData, loanEligibility]);

  // Handle universal score data
  useEffect(() => {
    if (universalScoreData) {
      setUniversalScore({
        score: Number(universalScoreData[0]),
        timestamp: Number(universalScoreData[1]),
        isStale: universalScoreData[2],
      });
    }
  }, [universalScoreData]);

  // Handle chain scores data
  useEffect(() => {
    if (allChainScores && Array.isArray(allChainScores) && allChainScores[0] && Array.isArray(allChainScores[0])) {
      const scores: Array<{
        chainId: number;
        score: number;
        timestamp: number;
        isActive: boolean;
      }> = [];
      const [chainIds, , scoreValues, , timestamps] = allChainScores as readonly [
        readonly number[],
        readonly string[],
        readonly bigint[],
        readonly number[],
        readonly bigint[],
      ];

      for (let i = 0; i < chainIds.length; i++) {
        scores.push({
          chainId: Number(chainIds[i]),
          score: Number(scoreValues[i]),
          timestamp: Number(timestamps[i]),
          isActive: true,
        });
      }
      setChainScores(scores);
    } else {
      setChainScores([]);
    }
  }, [allChainScores]);

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

  // Check if user is registered - ZK contract returns tuple [score, lastUpdated, isActive, privacyLevel, isVerified]
  const isRegistered = !!(creditProfile && creditProfile[2] === true); // isActive is at index 2

  // Debug registration status
  useEffect(() => {
    console.log("=== DEBUG: Registration Check ===");
    console.log("Is registered:", isRegistered);
    console.log("creditProfile[2] (isActive):", creditProfile?.[2]);
    console.log("creditProfile full:", creditProfile);
    console.log("typeof creditProfile:", typeof creditProfile);
    console.log("creditProfile === undefined:", creditProfile === undefined);
  }, [isRegistered, creditProfile]);

  // Show loading state while data is being fetched
  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p>Please connect your wallet</p>
        </div>
      </div>
    );
  }

  // Show loading state while profile data is being fetched
  if (creditProfile === undefined) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p>Loading your credit profile...</p>
        </div>
      </div>
    );
  }

  // Registration screen - only show for confirmed unregistered users
  console.log("=== DEBUG: Registration Screen Check ===");
  console.log("Should show registration screen?", creditProfile !== undefined && !isRegistered);
  console.log("creditProfile !== undefined:", creditProfile !== undefined);
  console.log("!isRegistered:", !isRegistered);

  if (creditProfile !== undefined && !isRegistered) {
    console.log("SHOWING REGISTRATION SCREEN");
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
              onClick={() => {
                console.log("=== DEBUG: Register Button Clicked ===");
                console.log("Button state - isRegistering:", isRegistering);
                console.log("Button state - connectedAddress:", connectedAddress);
                console.log("Button disabled?", isRegistering || !connectedAddress);
                registerUser();
              }}
              disabled={isRegistering || !connectedAddress}
            >
              {isRegistering ? "Registering..." : "Get Started with Privacy"}
            </button>

            {/* Debug button state */}
            <div className="mt-2 text-xs text-base-content/50">
              Debug: isRegistering={isRegistering ? "true" : "false"}, connected={connectedAddress ? "true" : "false"},
              disabled={isRegistering || !connectedAddress ? "true" : "false"}
            </div>

            <div className="mt-6 text-left">
              <h3 className="font-semibold mb-2">How it works:</h3>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• Your on-chain activity builds your credit score</li>
                <li>
                  • <span className="text-green-600">🔐 Privacy-first:</span> Financial data stays private
                </li>
                <li>• Stake ETH to earn yield from lending</li>
                <li>• Get loans based on your creditworthiness</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-600">🛡️</span>
                <span className="font-semibold text-green-700 text-sm">Default Privacy Protection</span>
              </div>
              <p className="text-xs text-green-600">
                Your financial data is cryptographically private by default. Optional transparency features available
                after registration.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const creditScore = (() => {
    if (creditProfile && creditProfile[2]) {
      // isActive at index 2
      const score = Number(creditProfile[0]); // score at index 0
      // If user is registered but has no score (score = 0), give them a starting score
      if (score === 0) {
        return 300; // Minimum score for new users
      }
      return score;
    }
    return 0;
  })();

  // Calculate realistic APY based on current utilization and base rates
  const calculateCurrentAPY = () => {
    if (!poolInfoData || !poolInfoData[0] || Number(poolInfoData[0]) === 0) return "0.0";

    const totalPool = Number(poolInfoData[0]);
    const currentlyLoaned = Number(poolInfoData[2]);
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

  console.log("=== DEBUG: Rendering Main Interface ===");
  console.log("User is registered, showing main credit scoring interface");

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
                <p className="text-base-content/70 mt-1">Privacy-first behavioral credit scoring for DeFi</p>
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
                  <div className="flex gap-2">
                    <div className="badge badge-success badge-sm">🔐 Private</div>
                    {universalScore && universalScore.score > 0 ? (
                      <div className="badge badge-accent badge-sm">🌐 Universal</div>
                    ) : (
                      <div className="badge badge-primary badge-sm">🏠 Local</div>
                    )}
                    <div className="badge badge-primary badge-lg">
                      {getCreditRating(universalScore?.score || creditScore)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getCreditScoreColor(universalScore?.score || creditScore)}`}>
                      {universalScore?.score || creditScore}
                    </div>
                    <div className="text-sm text-base-content/70 mt-1">out of 850</div>
                    {universalScore && universalScore.score > 0 ? (
                      <div className="text-xs text-success mt-1">🌐 Enhanced with cross-chain data</div>
                    ) : (
                      <div className="text-xs text-base-content/60 mt-1">📈 Can be enhanced with Universal Score</div>
                    )}
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
                        className={`h-3 rounded-full ${getScoreBarColor(universalScore?.score || creditScore)} transition-all duration-1000`}
                        style={{ width: `${(((universalScore?.score || creditScore) - 300) / 550) * 100}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-base-content/70">
                      Your loan rate:{" "}
                      <span className="font-semibold">{getInterestRate(universalScore?.score || creditScore)}</span>
                    </div>
                    {!universalScore || universalScore.score === 0 ? (
                      <div className="mt-2">
                        <button
                          className="btn btn-sm btn-outline btn-accent"
                          onClick={handleRequestUniversalScore}
                          disabled={isLoadingUniversal}
                        >
                          {isLoadingUniversal ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            "🌐 Get Universal Score"
                          )}
                        </button>
                      </div>
                    ) : (
                      universalScore.isStale && (
                        <div className="mt-2">
                          <button
                            className="btn btn-xs btn-outline btn-warning"
                            onClick={handleRequestUniversalScore}
                            disabled={isLoadingUniversal}
                          >
                            {isLoadingUniversal ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : (
                              "🔄 Refresh Score"
                            )}
                          </button>
                        </div>
                      )
                    )}
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
                    <div className="text-xl font-bold">
                      {lenderInfo ? `${Number(formatEther(lenderInfo[0])).toFixed(4)} ETH` : "0.0000 ETH"}
                    </div>
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
              <GlobeAltIcon className="h-4 w-4 mr-1" />
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
            <div className="space-y-6">
              {/* Enhanced Credit Display */}
              <EnhancedCreditDisplay
                scoreBreakdown={
                  scoreBreakdown
                    ? {
                        transactional: Number(scoreBreakdown[0]),
                        behavioral: Number(scoreBreakdown[1]),
                        asset: Number(scoreBreakdown[2]),
                        defi: Number(scoreBreakdown[3]),
                        repayment: Number(scoreBreakdown[4]),
                        governance: Number(scoreBreakdown[5]),
                        social: Number(scoreBreakdown[6]),
                      }
                    : undefined
                }
                enhancedProfile={
                  enhancedProfile
                    ? {
                        totalGasPaid: BigInt(enhancedProfile[0]),
                        uniqueProtocols: BigInt(enhancedProfile[1]),
                        stablecoinRatio: BigInt(enhancedProfile[2]),
                        assetDiversity: BigInt(enhancedProfile[3]),
                        avgHoldingPeriod: BigInt(enhancedProfile[4]),
                        liquidityProvided: BigInt(enhancedProfile[5]),
                        stakingRewards: BigInt(enhancedProfile[6]),
                        governanceVotes: BigInt(enhancedProfile[7]),
                        nftInteractions: BigInt(enhancedProfile[8]),
                        socialScore: BigInt(enhancedProfile[9]),
                      }
                    : undefined
                }
              />

              {/* Cross-Chain Information - only show if user has universal score or cross-chain data */}
              {(universalScore?.score || chainScores.length > 0) && (
                <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <GlobeAltIcon className="h-6 w-6 text-accent" />
                    Cross-Chain Credit Data
                  </h3>

                  {/* Chain Breakdown */}
                  {chainScores.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold mb-3">🌐 Multi-Chain Score Breakdown</h4>
                      <div className="space-y-3">
                        {chainScores.map(chainScore => {
                          const chainNames: Record<number, string> = {
                            1: "Ethereum",
                            137: "Polygon",
                            42161: "Arbitrum",
                            10: "Optimism",
                            8453: "Base",
                            31337: "Localhost",
                          };
                          return (
                            <div
                              key={chainScore.chainId}
                              className="flex items-center justify-between p-3 bg-base-200 rounded"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-4 h-4 rounded-full bg-accent"></div>
                                <span className="font-medium">
                                  {chainNames[chainScore.chainId] || `Chain ${chainScore.chainId}`}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">{chainScore.score}</div>
                                <div className="text-xs text-base-content/70">
                                  {new Date(chainScore.timestamp * 1000).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Universal Score Benefits */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-2">🌐 Cross-Chain Bonuses</h4>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">+50</span>
                          <span>Diversification Bonus</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">+30</span>
                          <span>Consistency Bonus</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">+25</span>
                          <span>Volume Bonus</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-green-600">+15</span>
                          <span>Sophistication Bonus</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-2">⚡ Benefits</h4>
                      <ul className="text-sm space-y-2">
                        <li>• Better interest rates</li>
                        <li>• Higher loan limits</li>
                        <li>• Faster approvals</li>
                        <li>• Reduced collateral</li>
                      </ul>
                    </div>
                  </div>

                  {universalScore && universalScore.isStale && (
                    <div className="mt-4 p-3 bg-warning/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-warning">⚠️</span>
                        <span className="text-sm">
                          Your universal score is stale. Refresh for the most current data.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Sophisticated Credit Score Factors */}
                <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold mb-4">Sophisticated Credit Factors</h3>
                  <div className="space-y-4">
                    {/* Transactional Behavior - 20% */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Transactional Behavior</span>
                        <span className="text-sm text-base-content/70">20% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">
                          Total transaction volume, frequency patterns & account maturity
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>Volume:</strong> Total ETH moved across all transactions
                          </div>
                          <div>
                            • <strong>Frequency:</strong> Consistency and regularity of on-chain activity
                          </div>
                          <div>
                            • <strong>Account Age:</strong> Length of time your wallet has been active
                          </div>
                          <div>
                            • <strong>Avg Transaction Size:</strong> Economic sophistication indicators
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - amounts private, patterns analyzed</span>
                        </div>
                      </div>
                    </div>

                    {/* Behavioral Patterns - 15% */}
                    <div className="border-l-4 border-purple-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Behavioral Patterns</span>
                        <span className="text-sm text-base-content/70">15% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">
                          Smart transaction patterns & protocol interaction quality
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>Gas Efficiency:</strong> Strategic fee management (higher gas = more valuable
                            transactions)
                          </div>
                          <div>
                            • <strong>Protocol Diversity:</strong> Number of unique DeFi protocols used
                          </div>
                          <div>
                            • <strong>Transaction Types:</strong> DeFi interactions vs simple transfers
                          </div>
                          <div>
                            • <strong>Smart Contract Calls:</strong> Complexity and sophistication of interactions
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - behavior patterns, not specific transactions</span>
                        </div>
                      </div>
                    </div>

                    {/* Asset Management - 15% */}
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Asset Management</span>
                        <span className="text-sm text-base-content/70">15% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">Portfolio sophistication & risk management strategies</div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>Asset Diversity:</strong> Number of different tokens held (rewards
                            diversification)
                          </div>
                          <div>
                            • <strong>Stablecoin Ratio:</strong> Risk management balance (optimal: 20-40%)
                          </div>
                          <div>
                            • <strong>Holding Patterns:</strong> Long-term vs short-term investment behavior
                          </div>
                          <div>
                            • <strong>Token Quality:</strong> Blue-chip vs speculative asset preferences
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - portfolio structure, not balances</span>
                        </div>
                      </div>
                    </div>

                    {/* DeFi Participation - 20% */}
                    <div className="border-l-4 border-orange-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">DeFi Participation</span>
                        <span className="text-sm text-base-content/70">20% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">Active contribution to DeFi ecosystem health & growth</div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>Liquidity Provision:</strong> DEX liquidity contributions (Uniswap, Curve, etc.)
                          </div>
                          <div>
                            • <strong>Staking Rewards:</strong> Ethereum and protocol staking participation
                          </div>
                          <div>
                            • <strong>Yield Farming:</strong> Sophisticated DeFi strategy implementation
                          </div>
                          <div>
                            • <strong>Protocol Tokens:</strong> Long-term alignment with protocol success
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - participation level, not specific positions</span>
                        </div>
                      </div>
                    </div>

                    {/* Repayment History - 20% */}
                    <div className="border-l-4 border-emerald-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Repayment History</span>
                        <span className="text-sm text-base-content/70">20% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">Track record of honoring financial commitments</div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>Loan Performance:</strong> Percentage of loans successfully repaid
                          </div>
                          <div>
                            • <strong>Payment Timing:</strong> Early vs late payment patterns
                          </div>
                          <div>
                            • <strong>Default Rate:</strong> Historical reliability in meeting obligations
                          </div>
                          <div>
                            • <strong>Loan Diversity:</strong> Experience across different protocols and loan types
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - performance metrics, not loan amounts</span>
                        </div>
                      </div>
                    </div>

                    {/* Governance - 5% */}
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Governance</span>
                        <span className="text-sm text-base-content/70">5% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">Community leadership & responsible protocol stewardship</div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>DAO Voting:</strong> Active participation in protocol governance decisions
                          </div>
                          <div>
                            • <strong>Proposal Creation:</strong> Leadership in community governance initiatives
                          </div>
                          <div>
                            • <strong>Voting Consistency:</strong> Regular long-term engagement vs one-time
                            participation
                          </div>
                          <div>
                            • <strong>Delegation:</strong> Responsible delegation patterns and proxy voting behavior
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - participation counts, not voting choices</span>
                        </div>
                      </div>
                    </div>

                    {/* Social Reputation - 5% */}
                    <div className="border-l-4 border-pink-500 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Social Reputation</span>
                        <span className="text-sm text-base-content/70">5% weight</span>
                      </div>
                      <div className="text-sm text-base-content/80 mb-2">
                        <div className="font-medium mb-1">Verified identity & positive community contributions</div>
                        <div className="text-xs space-y-1">
                          <div>
                            • <strong>On-Chain Attestations:</strong> Gitcoin Passport, ENS, verified identity systems
                          </div>
                          <div>
                            • <strong>NFT Activity:</strong> Cultural engagement and ecosystem participation
                          </div>
                          <div>
                            • <strong>Social Protocols:</strong> Lens, Farcaster, and decentralized social platforms
                          </div>
                          <div>
                            • <strong>Community Building:</strong> Open source contributions and ecosystem development
                          </div>
                        </div>
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <span>🔐</span>
                          <span>ZK verified - reputation scores, not social connections</span>
                        </div>
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

                {/* Privacy Settings */}
                <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span>🛡️</span> Privacy Settings
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-600">✅</span>
                        <span className="font-semibold text-green-700">Current Status</span>
                      </div>
                      <div className="text-sm">
                        <div>
                          Privacy Level: <span className="font-bold">5 (Maximum)</span>
                        </div>
                        <div>
                          Transparency Premium: <span className="font-bold">{currentTransparencyPremium}%</span>
                        </div>
                        <div className="text-green-600 mt-1">✓ Maximum Privacy (Free)</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold">Choose Your Privacy Level:</h4>

                      {/* Privacy Level Options */}
                      {[
                        {
                          level: 5,
                          name: "Maximum Privacy",
                          premium: "0%",
                          description: "All data private (FREE)",
                          color: "green",
                        },
                        {
                          level: 4,
                          name: "Minimal Public",
                          premium: "0.5%",
                          description: "Basic score visible",
                          color: "blue",
                        },
                        {
                          level: 3,
                          name: "Partial Public",
                          premium: "1.0%",
                          description: "Score + volume visible",
                          color: "yellow",
                        },
                        {
                          level: 2,
                          name: "Mostly Public",
                          premium: "1.5%",
                          description: "Most data visible",
                          color: "orange",
                        },
                        {
                          level: 1,
                          name: "Fully Public",
                          premium: "2.0%",
                          description: "All data public",
                          color: "red",
                        },
                      ].map(option => (
                        <div
                          key={option.level}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            option.level === 5
                              ? `border-green-500 bg-green-50`
                              : "border-base-300 hover:border-base-400"
                          }`}
                          onClick={() => updateTransparencyLevel(option.level)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold flex items-center gap-2">
                                Level {option.level}: {option.name}
                                {option.level === 5 && <span className="text-green-600">✓ Current</span>}
                              </div>
                              <div className="text-xs text-base-content/70">{option.description}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${option.level === 5 ? "text-green-600" : "text-orange-600"}`}>
                                {option.premium}
                              </div>
                              <div className="text-xs text-base-content/70">premium</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-600">💡</span>
                        <span className="font-semibold text-blue-700 text-sm">Economic Honesty</span>
                      </div>
                      <p className="text-xs text-blue-600">
                        Privacy is FREE because it&apos;s cheaper to provide. You only pay premiums for expensive public
                        processing.
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <button className="btn btn-success btn-sm w-full" onClick={switchToMaxPrivacy} disabled={false}>
                        🔒 Switch to Maximum Privacy (FREE)
                      </button>

                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-600">✅</span>
                          <span className="font-semibold text-green-700 text-sm">Privacy Controls Active</span>
                        </div>
                        <p className="text-xs text-green-600">
                          Privacy controls what external parties can see. You always see your full data. Privacy is
                          always free!
                        </p>
                      </div>
                    </div>
                  </div>
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
                        {poolInfoData && Number(poolInfoData[0]) > 0
                          ? `${((Number(poolInfoData[2]) / Number(poolInfoData[0])) * 100).toFixed(1)}% utilization`
                          : "0.0% utilization"}
                      </div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Your Staked</div>
                      <div className="stat-value text-2xl">
                        {lenderInfo ? Number(formatEther(lenderInfo[0])).toFixed(4) : "0.0000"} ETH
                      </div>
                      <div className="stat-desc text-xs">
                        {lenderInfo && Number(formatEther(lenderInfo[0])) > 0
                          ? `~${((Number(formatEther(lenderInfo[0])) * parseFloat(currentAPY)) / 100).toFixed(4)} ETH/year`
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
                      {poolInfoData &&
                        Number(poolInfoData[0]) > 0 &&
                        ` Current rate: ${((Number(poolInfoData[2]) / Number(poolInfoData[0])) * 100).toFixed(1)}% of pool lent out.`}
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

                {lenderInfo && Number(formatEther(lenderInfo[0])) > 0 ? (
                  <div>
                    <div className="divider">Manage Stake</div>
                    <button
                      className="btn btn-outline btn-secondary w-full"
                      onClick={() => unstakeETH(formatEther(lenderInfo[0]))}
                    >
                      Unstake All ({Number(formatEther(lenderInfo[0])).toFixed(4)} ETH)
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Pool Information */}
              <div className="bg-base-100 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4">Lending Pool Stats</h3>

                {poolInfoData && (
                  <div className="space-y-4">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Total Pool Size</div>
                      <div className="stat-value">{formatEther(poolInfoData[0])} ETH</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Available to Lend</div>
                      <div className="stat-value">{formatEther(poolInfoData[1])} ETH</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Currently Loaned</div>
                      <div className="stat-value">{formatEther(poolInfoData[2])} ETH</div>
                    </div>

                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Total Interest Earned</div>
                      <div className="stat-value">{formatEther(poolInfoData[4])} ETH</div>
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
                        <span className="font-semibold text-primary">
                          {getInterestRate(universalScore?.score || creditScore)}
                        </span>
                        {universalScore?.score && universalScore.score > creditScore && (
                          <span className="text-xs text-success ml-2">🌐 Enhanced by Universal Score</span>
                        )}
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

                  {(universalScore?.score || creditScore) < 350 ? (
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
                      <div className="stat-value">{borrowerLoanIds ? borrowerLoanIds.length : 0}</div>
                      <div className="stat-desc">All time</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Successfully Repaid</div>
                      <div className="stat-value text-success">0</div>
                      <div className="stat-desc">No history yet (ZK Privacy)</div>
                    </div>
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title">Defaults</div>
                      <div className="stat-value text-error">0</div>
                      <div className="stat-desc">Perfect record!</div>
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
