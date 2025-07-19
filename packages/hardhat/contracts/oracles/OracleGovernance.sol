// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IOracleSecurityManager.sol";

/**
 * @title OracleGovernance
 * @dev Time-locked governance system for oracle management with multi-signature requirements
 */
contract OracleGovernance is AccessControl, ReentrancyGuard {
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant TIMELOCK_ADMIN_ROLE = keccak256("TIMELOCK_ADMIN_ROLE");

    // Timelock configuration
    uint256 public constant MIN_DELAY = 24 hours;  // Minimum 24 hours for critical changes
    uint256 public constant MAX_DELAY = 7 days;    // Maximum 7 days
    uint256 public constant GRACE_PERIOD = 14 days; // 14 days to execute after delay

    // Proposal types
    enum ProposalType {
        ADD_ORACLE,
        REMOVE_ORACLE,
        UPDATE_ORACLE_WEIGHT,
        UPDATE_SECURITY_PARAMS,
        UPDATE_SECURITY_MANAGER,
        EMERGENCY_ACTION
    }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        bytes data; // Encoded function call data
        uint256 createdAt;
        uint256 executeAfter; // Timestamp when proposal can be executed
        uint256 expiresAt; // Timestamp when proposal expires
        bool executed;
        bool cancelled;
        uint256 approvalCount;
        mapping(address => bool) approvals;
        string description;
    }

    // State variables
    IOracleSecurityManager public securityManager;
    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId = 1;
    uint256 public proposalDelay = MIN_DELAY;
    uint256 public requiredApprovals = 2; // Minimum approvals required

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        address indexed proposer,
        string description,
        uint256 executeAfter,
        uint256 expiresAt
    );
    event ProposalApproved(uint256 indexed proposalId, address indexed approver);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event ProposalCancelled(uint256 indexed proposalId, address indexed canceller, string reason);
    event SecurityManagerUpdated(address oldManager, address newManager);
    event ProposalDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event RequiredApprovalsUpdated(uint256 oldCount, uint256 newCount);
    event EmergencyActionExecuted(address indexed executor, string action);

    constructor(address _securityManager, address _admin) {
        require(_securityManager != address(0), "Invalid security manager");
        require(_admin != address(0), "Invalid admin");

        securityManager = IOracleSecurityManager(_securityManager);

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ORACLE_ADMIN_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(TIMELOCK_ADMIN_ROLE, _admin);
    }

    /**
     * @dev Create a new governance proposal
     */
    function createProposal(
        ProposalType _type,
        bytes calldata _data,
        string calldata _description
    ) external onlyRole(ORACLE_ADMIN_ROLE) returns (uint256) {
        uint256 proposalId = nextProposalId++;
        
        uint256 delay = _type == ProposalType.EMERGENCY_ACTION ? 0 : proposalDelay;
        uint256 executeAfter = block.timestamp + delay;
        uint256 expiresAt = executeAfter + GRACE_PERIOD;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposalType = _type;
        proposal.proposer = msg.sender;
        proposal.data = _data;
        proposal.createdAt = block.timestamp;
        proposal.executeAfter = executeAfter;
        proposal.expiresAt = expiresAt;
        proposal.description = _description;

        // Emergency actions are auto-approved
        if (_type == ProposalType.EMERGENCY_ACTION) {
            proposal.approvals[msg.sender] = true;
            proposal.approvalCount = requiredApprovals;
        } else {
            proposal.approvals[msg.sender] = true;
            proposal.approvalCount = 1;
        }

        emit ProposalCreated(
            proposalId,
            _type,
            msg.sender,
            _description,
            executeAfter,
            expiresAt
        );

        return proposalId;
    }

    /**
     * @dev Approve a proposal
     */
    function approveProposal(uint256 _proposalId) external onlyRole(ORACLE_ADMIN_ROLE) {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.id != 0, "Proposal does not exist");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(block.timestamp < proposal.expiresAt, "Proposal expired");
        require(!proposal.approvals[msg.sender], "Already approved");

        proposal.approvals[msg.sender] = true;
        proposal.approvalCount++;

        emit ProposalApproved(_proposalId, msg.sender);
    }

    /**
     * @dev Execute a proposal after timelock
     */
    function executeProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.id != 0, "Proposal does not exist");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal cancelled");
        require(block.timestamp >= proposal.executeAfter, "Timelock not elapsed");
        require(block.timestamp < proposal.expiresAt, "Proposal expired");
        require(proposal.approvalCount >= requiredApprovals, "Insufficient approvals");

        proposal.executed = true;

        // Execute based on proposal type
        if (proposal.proposalType == ProposalType.ADD_ORACLE) {
            _executeAddOracle(proposal.data);
        } else if (proposal.proposalType == ProposalType.REMOVE_ORACLE) {
            _executeRemoveOracle(proposal.data);
        } else if (proposal.proposalType == ProposalType.UPDATE_ORACLE_WEIGHT) {
            _executeUpdateOracleWeight(proposal.data);
        } else if (proposal.proposalType == ProposalType.UPDATE_SECURITY_PARAMS) {
            _executeUpdateSecurityParams(proposal.data);
        } else if (proposal.proposalType == ProposalType.UPDATE_SECURITY_MANAGER) {
            _executeUpdateSecurityManager(proposal.data);
        } else if (proposal.proposalType == ProposalType.EMERGENCY_ACTION) {
            _executeEmergencyAction(proposal.data);
        }

        emit ProposalExecuted(_proposalId, msg.sender);
    }

    /**
     * @dev Cancel a proposal
     */
    function cancelProposal(uint256 _proposalId, string calldata _reason) 
        external 
        onlyRole(TIMELOCK_ADMIN_ROLE) 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.id != 0, "Proposal does not exist");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.cancelled, "Proposal already cancelled");

        proposal.cancelled = true;

        emit ProposalCancelled(_proposalId, msg.sender, _reason);
    }

    /**
     * @dev Emergency execution bypass (only for EMERGENCY_ROLE)
     */
    function emergencyExecute(bytes calldata _data, string calldata _action) 
        external 
        onlyRole(EMERGENCY_ROLE) 
    {
        _executeEmergencyAction(_data);
        emit EmergencyActionExecuted(msg.sender, _action);
    }

    /**
     * @dev Update proposal delay
     */
    function updateProposalDelay(uint256 _newDelay) external onlyRole(TIMELOCK_ADMIN_ROLE) {
        require(_newDelay >= MIN_DELAY && _newDelay <= MAX_DELAY, "Invalid delay");
        uint256 oldDelay = proposalDelay;
        proposalDelay = _newDelay;
        emit ProposalDelayUpdated(oldDelay, _newDelay);
    }

    /**
     * @dev Update required approvals
     */
    function updateRequiredApprovals(uint256 _newCount) external onlyRole(TIMELOCK_ADMIN_ROLE) {
        require(_newCount > 0 && _newCount <= 10, "Invalid approval count");
        uint256 oldCount = requiredApprovals;
        requiredApprovals = _newCount;
        emit RequiredApprovalsUpdated(oldCount, _newCount);
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        ProposalType proposalType,
        address proposer,
        bytes memory data,
        uint256 createdAt,
        uint256 executeAfter,
        uint256 expiresAt,
        bool executed,
        bool cancelled,
        uint256 approvalCount,
        string memory description
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposalType,
            proposal.proposer,
            proposal.data,
            proposal.createdAt,
            proposal.executeAfter,
            proposal.expiresAt,
            proposal.executed,
            proposal.cancelled,
            proposal.approvalCount,
            proposal.description
        );
    }

    /**
     * @dev Check if address has approved a proposal
     */
    function hasApproved(uint256 _proposalId, address _approver) external view returns (bool) {
        return proposals[_proposalId].approvals[_approver];
    }

    /**
     * @dev Get proposal status
     */
    function getProposalStatus(uint256 _proposalId) external view returns (string memory) {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.id == 0) return "Does not exist";
        if (proposal.cancelled) return "Cancelled";
        if (proposal.executed) return "Executed";
        if (block.timestamp >= proposal.expiresAt) return "Expired";
        if (proposal.approvalCount < requiredApprovals) return "Pending approvals";
        if (block.timestamp < proposal.executeAfter) return "Timelock active";
        return "Ready for execution";
    }

    // ==================== INTERNAL EXECUTION FUNCTIONS ====================

    function _executeAddOracle(bytes memory _data) internal {
        (address oracle, uint256 weight, uint256 maxDeviationBps) = abi.decode(_data, (address, uint256, uint256));
        securityManager.addOracle(oracle, weight, maxDeviationBps);
    }

    function _executeRemoveOracle(bytes memory _data) internal {
        address oracle = abi.decode(_data, (address));
        securityManager.removeOracle(oracle);
    }

    function _executeUpdateOracleWeight(bytes memory _data) internal {
        (address oracle, uint256 newWeight) = abi.decode(_data, (address, uint256));
        securityManager.updateOracleWeight(oracle, newWeight);
    }

    function _executeUpdateSecurityParams(bytes memory _data) internal {
        IOracleSecurityManager.SecurityParameters memory params = abi.decode(_data, (IOracleSecurityManager.SecurityParameters));
        securityManager.updateSecurityParameters(params);
    }

    function _executeUpdateSecurityManager(bytes memory _data) internal {
        address newManager = abi.decode(_data, (address));
        address oldManager = address(securityManager);
        securityManager = IOracleSecurityManager(newManager);
        emit SecurityManagerUpdated(oldManager, newManager);
    }

    function _executeEmergencyAction(bytes memory _data) internal {
        // Decode the emergency action type and execute accordingly
        (string memory action, bytes memory actionData) = abi.decode(_data, (string, bytes));
        
        if (keccak256(bytes(action)) == keccak256("TRIGGER_CIRCUIT_BREAKER")) {
            string memory reason = abi.decode(actionData, (string));
            securityManager.triggerCircuitBreaker(reason);
        } else if (keccak256(bytes(action)) == keccak256("RESET_CIRCUIT_BREAKER")) {
            securityManager.resetCircuitBreaker();
        } else if (keccak256(bytes(action)) == keccak256("EMERGENCY_PAUSE")) {
            securityManager.emergencyPause();
        } else if (keccak256(bytes(action)) == keccak256("EMERGENCY_UNPAUSE")) {
            securityManager.emergencyUnpause();
        }
    }

    // ==================== HELPER FUNCTIONS ====================

    /**
     * @dev Create proposal to add oracle
     */
    function proposeAddOracle(
        address _oracle,
        uint256 _weight,
        uint256 _maxDeviationBps,
        string calldata _description
    ) external returns (uint256) {
        bytes memory data = abi.encode(_oracle, _weight, _maxDeviationBps);
        return createProposal(ProposalType.ADD_ORACLE, data, _description);
    }

    /**
     * @dev Create proposal to remove oracle
     */
    function proposeRemoveOracle(address _oracle, string calldata _description) 
        external 
        returns (uint256) 
    {
        bytes memory data = abi.encode(_oracle);
        return createProposal(ProposalType.REMOVE_ORACLE, data, _description);
    }

    /**
     * @dev Create proposal to update oracle weight
     */
    function proposeUpdateOracleWeight(
        address _oracle,
        uint256 _newWeight,
        string calldata _description
    ) external returns (uint256) {
        bytes memory data = abi.encode(_oracle, _newWeight);
        return createProposal(ProposalType.UPDATE_ORACLE_WEIGHT, data, _description);
    }

    /**
     * @dev Create proposal to update security parameters
     */
    function proposeUpdateSecurityParams(
        IOracleSecurityManager.SecurityParameters calldata _params,
        string calldata _description
    ) external returns (uint256) {
        bytes memory data = abi.encode(_params);
        return createProposal(ProposalType.UPDATE_SECURITY_PARAMS, data, _description);
    }

    /**
     * @dev Create emergency proposal
     */
    function proposeEmergencyAction(
        string calldata _action,
        bytes calldata _actionData,
        string calldata _description
    ) external onlyRole(EMERGENCY_ROLE) returns (uint256) {
        bytes memory data = abi.encode(_action, _actionData);
        return createProposal(ProposalType.EMERGENCY_ACTION, data, _description);
    }
}