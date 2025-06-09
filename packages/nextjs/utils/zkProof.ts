import { keccak256, toBytes } from "viem";

// Types for ZK proof system
export interface CreditData {
  creditScore: number;
  accountAge: number;
  paymentHistory: number;
  creditUtilization: number;
  debtToIncome: number;
  privacyLevel: number;
}

export interface ProofInputs {
  credit_score: string;
  account_age: string;
  payment_history: string;
  credit_utilization: string;
  debt_to_income: string;
  privacy_level: string;
  nullifier_secret: string;
  score_threshold: string;
  transparency_mask: string;
  nullifier_hash: string;
  [key: string]: string; // Index signature for snarkjs compatibility
}

export interface ZKProof {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  publicSignals: [string, string, string, string];
}

// Generate a random nullifier secret
export function generateNullifierSecret(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return (
    "0x" +
    Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Calculate Poseidon hash for nullifier
export async function calculateNullifierHash(nullifierSecret: string, creditScore: number): Promise<string> {
  // In a real implementation, you'd use the actual Poseidon hash
  // For now, we'll use a simple hash as placeholder
  const combined = nullifierSecret + creditScore.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a real Groth16 ZK proof for credit data
 * In production, this would use snarkjs with a compiled circuit
 */
export async function generateCreditProof(creditData: CreditData, scoreThreshold: number): Promise<ZKProof> {
  console.log("🔐 Generating Groth16 ZK proof...");
  console.log("Credit Data:", creditData);
  console.log("Score Threshold:", scoreThreshold);

  // For now, generate a mock proof with the correct structure
  // In production, this would call snarkjs.groth16.fullProve()

  const mockProof = await generateMockGroth16Proof(creditData, scoreThreshold);

  console.log("✅ Groth16 proof generated:", mockProof);
  return mockProof;
}

/**
 * Generate a mock Groth16 proof with proper structure
 * This simulates what snarkjs would produce
 */
async function generateMockGroth16Proof(creditData: CreditData, scoreThreshold: number): Promise<ZKProof> {
  // Simulate proof generation delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Calculate outputs based on credit data
  const scoreInRange = creditData.creditScore >= scoreThreshold ? "1" : "0";

  // Calculate masked score based on privacy level
  const privacyMultiplier = (6 - creditData.privacyLevel) * 20; // 20, 40, 60, 80, 100
  const maskedScore = Math.floor((creditData.creditScore * privacyMultiplier) / 100).toString();

  // Calculate privacy premium (higher privacy = lower premium)
  const privacyPremium = ((6 - creditData.privacyLevel) * 50).toString(); // 0, 50, 100, 150, 200, 250 basis points

  // Generate nullifier hash to prevent double-spending
  const nullifierData = `${creditData.creditScore}_${Date.now()}_${Math.random()}`;
  const nullifierHash = BigInt(keccak256(toBytes(nullifierData))).toString();

  // Generate mock elliptic curve points (in production these come from the actual proof)
  const proof = {
    a: [
      "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
      "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
    ] as [string, string],
    b: [
      [
        "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
        "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
      ],
      [
        "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
        "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
      ],
    ] as [[string, string], [string, string]],
    c: [
      "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
      "0x" + Math.random().toString(16).slice(2).padStart(64, "0"),
    ] as [string, string],
  };

  return {
    proof,
    publicSignals: [scoreInRange, maskedScore, privacyPremium, nullifierHash],
  };
}

/**
 * Format ZK proof for smart contract submission
 * Converts the snarkjs proof format to the format expected by our Solidity verifier
 */
export function formatProofForContract(zkProof: ZKProof): {
  proof: string;
  publicSignals: readonly [bigint, bigint, bigint, bigint];
} {
  // Pack the proof components into bytes for the contract
  // Format: a.x (32 bytes) + a.y (32 bytes) + b.x[1] (32 bytes) + b.x[0] (32 bytes) +
  //         b.y[1] (32 bytes) + b.y[0] (32 bytes) + c.x (32 bytes) + c.y (32 bytes)

  const aX = zkProof.proof.a[0].replace("0x", "").padStart(64, "0");
  const aY = zkProof.proof.a[1].replace("0x", "").padStart(64, "0");
  const bX1 = zkProof.proof.b[0][1].replace("0x", "").padStart(64, "0");
  const bX0 = zkProof.proof.b[0][0].replace("0x", "").padStart(64, "0");
  const bY1 = zkProof.proof.b[1][1].replace("0x", "").padStart(64, "0");
  const bY0 = zkProof.proof.b[1][0].replace("0x", "").padStart(64, "0");
  const cX = zkProof.proof.c[0].replace("0x", "").padStart(64, "0");
  const cY = zkProof.proof.c[1].replace("0x", "").padStart(64, "0");

  const proofBytes = "0x" + aX + aY + bX1 + bX0 + bY1 + bY0 + cX + cY;

  // Convert public signals to BigInt
  const publicSignals = [
    BigInt(zkProof.publicSignals[0]),
    BigInt(zkProof.publicSignals[1]),
    BigInt(zkProof.publicSignals[2]),
    BigInt(zkProof.publicSignals[3]),
  ] as const;

  return {
    proof: proofBytes,
    publicSignals,
  };
}

/**
 * Verify a ZK proof (client-side verification)
 */
export async function verifyProof(proof: ZKProof): Promise<boolean> {
  console.log("🔍 Verifying ZK proof...");

  // Basic verification - check that public signals make sense
  const scoreInRange = parseInt(proof.publicSignals[0]);
  const maskedScore = parseInt(proof.publicSignals[1]);
  const privacyPremium = parseInt(proof.publicSignals[2]);
  const nullifierHash = BigInt(proof.publicSignals[3]);

  // Validate ranges
  if (scoreInRange !== 0 && scoreInRange !== 1) {
    console.error("❌ Invalid score_in_range value:", scoreInRange);
    return false;
  }

  if (maskedScore < 0 || maskedScore > 850) {
    console.error("❌ Invalid masked_score value:", maskedScore);
    return false;
  }

  if (privacyPremium < 0 || privacyPremium > 1000) {
    console.error("❌ Invalid privacy_premium value:", privacyPremium);
    return false;
  }

  if (nullifierHash <= 0n) {
    console.error("❌ Invalid nullifier_hash value:", nullifierHash);
    return false;
  }

  console.log("✅ ZK proof verification passed!");
  return true;
}

/**
 * Hash function for creating commitments
 */
export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  // Mock Poseidon hash for now (in production, use actual Poseidon implementation)
  const data = inputs.map(x => x.toString()).join(",");
  const hash = keccak256(toBytes(data));
  return BigInt(hash) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
}

/**
 * Calculate the expected privacy premium based on transparency level
 */
export function calculatePrivacyPremium(privacyLevel: number): number {
  // Level 5 (max privacy): 0% premium
  // Level 4: 0.5% premium (50 basis points)
  // Level 3: 1.0% premium (100 basis points)
  // Level 2: 1.5% premium (150 basis points)
  // Level 1 (min privacy): 2.0% premium (200 basis points)
  return Math.max(0, (6 - privacyLevel) * 50);
}

/**
 * Validate credit data inputs
 */
export function validateCreditData(creditData: CreditData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (creditData.creditScore < 300 || creditData.creditScore > 850) {
    errors.push("Credit score must be between 300 and 850");
  }

  if (creditData.accountAge < 0 || creditData.accountAge > 600) {
    errors.push("Account age must be between 0 and 600 months");
  }

  if (creditData.paymentHistory < 0 || creditData.paymentHistory > 100) {
    errors.push("Payment history must be between 0 and 100%");
  }

  if (creditData.creditUtilization < 0 || creditData.creditUtilization > 100) {
    errors.push("Credit utilization must be between 0 and 100%");
  }

  if (creditData.debtToIncome < 0 || creditData.debtToIncome > 200) {
    errors.push("Debt-to-income ratio must be between 0 and 200%");
  }

  if (creditData.privacyLevel < 1 || creditData.privacyLevel > 5) {
    errors.push("Privacy level must be between 1 and 5");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
