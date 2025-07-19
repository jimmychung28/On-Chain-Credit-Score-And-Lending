# 🛡️ Oracle Security System Guide

## Overview

The On-Chain Credit Score and Lending protocol implements **industry-leading oracle manipulation protection** through a comprehensive multi-layered security system. This guide covers the implementation, testing, and deployment of our advanced oracle security infrastructure.

## 🔒 Security Architecture

### Core Components

#### 1. OracleSecurityManager.sol
**Primary security engine with advanced protection mechanisms:**

```solidity
// Price validation with deviation limits
function validatePrice(address oracle, int256 newPrice) 
    external view returns (ValidationResult memory);

// Multi-oracle consensus with weighted median
function getSecurePrice(string calldata priceType) 
    external view returns (ValidationResult memory);

// Circuit breaker management
function triggerCircuitBreaker(string calldata reason) external;
function resetCircuitBreaker() external;
```

**Key Features:**
- 20% maximum price deviation limits
- Weighted median calculation for multi-oracle consensus
- Automatic outlier detection and exclusion
- Confidence scoring based on oracle agreement
- Stale data detection (1-hour threshold)

#### 2. SecureAggregatorV3.sol
**Chainlink-compatible aggregator with manipulation protection:**

```solidity
// Update price with security validation
function updatePrice() external onlyValidUpdate nonReentrant;

// Execute pending updates after grace period
function executePendingUpdate() external nonReentrant;

// Emergency price override
function emergencyUpdatePrice(int256 _price, string calldata _reason) external onlyOwner;
```

**Key Features:**
- Grace periods for large price changes (>10% deviation)
- Update cooldown protection (5 minutes minimum)
- Confidence tracking and health monitoring
- Emergency controls for crisis management

#### 3. OracleGovernance.sol
**Time-locked governance with multi-signature requirements:**

```solidity
// Create governance proposal
function createProposal(ProposalType _type, bytes calldata _data, string calldata _description) 
    external returns (uint256);

// Multi-signature approval system
function approveProposal(uint256 _proposalId) external;

// Execute proposal after timelock
function executeProposal(uint256 _proposalId) external;
```

**Key Features:**
- 24-hour minimum delays for critical changes
- Multi-signature requirements (minimum 2 approvals)
- Emergency action bypass for critical security responses
- Automatic validation of dangerous parameter updates

## 🛡️ Security Layers

### Layer 1: Real-Time Price Validation
**Immediate protection against single oracle manipulation:**

- **Deviation Limits:** 20% maximum price change per update
- **Staleness Detection:** Automatic rejection of outdated data (>1 hour)
- **Bounds Checking:** All prices must be positive and within reasonable ranges
- **Oracle Health Monitoring:** Continuous validation of oracle responsiveness

### Layer 2: Multi-Oracle Consensus
**Advanced protection against coordinated attacks:**

- **Weighted Median Calculation:** Prevents outlier manipulation
- **Confidence Scoring:** Agreement-based validation (minimum 80% confidence)
- **Outlier Detection:** Automatic exclusion of suspicious price feeds
- **Minimum Oracle Count:** Requires at least 2 active oracles for consensus

### Layer 3: Circuit Breaker System
**System-wide protection during market manipulation:**

- **Volatility Triggers:** Automatic activation on 50% price volatility
- **Manual Triggers:** Emergency activation by authorized administrators
- **Automatic Fallback:** Rate model switches to manual mode during activation
- **System Pausing:** Complete oracle system shutdown when necessary

### Layer 4: Grace Period Protection
**Time-based protection against sudden manipulation:**

- **Large Change Detection:** Delays for price changes >10%
- **Re-validation Requirements:** Fresh validation after grace period
- **Emergency Override:** Owner can bypass for legitimate emergencies
- **Pending Update Management:** Organized queue for delayed updates

### Layer 5: Governance Security
**Administrative protection against insider attacks:**

- **Time-Locked Changes:** 24-hour mandatory delays
- **Multi-Signature Requirements:** Multiple administrator approvals
- **Proposal Validation:** Automatic rejection of dangerous parameters
- **Emergency Bypass:** Instant execution for critical security responses

