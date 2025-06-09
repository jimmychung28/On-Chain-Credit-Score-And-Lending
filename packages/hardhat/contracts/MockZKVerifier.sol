// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockZKVerifier
 * @dev Mock ZK proof verifier for testing purposes
 * In production, this would be replaced with actual ZK verification logic
 */
contract MockZKVerifier {
    
    mapping(bytes32 => bool) public verifiedProofs;
    uint256 public totalVerifications;
    
    event ProofVerified(bytes32 indexed proofHash, bool isValid);
    
    /**
     * @dev Verify a ZK proof (mock implementation)
     * @param proof The ZK proof bytes
     * @param publicSignals The public signals [score, timestamp, userHash]
     * @return bool True if proof is valid
     */
    function verifyProof(
        bytes calldata proof,
        uint256[3] calldata publicSignals
    ) external returns (bool) {
        // Mock verification logic
        // In production, this would contain actual ZK verification
        
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicSignals));
        
        // Simple validation checks
        bool isValid = proof.length > 0 && 
                      publicSignals[0] >= 300 && 
                      publicSignals[0] <= 850 &&
                      publicSignals[1] <= block.timestamp;
        
        verifiedProofs[proofHash] = isValid;
        totalVerifications++;
        
        emit ProofVerified(proofHash, isValid);
        
        return isValid;
    }
    
    /**
     * @dev Check if a proof has been verified
     */
    function isProofVerified(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }
    
    /**
     * @dev Get total number of verifications performed
     */
    function getTotalVerifications() external view returns (uint256) {
        return totalVerifications;
    }
} 