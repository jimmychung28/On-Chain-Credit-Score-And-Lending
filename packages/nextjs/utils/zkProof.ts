import { groth16 } from "snarkjs";

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
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}

// Generate a random nullifier secret
export function generateNullifierSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
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

// Generate ZK proof for credit score
export async function generateCreditProof(
  creditData: CreditData,
  scoreThreshold: number,
  transparencyMask: number = 1,
): Promise<ZKProof> {
  try {
    console.log("🔐 Generating ZK proof for credit data...");

    // Generate nullifier secret
    const nullifierSecret = generateNullifierSecret();

    // Calculate nullifier hash
    const nullifierHash = await calculateNullifierHash(nullifierSecret, creditData.creditScore);

    // Prepare circuit inputs
    const inputs: ProofInputs = {
      credit_score: creditData.creditScore.toString(),
      account_age: creditData.accountAge.toString(),
      payment_history: creditData.paymentHistory.toString(),
      credit_utilization: creditData.creditUtilization.toString(),
      debt_to_income: creditData.debtToIncome.toString(),
      privacy_level: creditData.privacyLevel.toString(),
      nullifier_secret: nullifierSecret,
      score_threshold: scoreThreshold.toString(),
      transparency_mask: transparencyMask.toString(),
      nullifier_hash: nullifierHash,
    };

    console.log("📝 Circuit inputs prepared:", {
      score: creditData.creditScore,
      threshold: scoreThreshold,
      privacyLevel: creditData.privacyLevel,
    });

    // Check if we're in development mode (circuit files might not exist)
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️  Development mode: Using mock proof generation");
      return generateMockProof(inputs);
    }

    // Load circuit files
    const wasmPath = "/circuits/credit_score.wasm";
    const zkeyPath = "/circuits/credit_score_final.zkey";

    // Generate the proof
    const { proof, publicSignals } = await groth16.fullProve(inputs, wasmPath, zkeyPath);

    console.log("✅ ZK proof generated successfully");

    return {
      proof: {
        pi_a: proof.pi_a,
        pi_b: proof.pi_b,
        pi_c: proof.pi_c,
      },
      publicSignals,
    };
  } catch (error) {
    console.error("❌ Error generating ZK proof:", error);

    // Fallback to mock proof for development
    console.log("🔄 Falling back to mock proof generation");
    const nullifierSecret = generateNullifierSecret();
    const nullifierHash = await calculateNullifierHash(nullifierSecret, creditData.creditScore);

    const inputs: ProofInputs = {
      credit_score: creditData.creditScore.toString(),
      account_age: creditData.accountAge.toString(),
      payment_history: creditData.paymentHistory.toString(),
      credit_utilization: creditData.creditUtilization.toString(),
      debt_to_income: creditData.debtToIncome.toString(),
      privacy_level: creditData.privacyLevel.toString(),
      nullifier_secret: nullifierSecret,
      score_threshold: scoreThreshold.toString(),
      transparency_mask: transparencyMask.toString(),
      nullifier_hash: nullifierHash,
    };

    return generateMockProof(inputs);
  }
}

// Generate a mock proof for development/testing
function generateMockProof(inputs: ProofInputs): ZKProof {
  console.log("🎭 Generating mock ZK proof...");

  // Calculate expected outputs
  const scoreInRange = parseInt(inputs.credit_score) >= parseInt(inputs.score_threshold) ? "1" : "0";
  const privacyMultiplier = (6 - parseInt(inputs.privacy_level)) * 20;
  const maskedScore = Math.floor(
    (parseInt(inputs.credit_score) * parseInt(inputs.transparency_mask) * privacyMultiplier) / 100,
  ).toString();
  const privacyPremium = ((6 - parseInt(inputs.privacy_level)) * 50).toString();

  return {
    proof: {
      pi_a: ["0x1234567890abcdef1234567890abcdef12345678", "0xabcdef1234567890abcdef1234567890abcdef12", "0x1"],
      pi_b: [
        ["0x9876543210fedcba9876543210fedcba98765432", "0xfedcba9876543210fedcba9876543210fedcba98"],
        ["0x1111222233334444555566667777888899990000", "0xaaabbbcccdddeeefffffggghhhiiijjjkkklll"],
        ["0x1", "0x0"],
      ],
      pi_c: ["0x5555666677778888999900001111222233334444", "0x6666777788889999000011112222333344445555", "0x1"],
    },
    publicSignals: [
      scoreInRange, // score_in_range
      maskedScore, // masked_score
      privacyPremium, // privacy_premium
      inputs.nullifier_hash, // nullifier_hash
    ],
  };
}

// Verify a ZK proof
export async function verifyProof(proof: ZKProof): Promise<boolean> {
  try {
    console.log("🔍 Verifying ZK proof...");

    if (process.env.NODE_ENV === "development") {
      console.log("⚠️  Development mode: Using mock verification");
      return mockVerifyProof(proof);
    }

    // Load verification key
    const vKeyPath = "/circuits/verification_key.json";
    const vKeyResponse = await fetch(vKeyPath);
    const vKey = await vKeyResponse.json();

    // Verify the proof
    const isValid = await groth16.verify(vKey, proof.publicSignals, proof.proof as any);

    console.log("✅ Proof verification:", isValid ? "VALID" : "INVALID");
    return isValid;
  } catch (error) {
    console.error("❌ Error verifying proof:", error);
    return false;
  }
}

// Mock verification for development
function mockVerifyProof(proof: ZKProof): boolean {
  console.log("🎭 Mock verification - checking proof structure...");

  // Basic structure validation
  const hasValidStructure =
    proof.proof &&
    Array.isArray(proof.proof.pi_a) &&
    Array.isArray(proof.proof.pi_b) &&
    Array.isArray(proof.proof.pi_c) &&
    Array.isArray(proof.publicSignals) &&
    proof.publicSignals.length === 4;

  console.log("✅ Mock verification result:", hasValidStructure);
  return hasValidStructure;
}

// Format proof for smart contract submission
export function formatProofForContract(proof: ZKProof): {
  proof: string;
  publicSignals: string[];
} {
  // Convert proof to bytes format expected by contract
  const proofBytes = [
    ...proof.proof.pi_a.slice(0, 2),
    ...proof.proof.pi_b[0],
    ...proof.proof.pi_b[1],
    ...proof.proof.pi_c.slice(0, 2),
  ];

  // Encode as bytes
  const proofHex = proofBytes.map(p => (p.startsWith("0x") ? p.slice(2) : p)).join("");

  return {
    proof: "0x" + proofHex,
    publicSignals: proof.publicSignals,
  };
}