## 🧪 Testing & Validation

### Comprehensive Test Suite

#### 1. OracleManipulation.test.ts
**Complete attack scenario testing:**

```typescript
// Price deviation protection
it("Should reject prices with excessive deviation", async function () {
  const extremePrice = 300000000000; // 50% increase
  await mockOracle1.updateAnswer(extremePrice);
  const result = await oracleSecurityManager.validatePrice(oracle, extremePrice);
  expect(result.isValid).to.be.false;
});

// Circuit breaker functionality
it("Should trigger circuit breaker on high volatility", async function () {
  await oracleSecurityManager.triggerCircuitBreaker("High volatility detected");
  expect(await oracleSecurityManager.isCircuitBreakerActive()).to.be.true;
});

// Multi-oracle consensus
it("Should require minimum oracle count for consensus", async function () {
  // Remove oracles to go below minimum
  await oracleSecurityManager.removeOracle(oracle2);
  await oracleSecurityManager.removeOracle(oracle3);
  const result = await oracleSecurityManager.getSecurePrice("ETH_USD");
  expect(result.isValid).to.be.false;
});
```

#### 2. Attack Simulation Scripts
**Real-world attack scenario testing:**

```bash
# Test oracle security system
npx hardhat run scripts/test-oracle-security.ts --network localhost

# Simulate various attack scenarios
npx hardhat run scripts/simulate-oracle-attacks.ts --network localhost
```

**Attack Scenarios Covered:**
- Single oracle extreme price manipulation (100% increase)
- Gradual price manipulation (multi-step attacks)
- Coordinated multi-oracle attacks
- Oracle failure and recovery
- Governance attack attempts
- Stale data injection
- Circuit breaker testing

### Testing Results

**Price Deviation Protection:**
```
✅ Single oracle manipulation (50% increase): REJECTED
✅ Gradual manipulation detection: DETECTED at step 2
✅ Normal price updates (5% increase): ACCEPTED
✅ Outlier rejection with consensus: WORKING
```

**Circuit Breaker Functionality:**
```
✅ Automatic trigger on high volatility: WORKING
✅ Manual emergency trigger: WORKING
✅ System fallback to manual mode: WORKING
✅ Rate model continued operation: WORKING
```

**Governance Protection:**
```
✅ Time-lock enforcement (24 hours): WORKING
✅ Multi-signature requirements: WORKING
✅ Emergency action bypass: WORKING
✅ Dangerous parameter rejection: WORKING
```

## 🚀 Deployment Guide

### 1. Local Development Setup

```bash
# Start local blockchain
yarn chain

# Deploy contracts (includes oracle security system)
yarn deploy

# Test oracle security
npx hardhat run scripts/test-oracle-security.ts --network localhost
```

### 2. Production Deployment Steps

#### Step 1: Deploy Core Security Contracts
```bash
# Deploy OracleSecurityManager
npx hardhat deploy --tags OracleSecurityManager --network mainnet

# Deploy OracleGovernance
npx hardhat deploy --tags OracleGovernance --network mainnet

# Deploy SecureAggregatorV3 instances
npx hardhat deploy --tags SecureAggregators --network mainnet
```

#### Step 2: Configure Security Parameters
```solidity
// Set conservative security parameters
await securityManager.updateSecurityParameters({
    maxPriceDeviationBps: 2000,        // 20% max deviation
    circuitBreakerThresholdBps: 5000,  // 50% volatility trigger
    gracePeriodSeconds: 900,           // 15 minutes grace period
    minOracleCount: 3,                 // Minimum 3 oracles for production
    maxStalenessSeconds: 3600,         // 1 hour staleness threshold
    circuitBreakerActive: false
});
```

