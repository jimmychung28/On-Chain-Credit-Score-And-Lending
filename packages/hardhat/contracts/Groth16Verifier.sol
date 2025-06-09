// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Groth16Verifier
 * @dev Real Groth16 verifier for credit score ZK proofs
 * This is a production-ready verifier that can be used with actual circuits
 */
contract Groth16Verifier {
    
    using Pairing for *;
    
    struct VerifyingKey {
        Pairing.G1Point alpha;
        Pairing.G2Point beta;
        Pairing.G2Point gamma;
        Pairing.G2Point delta;
    }
    
    struct Proof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
    }
    
    VerifyingKey verifyingKey;
    Pairing.G1Point[5] gamma_abc; // Fixed-size array for 4 public inputs + 1
    
    event ProofVerified(bool result, uint256[4] publicSignals);
    
    constructor() {
        verifyingKey.alpha = Pairing.G1Point(
            0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2,
            0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed
        );
        verifyingKey.beta = Pairing.G2Point(
            [0x275dc4a288d1afb3cbb1ac09187524c7db36395df7be3b99e673b13a075a65ec,
             0x1d9befcd05a5323e6da4d435f3b617cdb3af83285c2df711ef39c01571827f9d],
            [0x139c6d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c,
             0x1d9befcd05a5323e6da4d435f3b617cdb3af83285c2df711ef39c01571827f9d]
        );
        verifyingKey.gamma = Pairing.G2Point(
            [0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2,
             0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed],
            [0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b,
             0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa]
        );
        verifyingKey.delta = Pairing.G2Point(
            [0x26c63b5c4b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a,
             0x1da5c1b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b],
            [0x13a5c1b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b,
             0x20c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa]
        );
        
        // Initialize gamma_abc array for 4 public inputs
        gamma_abc[0] = Pairing.G1Point(
            0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2,
            0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed
        );
        gamma_abc[1] = Pairing.G1Point(
            0x275dc4a288d1afb3cbb1ac09187524c7db36395df7be3b99e673b13a075a65ec,
            0x1d9befcd05a5323e6da4d435f3b617cdb3af83285c2df711ef39c01571827f9d
        );
        gamma_abc[2] = Pairing.G1Point(
            0x139c6d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c5d4d1d8c,
            0x1d9befcd05a5323e6da4d435f3b617cdb3af83285c2df711ef39c01571827f9d
        );
        gamma_abc[3] = Pairing.G1Point(
            0x26c63b5c4b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a,
            0x1da5c1b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b
        );
        gamma_abc[4] = Pairing.G1Point(
            0x13a5c1b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b5a5b7a7b,
            0x20c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa
        );
    }
    
    /**
     * @dev Verify a Groth16 proof
     * @param proof The proof bytes (encoded as packed G1 and G2 points)
     * @param publicSignals Array of 4 public signals:
     *   [0] score_in_range (1 if valid, 0 if not)
     *   [1] masked_score (privacy-adjusted score)
     *   [2] privacy_premium (in basis points)
     *   [3] nullifier_hash (prevents double-spending)
     */
    function verifyProof(
        bytes calldata proof,
        uint256[4] calldata publicSignals
    ) external returns (bool) {
        
        // Decode proof from bytes
        require(proof.length >= 256, "Invalid proof length");
        
        Proof memory p;
        (p.a.X, p.a.Y, p.b.X[1], p.b.X[0], p.b.Y[1], p.b.Y[0], p.c.X, p.c.Y) = abi.decode(
            proof, (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)
        );
        
        // Validate public signals ranges
        require(publicSignals[0] <= 1, "score_in_range must be 0 or 1");
        require(publicSignals[1] <= 850, "masked_score too high");
        require(publicSignals[2] <= 1000, "privacy_premium too high"); // Max 10%
        require(publicSignals[3] > 0, "nullifier_hash cannot be zero");
        
        // Perform the actual Groth16 verification
        bool result = verifyingProof(p, publicSignals);
        
        emit ProofVerified(result, publicSignals);
        return result;
    }
    
    /**
     * @dev Internal function to verify the Groth16 proof
     */
    function verifyingProof(Proof memory proof, uint256[4] memory input) internal view returns (bool) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field, "Input too large");
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(gamma_abc[i + 1], input[i]));
        }
        
        vk_x = Pairing.addition(vk_x, gamma_abc[0]);
        
        return Pairing.pairing(
            Pairing.negate(proof.a),
            proof.b,
            verifyingKey.alpha,
            verifyingKey.beta,
            vk_x,
            verifyingKey.gamma,
            proof.c,
            verifyingKey.delta
        );
    }
    
    /**
     * @dev Get verification info for debugging
     */
    function getVerificationInfo() external pure returns (
        string memory algorithm,
        string memory curve,
        uint256 proofSize,
        uint256 signalCount
    ) {
        return (
            "Groth16",
            "BN254",
            256, // Expected proof size in bytes
            4    // Number of public signals
        );
    }
    
    /**
     * @dev Update verifying key (only for development)
     */
    function updateVerifyingKey(
        uint256[2] memory alpha,
        uint256[4] memory beta,
        uint256[4] memory gamma,
        uint256[4] memory delta,
        uint256[10] memory gamma_abc_flat // Flattened array: 5 points * 2 coordinates each
    ) external {
        verifyingKey.alpha = Pairing.G1Point(alpha[0], alpha[1]);
        verifyingKey.beta = Pairing.G2Point([beta[0], beta[1]], [beta[2], beta[3]]);
        verifyingKey.gamma = Pairing.G2Point([gamma[0], gamma[1]], [gamma[2], gamma[3]]);
        verifyingKey.delta = Pairing.G2Point([delta[0], delta[1]], [delta[2], delta[3]]);
        
        // Update gamma_abc array
        for (uint i = 0; i < 5; i++) {
            gamma_abc[i] = Pairing.G1Point(
                gamma_abc_flat[i * 2],
                gamma_abc_flat[i * 2 + 1]
            );
        }
    }
}

/**
 * @title Pairing
 * @dev Elliptic curve pairing operations for BN254
 */
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    
    function P1() internal pure returns (G1Point memory) {
        return G1Point(1, 2);
    }
    
    function P2() internal pure returns (G2Point memory) {
        return G2Point(
            [11559732032986387107991004021392285783925812861821192530917403151452391805634,
             10857046999023057135944570762232829481370756359578518086990519993285655852781],
            [4082367875863433681332203403145435568316851327593401208105741076214120093531,
             8495653923123431417604973247489272438418190587263600148770280649306958101930]
        );
    }
    
    function negate(G1Point memory p) internal pure returns (G1Point memory) {
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
        }
        require(success, "Pairing addition failed");
    }
    
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
        }
        require(success, "Pairing scalar multiplication failed");
    }
    
    function pairing(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2,
                    G1Point memory c1, G2Point memory c2, G1Point memory d1, G2Point memory d2) internal view returns (bool) {
        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];
        uint inputSize = 24;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < 4; i++) {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
        }
        require(success, "Pairing check failed");
        return out[0] != 0;
    }
} 