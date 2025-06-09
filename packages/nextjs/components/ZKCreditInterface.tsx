"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { type CreditData, type ZKProof, formatProofForContract, generateCreditProof } from "~~/utils/zkProof";

const PRIVACY_LEVELS = [
  { level: 1, name: "Full Transparency", premium: "2.0%", description: "All data public" },
  { level: 2, name: "High Transparency", premium: "1.5%", description: "Most data public" },
  { level: 3, name: "Moderate Privacy", premium: "1.0%", description: "Limited data public" },
  { level: 4, name: "High Privacy", premium: "0.5%", description: "Minimal data public" },
  { level: 5, name: "Maximum Privacy", premium: "0%", description: "No data public (default)" },
];

export const ZKCreditInterface = () => {
  const { address } = useAccount();
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [proofGenerated, setProofGenerated] = useState<ZKProof | null>(null);
  const [selectedPrivacyLevel, setSelectedPrivacyLevel] = useState(5);

  // Form state for credit data input
  const [creditData, setCreditData] = useState<CreditData>({
    creditScore: 750,
    accountAge: 48, // months
    paymentHistory: 95, // percentage
    creditUtilization: 25, // percentage
    debtToIncome: 35, // percentage
    privacyLevel: 5,
  });

  // Read user's current credit profile
  const { data: userProfile } = useScaffoldReadContract({
    contractName: "ZKCreditScoring",
    functionName: "getCreditProfile",
    args: [address],
  });

  // Contract write functions
  const { writeContractAsync: submitProof } = useScaffoldWriteContract({
    contractName: "ZKCreditScoring",
  });

  const { writeContractAsync: registerUser } = useScaffoldWriteContract({
    contractName: "ZKCreditScoring",
  });

  const { writeContractAsync: updatePrivacyLevel } = useScaffoldWriteContract({
    contractName: "ZKCreditScoring",
  });

  // Update privacy level in form when selection changes
  useEffect(() => {
    setCreditData(prev => ({ ...prev, privacyLevel: selectedPrivacyLevel }));
  }, [selectedPrivacyLevel]);

  const handleGenerateProof = async () => {
    try {
      setIsGeneratingProof(true);
      console.log("🔐 Starting ZK proof generation...");

      const proof = await generateCreditProof(creditData, 600); // Min score threshold of 600
      setProofGenerated(proof);

      console.log("✅ ZK proof generated successfully:", proof);
    } catch (error) {
      console.error("❌ Failed to generate proof:", error);
      alert("Failed to generate ZK proof. Check console for details.");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofGenerated || !address) return;

    try {
      console.log("📤 Submitting ZK proof to contract...");

      const formattedProof = formatProofForContract(proofGenerated);

      // Create commitment to private data (32-byte hex string)
      const commitmentData = JSON.stringify({
        accountAge: creditData.accountAge,
        paymentHistory: creditData.paymentHistory,
        creditUtilization: creditData.creditUtilization,
        debtToIncome: creditData.debtToIncome,
        timestamp: Date.now(),
      });

      const encoder = new TextEncoder();
      const data = encoder.encode(commitmentData);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const commitment = `0x${hashArray.map(b => b.toString(16).padStart(2, "0")).join("")}`;

      // Public signals - must be uint256[3] for the contract
      const publicSignals = [
        BigInt(creditData.creditScore),
        BigInt(Math.floor(Date.now() / 1000)),
        BigInt(
          parseInt(
            `0x${Array.from(new TextEncoder().encode(address + "31337"))
              .map(b => b.toString(16).padStart(2, "0"))
              .join("")}`.slice(0, 10),
            16,
          ),
        ),
      ] as const;

      await submitProof({
        functionName: "submitCreditProof",
        args: [
          formattedProof.proof as `0x${string}`, // bytes
          publicSignals, // uint256[3]
          commitment as `0x${string}`, // bytes32
          BigInt(1000000), // totalVolume
          BigInt(50), // transactionCount
          BigInt(5), // loanCount
          BigInt(5), // repaidLoans
          BigInt(0), // defaultedLoans
        ],
      });

      console.log("✅ ZK proof submitted successfully!");
      setProofGenerated(null); // Clear the proof after submission
    } catch (error) {
      console.error("❌ Failed to submit proof:", error);
      alert("Failed to submit ZK proof. Check console for details.");
    }
  };

  const handleRegisterUser = async () => {
    if (!address) return;

    try {
      setIsRegistering(true);
      console.log("🚀 Starting user registration...");
      console.log("Address:", address);
      console.log("Privacy Level:", selectedPrivacyLevel);

      let tx;
      if (selectedPrivacyLevel === 5) {
        console.log("Calling registerUser()...");
        tx = await registerUser({
          functionName: "registerUser",
        } as any);
      } else {
        console.log("Calling registerUserWithTransparency()...");
        tx = await registerUser({
          functionName: "registerUserWithTransparency",
          args: [selectedPrivacyLevel],
        } as any);
      }

      console.log("✅ User registered successfully! Transaction:", tx);
      alert("User registered successfully! Please wait for the profile to update.");
    } catch (error) {
      console.error("❌ Failed to register user:", error);

      // More detailed error handling
      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
          alert("User is already registered. Please refresh the page.");
        } else if (error.message.includes("insufficient funds")) {
          alert("Insufficient funds for transaction. Please add ETH to your wallet.");
        } else if (error.message.includes("user rejected")) {
          alert("Transaction was rejected by user.");
        } else {
          alert(`Registration failed: ${error.message}`);
        }
      } else {
        alert("Failed to register user. Check console for details.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdatePrivacyLevel = async () => {
    if (!address) return;

    try {
      await updatePrivacyLevel({
        functionName: "updateTransparencyLevel",
        args: [selectedPrivacyLevel],
      });

      console.log("✅ Privacy level updated successfully!");
    } catch (error) {
      console.error("❌ Failed to update privacy level:", error);
      alert("Failed to update privacy level. Check console for details.");
    }
  };

  const isUserRegistered = userProfile && userProfile[2]; // isActive
  const currentScore = userProfile ? Number(userProfile[0]) : 0;
  const currentPrivacyLevel = userProfile ? Number(userProfile[3]) : 5;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">🔒 ZK Credit Scoring System</h2>
          <p className="text-base-content/70 mb-6">
            Generate zero-knowledge proofs of your creditworthiness while preserving privacy. Choose your transparency
            level - more privacy means lower interest rates!
          </p>

          {/* User Status */}
          <div className="alert alert-info">
            <div className="flex items-center space-x-2">
              <span className="text-lg">👤</span>
              <div>
                <div className="font-semibold">User Status</div>
                <div className="text-sm">
                  {isUserRegistered ? (
                    <>
                      ✅ Registered | Score: {currentScore} | Privacy Level: {currentPrivacyLevel}/5
                    </>
                  ) : (
                    "❌ Not Registered"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Level Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Privacy Level Selection</span>
              <span className="label-text-alt">Higher privacy = Lower interest rates</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {PRIVACY_LEVELS.map(level => (
                <div
                  key={level.level}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedPrivacyLevel === level.level
                      ? "border-primary bg-primary/10"
                      : "border-base-300 hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPrivacyLevel(level.level)}
                >
                  <div className="text-center">
                    <div className="font-bold">Level {level.level}</div>
                    <div className="text-xs text-primary font-semibold">{level.premium} premium</div>
                    <div className="text-xs mt-1">{level.name}</div>
                    <div className="text-xs text-base-content/60">{level.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Registration */}
          {!isUserRegistered && (
            <div className="card bg-warning/10 border border-warning">
              <div className="card-body">
                <h3 className="card-title text-warning">Register to Get Started</h3>
                <p className="text-sm mb-4">
                  Register with Privacy Level {selectedPrivacyLevel} ({PRIVACY_LEVELS[selectedPrivacyLevel - 1].name})
                </p>
                <button
                  className={`btn btn-warning ${isRegistering ? "loading" : ""}`}
                  onClick={handleRegisterUser}
                  disabled={!address || isRegistering}
                >
                  {isRegistering ? "Registering..." : "Register User"}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Level Update */}
          {isUserRegistered && currentPrivacyLevel !== selectedPrivacyLevel && (
            <div className="card bg-info/10 border border-info">
              <div className="card-body">
                <h3 className="card-title text-info">Update Privacy Level</h3>
                <p className="text-sm mb-4">
                  Change from Level {currentPrivacyLevel} to Level {selectedPrivacyLevel}
                </p>
                <button className="btn btn-info" onClick={handleUpdatePrivacyLevel} disabled={!address}>
                  Update Privacy Level
                </button>
              </div>
            </div>
          )}

          {/* Credit Data Input */}
          <div className="divider">Credit Data Input</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Credit Score</span>
                <span className="label-text-alt">{creditData.creditScore}</span>
              </label>
              <input
                type="range"
                min="300"
                max="850"
                value={creditData.creditScore}
                className="range range-primary"
                onChange={e => setCreditData(prev => ({ ...prev, creditScore: Number(e.target.value) }))}
              />
              <div className="w-full flex justify-between text-xs px-2">
                <span>300</span>
                <span>500</span>
                <span>700</span>
                <span>850</span>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Account Age (months)</span>
                <span className="label-text-alt">{creditData.accountAge}</span>
              </label>
              <input
                type="range"
                min="0"
                max="600"
                value={creditData.accountAge}
                className="range range-secondary"
                onChange={e => setCreditData(prev => ({ ...prev, accountAge: Number(e.target.value) }))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Payment History (%)</span>
                <span className="label-text-alt">{creditData.paymentHistory}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={creditData.paymentHistory}
                className="range range-accent"
                onChange={e => setCreditData(prev => ({ ...prev, paymentHistory: Number(e.target.value) }))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Credit Utilization (%)</span>
                <span className="label-text-alt">{creditData.creditUtilization}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={creditData.creditUtilization}
                className="range range-warning"
                onChange={e => setCreditData(prev => ({ ...prev, creditUtilization: Number(e.target.value) }))}
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Debt-to-Income Ratio (%)</span>
                <span className="label-text-alt">{creditData.debtToIncome}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={creditData.debtToIncome}
                className="range range-error"
                onChange={e => setCreditData(prev => ({ ...prev, debtToIncome: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* Proof Generation */}
          <div className="divider">ZK Proof Generation</div>
          <div className="space-y-4">
            <button
              className={`btn btn-primary w-full ${isGeneratingProof ? "loading" : ""}`}
              onClick={handleGenerateProof}
              disabled={isGeneratingProof || !isUserRegistered}
            >
              {isGeneratingProof ? "Generating Proof..." : "🔐 Generate ZK Proof"}
            </button>

            {proofGenerated && (
              <div className="card bg-success/10 border border-success">
                <div className="card-body">
                  <h3 className="card-title text-success">✅ ZK Proof Generated!</h3>
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>Score Range Valid:</strong> {proofGenerated.publicSignals[0]}
                    </div>
                    <div>
                      <strong>Masked Score:</strong> {proofGenerated.publicSignals[1]}
                    </div>
                    <div>
                      <strong>Privacy Premium:</strong> {proofGenerated.publicSignals[2]} basis points
                    </div>
                  </div>
                  <div className="card-actions justify-end">
                    <button className="btn btn-success" onClick={handleSubmitProof} disabled={!proofGenerated}>
                      📤 Submit to Blockchain
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Information Panel */}
          <div className="divider">How It Works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="font-semibold">🔒 Privacy First</h4>
                <p>
                  Your financial data stays private using zero-knowledge proofs. Only necessary information is revealed.
                </p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="font-semibold">💰 Incentivized Privacy</h4>
                <p>Choose higher privacy levels to get lower interest rates. Privacy is rewarded, not penalized.</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="font-semibold">🛡️ Cryptographic Security</h4>
                <p>Powered by Groth16 zk-SNARKs, ensuring mathematical proof of your creditworthiness.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