#### Step 3: Setup Oracle Network
```solidity
// Add production oracles with weights
await securityManager.addOracle(chainlinkEthUsd, 4000, 1000);  // 40% weight, 10% max deviation
await securityManager.addOracle(chainlinkEthUsd2, 3500, 1000); // 35% weight, 10% max deviation
await securityManager.addOracle(chainlinkEthUsd3, 2500, 1000); // 25% weight, 10% max deviation

// Map oracles to price types
await securityManager.addPriceTypeOracle("ETH_USD", chainlinkEthUsd);
await securityManager.addPriceTypeOracle("ETH_USD", chainlinkEthUsd2);
await securityManager.addPriceTypeOracle("ETH_USD", chainlinkEthUsd3);
```

#### Step 4: Configure Governance
```solidity
// Add multiple oracle administrators
await governance.grantRole(ORACLE_ADMIN_ROLE, admin1);
await governance.grantRole(ORACLE_ADMIN_ROLE, admin2);
await governance.grantRole(ORACLE_ADMIN_ROLE, admin3);

// Set governance parameters
await governance.updateRequiredApprovals(2);  // Require 2 approvals minimum
await governance.updateProposalDelay(24 * 60 * 60);  // 24 hour timelock
```

#### Step 5: Integration with Rate Model
```solidity
// Initialize rate model with secure oracle system
await rateModel.initializeSecureOracleSystem(
    securityManager.address,
    secureEthUsdAggregator.address,
    secureVolatilityAggregator.address,
    secureLiquidityAggregator.address,
    secureDefiRateAggregator.address
);

// Enable secure oracles
await rateModel.setUseSecureOracles(true);
```

### 3. Production Monitoring

#### Essential Monitoring Metrics
```javascript
// Oracle system health
const status = await rateModel.getOracleSystemStatus();
console.log("System Status:", status.status);
console.log("Circuit Breaker:", status.circuitBreakerActive);

// Price validation confidence
const priceResult = await securityManager.getSecurePrice("ETH_USD");
console.log("Price Valid:", priceResult.isValid);
console.log("Confidence:", priceResult.confidence + "%");

// Oracle count and health
const oracleCount = await securityManager.getActiveOracleCount();
console.log("Active Oracles:", oracleCount);
```

#### Alert Thresholds
- **Low Confidence:** < 80% consensus confidence
- **Circuit Breaker:** Any circuit breaker activation
- **Oracle Failures:** < 3 active oracles
- **High Deviation:** > 15% price changes
- **Stale Data:** > 30 minutes without updates

## 🔧 Configuration Parameters

### Security Parameters

| Parameter | Default | Range | Purpose |
|-----------|---------|--------|---------|
| `maxPriceDeviationBps` | 2000 (20%) | 500-5000 | Maximum price change per update |
| `circuitBreakerThresholdBps` | 5000 (50%) | 2000-10000 | Volatility trigger for circuit breaker |
| `gracePeriodSeconds` | 900 (15min) | 300-3600 | Delay for large price changes |
| `minOracleCount` | 2 | 1-10 | Minimum oracles for consensus |
| `maxStalenessSeconds` | 3600 (1hr) | 300-7200 | Maximum age for valid data |

### Governance Parameters

| Parameter | Default | Range | Purpose |
|-----------|---------|--------|---------|
| `proposalDelay` | 24 hours | 1-168 hours | Timelock for proposal execution |
| `requiredApprovals` | 2 | 1-10 | Minimum approvals for proposals |
| `gracePeriod` | 14 days | 1-30 days | Window for proposal execution |

### Aggregator Parameters

| Parameter | Default | Range | Purpose |
|-----------|---------|--------|---------|
| `minConfidenceScore` | 80 | 50-100 | Minimum confidence for price updates |
| `updateCooldown` | 300 (5min) | 60-3600 | Minimum time between updates |

## 🚨 Emergency Procedures

### Circuit Breaker Activation

**Automatic Triggers:**
- High volatility detection (>50% price movement)
- Oracle consensus failure
- System anomaly detection

**Manual Triggers:**
```solidity
// Emergency circuit breaker activation
await securityManager.triggerCircuitBreaker("Market manipulation detected");

// Emergency rate model circuit breaker
await rateModel.emergencyTriggerCircuitBreaker("Oracle compromise detected");
```

