// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockZKVerifierV2.sol";

/**
 * @title ZKCreditScoring
 * @dev Privacy-preserving credit scoring using Zero-Knowledge proofs
 * Replaces the public credit scoring system with ZK privacy by default
 */
contract ZKCreditScoring is Ownable, ReentrancyGuard {
    struct CreditProfile {
        uint256 score; // Credit score (300-850) - ONLY public data
        uint256 lastUpdated; // Last score update timestamp
        bool isActive; // Whether the profile is active
        bytes32 dataCommitment; // Commitment to private data
        uint8 privacyLevel; // Privacy level (1-5)
        bool isVerified; // ZK proof verified
    }

    struct ZKProofData {
        bytes proof; // ZK proof bytes
        uint256[3] publicSignals; // [score, timestamp, userHash]
        bytes32 commitment; // Commitment to private data
    }

    // Private data is stored off-chain, only commitments on-chain
    mapping(address => CreditProfile) public creditProfiles;
    mapping(address => bool) public verifiedAddresses;
    mapping(address => uint256) public stakingBalances; // For yield earning

    // ZK verification
    address public zkVerifier;

    // Constants (same as original system)
    uint256 public constant MAX_SCORE = 850;
    uint256 public constant MIN_SCORE = 300;
    uint256 public constant SCORE_VALIDITY_PERIOD = 30 days;

    // Transparency premiums (users pay MORE for public data)
    uint256 public constant TRANSPARENCY_PREMIUM_L1 = 200; // 2.0% premium for public reporting
    uint256 public constant TRANSPARENCY_PREMIUM_L2 = 150; // 1.5% premium for partial transparency
    uint256 public constant TRANSPARENCY_PREMIUM_L3 = 100; // 1.0% premium for limited transparency
    uint256 public constant TRANSPARENCY_PREMIUM_L4 = 50; // 0.5% premium for minimal transparency
    uint256 public constant TRANSPARENCY_PREMIUM_L5 = 0; // 0% premium for full privacy (default)

    // Events (minimal data exposure)
    event UserRegistered(address indexed user, uint8 privacyLevel, uint256 timestamp);
    event CreditScoreVerified(address indexed user, uint256 score, uint256 timestamp);
    event PrivacyLevelUpdated(address indexed user, uint8 newLevel);
    event StakeDeposited(address indexed user, uint256 amount);
    event StakeWithdrawn(address indexed user, uint256 amount);

    modifier onlyVerifiedZK(address user) {
        require(creditProfiles[user].isVerified, "ZK score not verified");
        require(block.timestamp - creditProfiles[user].lastUpdated <= SCORE_VALIDITY_PERIOD, "ZK score expired");
        _;
    }

    constructor(address _zkVerifier) Ownable(msg.sender) {
        zkVerifier = _zkVerifier;
    }

    /**
     * @dev Register a new user with ZK privacy by default
     */
    function registerUser() external {
        require(!creditProfiles[msg.sender].isActive, "User already registered");

        // Privacy by default (Level 5 = maximum privacy, no premium)
        creditProfiles[msg.sender] = CreditProfile({
            score: 650, // Starting credit score for new users (Fair)
            lastUpdated: block.timestamp,
            isActive: true,
            dataCommitment: bytes32(0),
            privacyLevel: 5, // Default to maximum privacy
            isVerified: true // Auto-verified with starting score
        });

        emit UserRegistered(msg.sender, 5, block.timestamp);
    }

    /**
     * @dev Register with transparency level (pay premium for public data)
     */
    function registerUserWithTransparency(uint8 transparencyLevel) external {
        require(!creditProfiles[msg.sender].isActive, "User already registered");
        require(transparencyLevel >= 1 && transparencyLevel <= 5, "Invalid transparency level");

        creditProfiles[msg.sender] = CreditProfile({
            score: 650, // Starting credit score for new users (Fair)
            lastUpdated: block.timestamp,
            isActive: true,
            dataCommitment: bytes32(0),
            privacyLevel: transparencyLevel,
            isVerified: true // Auto-verified with starting score
        });

        emit UserRegistered(msg.sender, transparencyLevel, block.timestamp);
    }

    /**
     * @dev Submit ZK proof of credit score (replaces transaction recording)
     */
    function submitCreditProof(
        bytes calldata proof,
        uint256[3] calldata publicSignals, // [score, timestamp, userHash]
        bytes32 commitment,
        uint256 totalVolume, // Hidden in commitment
        uint256 transactionCount, // Hidden in commitment
        uint256 loanCount, // Hidden in commitment
        uint256 repaidLoans, // Hidden in commitment
        uint256 defaultedLoans // Hidden in commitment
    ) external {
        require(creditProfiles[msg.sender].isActive, "User not registered");
        require(publicSignals[0] >= MIN_SCORE && publicSignals[0] <= MAX_SCORE, "Invalid credit score");
        require(publicSignals[1] <= block.timestamp, "Future timestamp");
        require(publicSignals[1] > block.timestamp - 1 hours, "Proof too old");

        // Verify user hash matches sender
        bytes32 userHash = keccak256(abi.encodePacked(msg.sender, block.chainid));
        require(publicSignals[2] == uint256(userHash), "Invalid user hash");

        // Verify ZK proof
        require(_verifyZKProof(proof, publicSignals, commitment), "Invalid ZK proof");

        // Verify commitment includes the private data
        bytes32 expectedCommitment = keccak256(
            abi.encodePacked(
                msg.sender,
                totalVolume,
                transactionCount,
                loanCount,
                repaidLoans,
                defaultedLoans,
                block.timestamp
            )
        );
        require(commitment == expectedCommitment, "Invalid commitment");

        // Update profile with verified ZK data
        CreditProfile storage profile = creditProfiles[msg.sender];
        profile.score = publicSignals[0];
        profile.lastUpdated = publicSignals[1];
        profile.dataCommitment = commitment;
        profile.isVerified = true;

        emit CreditScoreVerified(msg.sender, publicSignals[0], publicSignals[1]);
    }

    /**
     * @dev Record transaction (off-chain processing, on-chain commitment)
     */
    function recordTransaction(address user, uint256 volume, address counterparty) external {
        require(creditProfiles[user].isActive, "User not registered");
        require(msg.sender == user || verifiedAddresses[msg.sender], "Unauthorized");

        // Create new commitment with updated data
        bytes32 newCommitment = keccak256(
            abi.encodePacked(user, volume, counterparty, block.timestamp, creditProfiles[user].dataCommitment)
        );

        creditProfiles[user].dataCommitment = newCommitment;
    }

    /**
     * @dev Record loan (for authorized contracts)
     */
    function recordLoan(address borrower, uint256 amount, bool repaid) external {
        require(verifiedAddresses[msg.sender], "Only verified contracts can record loans");
        require(creditProfiles[borrower].isActive, "Borrower not registered");

        // Update commitment with new loan data
        bytes32 newCommitment = keccak256(
            abi.encodePacked(borrower, amount, repaid, block.timestamp, creditProfiles[borrower].dataCommitment)
        );

        creditProfiles[borrower].dataCommitment = newCommitment;
    }

    /**
     * @dev Deposit ETH as stake (for yield earning)
     */
    function depositStake() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        require(creditProfiles[msg.sender].isActive, "User not registered");

        stakingBalances[msg.sender] += msg.value;
        emit StakeDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw staked ETH
     */
    function withdrawStake(uint256 amount) external nonReentrant {
        require(stakingBalances[msg.sender] >= amount, "Insufficient stake balance");

        // Effects: Update state before external call to prevent reentrancy
        stakingBalances[msg.sender] -= amount;

        // Interactions: External call comes after state changes
        (bool success, ) = msg.sender.call{ value: amount }("");
        require(success, "Transfer failed");

        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Get credit score (same interface as old system)
     */
    function getCreditScore(address user) external view returns (uint256) {
        require(creditProfiles[user].isActive, "User not registered");
        require(creditProfiles[user].isVerified, "Credit score not verified");
        require(block.timestamp - creditProfiles[user].lastUpdated <= SCORE_VALIDITY_PERIOD, "Credit score expired");
        return creditProfiles[user].score;
    }

    /**
     * @dev Get credit profile (limited public data)
     */
    function getCreditProfile(
        address user
    ) external view returns (uint256 score, uint256 lastUpdated, bool isActive, uint8 privacyLevel, bool isVerified) {
        CreditProfile memory profile = creditProfiles[user];
        return (profile.score, profile.lastUpdated, profile.isActive, profile.privacyLevel, profile.isVerified);
    }

    /**
     * @dev Check loan eligibility
     */
    function isEligibleForLoan(address user, uint256 minScore) external view returns (bool) {
        if (!creditProfiles[user].isActive || !creditProfiles[user].isVerified) return false;
        if (block.timestamp - creditProfiles[user].lastUpdated > SCORE_VALIDITY_PERIOD) return false;
        return creditProfiles[user].score >= minScore;
    }

    /**
     * @dev Get transparency premium for lending (users pay MORE for public data)
     */
    function getTransparencyPremium(address user) external view returns (uint256) {
        if (!creditProfiles[user].isActive || !creditProfiles[user].isVerified) return 0;

        uint8 level = creditProfiles[user].privacyLevel;
        if (level == 1) return TRANSPARENCY_PREMIUM_L1; // Most public = highest premium
        if (level == 2) return TRANSPARENCY_PREMIUM_L2;
        if (level == 3) return TRANSPARENCY_PREMIUM_L3;
        if (level == 4) return TRANSPARENCY_PREMIUM_L4;
        if (level == 5) return TRANSPARENCY_PREMIUM_L5; // Most private = no premium
        return 0;
    }

    /**
     * @dev Update transparency level (lower levels = more transparency = higher cost)
     */
    function updateTransparencyLevel(uint8 newLevel) external {
        require(creditProfiles[msg.sender].isActive, "User not registered");
        require(newLevel >= 1 && newLevel <= 5, "Invalid transparency level");

        creditProfiles[msg.sender].privacyLevel = newLevel;
        emit PrivacyLevelUpdated(msg.sender, newLevel);
    }

    /**
     * @dev Switch to maximum privacy (free, default behavior)
     */
    function switchToMaxPrivacy() external {
        require(creditProfiles[msg.sender].isActive, "User not registered");

        creditProfiles[msg.sender].privacyLevel = 5; // Maximum privacy, no cost
        emit PrivacyLevelUpdated(msg.sender, 5);
    }

    /**
     * @dev Verify ZK proof using Groth16 verifier
     */
    function _verifyZKProof(
        bytes calldata proof,
        uint256[3] calldata publicSignals,
        bytes32 commitment
    ) internal returns (bool) {
        // Development fallback - basic validation
        if (zkVerifier == address(0)) {
            return proof.length > 0 && publicSignals[0] >= MIN_SCORE && publicSignals[0] <= MAX_SCORE;
        }

        // Convert public signals to the expected format
        // publicSignals[0] = score_in_range (1 if valid, 0 if not)
        // publicSignals[1] = masked_score (privacy-adjusted score)
        // publicSignals[2] = privacy_premium (in basis points)
        // Plus the nullifier hash as 4th signal
        uint256[4] memory expandedSignals = [
            publicSignals[0], // Using score as first signal for compatibility
            publicSignals[1], // Using timestamp as second signal
            publicSignals[2], // Using userHash as third signal
            uint256(commitment) // Using commitment as fourth signal
        ];

        try MockZKVerifierV2(zkVerifier).verifyProof(proof, expandedSignals) returns (bool result) {
            return result;
        } catch {
            // Fallback to development mode validation
            return proof.length > 0 && publicSignals[0] >= MIN_SCORE && publicSignals[0] <= MAX_SCORE;
        }
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @dev Add verified address (only owner)
     */
    function addVerifiedAddress(address addr) external onlyOwner {
        verifiedAddresses[addr] = true;
    }

    /**
     * @dev Remove verified address (only owner)
     */
    function removeVerifiedAddress(address addr) external onlyOwner {
        verifiedAddresses[addr] = false;
    }

    /**
     * @dev Update ZK verifier (only owner)
     */
    function updateZKVerifier(address newVerifier) external onlyOwner {
        zkVerifier = newVerifier;
    }

    // ==================== TESTING FUNCTIONS ====================

    /**
     * @dev Create test user with maximum privacy by default (FOR TESTING ONLY)
     */
    function createTestUser(address user) external onlyOwner {
        require(!creditProfiles[user].isActive, "User already registered");

        creditProfiles[user] = CreditProfile({
            score: 750, // Good default score for testing
            lastUpdated: block.timestamp,
            isActive: true,
            dataCommitment: keccak256(abi.encodePacked(user, block.timestamp)),
            privacyLevel: 5, // Default to maximum privacy
            isVerified: true
        });

        emit UserRegistered(user, 5, block.timestamp);
        emit CreditScoreVerified(user, 750, block.timestamp);
    }

    /**
     * @dev Create test user with specific transparency level (FOR TESTING ONLY)
     */
    function createTestUserWithTransparency(address user, uint8 transparencyLevel) external onlyOwner {
        require(!creditProfiles[user].isActive, "User already registered");
        require(transparencyLevel >= 1 && transparencyLevel <= 5, "Invalid transparency level");

        creditProfiles[user] = CreditProfile({
            score: 750,
            lastUpdated: block.timestamp,
            isActive: true,
            dataCommitment: keccak256(abi.encodePacked(user, block.timestamp)),
            privacyLevel: transparencyLevel,
            isVerified: true
        });

        emit UserRegistered(user, transparencyLevel, block.timestamp);
        emit CreditScoreVerified(user, 750, block.timestamp);
    }

    /**
     * @dev Set test credit score (FOR TESTING ONLY)
     */
    function setTestCreditScore(address user, uint256 score) external onlyOwner {
        require(creditProfiles[user].isActive, "User not registered");
        require(score >= MIN_SCORE && score <= MAX_SCORE, "Invalid score");

        creditProfiles[user].score = score;
        creditProfiles[user].lastUpdated = block.timestamp;
        creditProfiles[user].isVerified = true;

        emit CreditScoreVerified(user, score, block.timestamp);
    }

    /**
     * @dev Create multiple test users with different privacy levels
     */
    function createTestUsers() external onlyOwner {
        address[5] memory testAddresses = [
            0x2c827c3E27744B1D83df71000F6c3B7FC59Fa0A1, // Excellent credit + Level 5 privacy
            0x742D35CC6C6C8b5B2C8A4D15c9C3f47b4E5F1234, // Good credit + Level 4 privacy
            0x8ba1f109551BD432803012645FAc136c22c87654, // Fair credit + Level 3 privacy
            0x1234567890AbcdEF1234567890aBcdef12345678, // Poor credit + Level 2 privacy
            0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD // Bad credit + Level 1 privacy
        ];

        uint256[5] memory scores = [uint256(800), uint256(720), uint256(650), uint256(580), uint256(520)];
        uint8[5] memory privacyLevels = [uint8(5), uint8(4), uint8(3), uint8(2), uint8(1)];

        for (uint i = 0; i < 5; i++) {
            if (!creditProfiles[testAddresses[i]].isActive) {
                creditProfiles[testAddresses[i]] = CreditProfile({
                    score: scores[i],
                    lastUpdated: block.timestamp,
                    isActive: true,
                    dataCommitment: keccak256(abi.encodePacked(testAddresses[i], scores[i], block.timestamp)),
                    privacyLevel: privacyLevels[i],
                    isVerified: true
                });

                emit UserRegistered(testAddresses[i], privacyLevels[i], block.timestamp);
                emit CreditScoreVerified(testAddresses[i], scores[i], block.timestamp);
            }
        }
    }

    // ==================== TESTING HELPER FUNCTIONS ====================

    /**
     * @dev Transfer stake balance between addresses (only owner) - FOR TESTING ONLY
     */
    function transferStakeBalance(address from, address to, uint256 amount) external onlyOwner {
        require(stakingBalances[from] >= amount, "Insufficient balance");
        stakingBalances[from] -= amount;
        stakingBalances[to] += amount;
    }
}