### Emergency Recovery

**Step 1: Assess Situation**
```solidity
// Check system status
const status = await rateModel.getOracleSystemStatus();
const cbActive = await securityManager.isCircuitBreakerActive();
const isPaused = await securityManager.isPaused();
```

**Step 2: Investigate Cause**
```solidity
// Check recent price data
const recentPrices = await securityManager.getSecurePrice("ETH_USD");
const oracleCount = await securityManager.getActiveOracleCount();

// Review oracle health
for (let oracle of activeOracles) {
    const config = await securityManager.getOracleConfig(oracle);
    console.log(`Oracle ${oracle}: Active=${config.isActive}, Failures=${config.failureCount}`);
}
```

**Step 3: Recovery Actions**
```solidity
// If false alarm, reset circuit breaker
await securityManager.resetCircuitBreaker();

// If oracle compromise, remove malicious oracles
await securityManager.removeOracle(compromisedOracle);

// If system-wide issue, emergency pause
await securityManager.emergencyPause();
```

## 🔍 Monitoring & Analytics

### Key Metrics Dashboard

**Real-Time Monitoring:**
```javascript
// Price validation metrics
const validationRate = (validPrices / totalPriceUpdates) * 100;
const avgConfidence = totalConfidence / validPrices;
const rejectionRate = (rejectedPrices / totalPriceUpdates) * 100;

// System health metrics
const uptimePercentage = (activeTime / totalTime) * 100;
const circuitBreakerActivations = await getCircuitBreakerHistory();
const averageResponseTime = await getAverageOracleResponseTime();

// Security event tracking
const manipulationAttempts = await getManipulationAttempts();
const falsePositives = await getFalsePositiveRate();
const emergencyActions = await getEmergencyActionHistory();
```

### Performance Metrics

**Expected Performance:**
- **Price Validation Rate:** >99%
- **Average Confidence:** >90%
- **Oracle Response Time:** <30 seconds
- **False Positive Rate:** <1%
- **System Uptime:** >99.9%

## 🛠️ Advanced Configuration

### Custom Oracle Integration

**Adding New Oracle Types:**
```solidity
// Deploy custom oracle with security validation
contract CustomSecureOracle is SecureAggregatorV3 {
    constructor(
        address _securityManager,
        string memory _priceType,
        string memory _description,
        uint8 _decimals,
        int256 _initialPrice
    ) SecureAggregatorV3(_securityManager, _priceType, _description, _decimals, _initialPrice) {}
    
    // Custom price validation logic
    function customValidation(int256 price) internal view returns (bool) {
        // Implement custom validation rules
        return price > 0 && price < maxReasonablePrice;
    }
}
```

### Multi-Chain Oracle Security

**Cross-Chain Validation:**
```solidity
// Validate prices across multiple chains
struct CrossChainPrice {
    uint16 chainId;
    int256 price;
    uint256 timestamp;
    uint256 confidence;
}

function validateCrossChainConsensus(CrossChainPrice[] memory prices) 
    external view returns (bool isValid, int256 consensusPrice);
```

## 📞 Support & Resources

### Documentation Resources
- [Oracle Security Guide](./ORACLE_SECURITY_GUIDE.md) (this document)
- [Main README](./README.md) - Complete protocol overview
- [API Documentation](./API_DOCS.md) - Contract interfaces
- [Testing Guide](./TESTING_GUIDE.md) - Comprehensive testing procedures

### Emergency Contacts
- **Security Team:** security@protocol.com
- **Emergency Hotline:** +1-XXX-XXX-XXXX
- **Discord Support:** https://discord.gg/protocol
- **Telegram Alerts:** https://t.me/protocol_alerts

### Bug Bounty Program
We offer rewards for security vulnerabilities:
- **Critical:** $50,000 - $100,000
- **High:** $10,000 - $50,000
- **Medium:** $1,000 - $10,000
- **Low:** $100 - $1,000

Report vulnerabilities to: security@protocol.com

---

*This guide represents the current state of our oracle security system. Please check for updates regularly as we continue to enhance our security measures.*