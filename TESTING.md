# 🧪 OnChain Credit System - Testing Guide

This guide provides comprehensive instructions for testing the OnChain Credit Scoring Protocol locally.

## Quick Start

### 1. Initial Setup
```bash
# Terminal 1: Start blockchain
yarn chain

# Terminal 2: Deploy contracts  
yarn deploy

# Terminal 3: Start frontend
yarn start
```

### 2. Quick Credit Boost
```bash
# Option A: Automatic registration + boost
cd packages/hardhat
npx hardhat run scripts/register-and-boost.ts --network localhost

# Option B: Manual registration (frontend) + boost
npx hardhat run scripts/setup-test-credit.ts --network localhost
```

### 3. Access Frontend
Visit: `http://localhost:3001/credit-scoring`

## Detailed Testing Scenarios

### Scenario 1: From Zero to Hero Credit Journey

**Goal**: Demonstrate complete user journey from no credit to excellent credit.

1. **Start with Fresh User**
   ```bash
   # Deploy fresh contracts
   npx hardhat deploy --network localhost --reset
   ```

2. **Check Initial State** (via frontend or script)
   - Credit Score: 300 (minimum)
   - Interest Rate: 100% (maximum)
   - Loan Eligibility: Minimal

3. **Progressive Credit Building**
   ```bash
   # Run multiple times to see gradual improvement
   for i in {1..10}; do
     npx hardhat run scripts/create-test-user.ts --network localhost
     echo "Run $i completed"
   done
   ```

4. **Track Progress**
   | Run # | Expected Score Range | Interest Rate | Credit Rating |
   |-------|---------------------|---------------|---------------|
   | 0 | 300 | 100% | Very Poor |
   | 1 | 443 | 30% | Poor |
   | 3 | 490 | 20% | Poor |
   | 5 | 503 | 15% | Fair |
   | 10 | 573 | 15% | Fair |
   | 15 | 622 | 11% | Good |

### Scenario 2: Interest Rate Optimization Testing

**Goal**: Test all interest rate tiers and lending terms.

1. **Test Each Credit Tier**
   ```bash
   # Script to achieve specific credit scores
   npx hardhat run scripts/register-and-boost.ts --network localhost
   ```

2. **Loan Request Testing**
   - Access frontend at `http://localhost:3001/credit-scoring`
   - Navigate to "Borrow" tab
   - Request loans of different amounts
   - Observe interest rate calculations

3. **Expected Interest Rate Matrix**
   ```
   Credit Score | Interest Rate | Max Loan | Status
   -------------|---------------|----------|--------
   300-349      | 100%         | 100 ETH  | High Risk
   350-399      | 70%          | 100 ETH  | High Risk  
   400-449      | 30%          | 100 ETH  | Poor
   450-499      | 20%          | 100 ETH  | Poor
   500-599      | 15%          | 100 ETH  | Fair
   600-649      | 11%          | 100 ETH  | Good
   650-699      | 8%           | 100 ETH  | Very Good
   700-749      | 5%           | 100 ETH  | Very Good
   750+         | 3%           | 100 ETH  | Excellent
   ```

### Scenario 3: Lending Pool Testing

**Goal**: Test lending pool mechanics and yield generation.

1. **Check Initial Pool State**
   - Pool Balance: 10 ETH (from deployment)
   - Available: 10 ETH
   - Total Interest: 0 ETH

2. **Stake ETH for Yield**
   ```bash
   # Navigate to "Stake ETH" tab on frontend
   # Stake additional ETH to earn from loan interest
   ```

3. **Request and Repay Loans**
   ```bash
   # Through frontend:
   # 1. Request loan with good credit score
   # 2. Loan will be auto-approved
   # 3. Repay loan to generate interest for stakers
   ```

### Scenario 4: Default and Recovery Testing

**Goal**: Test credit score impact of loan defaults.

1. **Create User with Mixed History**
   ```bash
   # Modify scripts to include defaults
   # This requires manual contract interaction
   ```

2. **Expected Impact**
   - 1 Default: ~50-100 point score reduction
   - Multiple Defaults: Severe score impact
   - Recovery: Requires multiple successful loans

## Testing Scripts Reference

### Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-test-credit.ts` | Boost existing user credit | Requires frontend registration first |
| `register-and-boost.ts` | Auto-register + boost | Complete automation |
| `create-test-user.ts` | Incremental credit building | Run multiple times for progression |

### Script Execution Examples

```bash
# Navigate to hardhat directory
cd packages/hardhat

# Full automation (recommended for quick testing)
npx hardhat run scripts/register-and-boost.ts --network localhost

# Incremental building (for progression testing)
for i in {1..5}; do
  npx hardhat run scripts/create-test-user.ts --network localhost
done

# Manual boost (after frontend registration)
npx hardhat run scripts/setup-test-credit.ts --network localhost
```

## Frontend Testing Checklist

### Credit Profile Dashboard
- [ ] Credit score displays correctly (300-850 range)
- [ ] Credit rating shows appropriate tier
- [ ] Score breakdown shows all factors
- [ ] Interest rate displays correctly
- [ ] Transaction count and volume accurate
- [ ] Loan history visible

### Loan Interface
- [ ] Loan request form functional
- [ ] Interest rate calculated properly
- [ ] Eligibility checking works
- [ ] Loan terms display correctly
- [ ] Error handling for insufficient credit

### Staking Interface
- [ ] ETH staking functional
- [ ] APY calculation correct
- [ ] Pool statistics accurate
- [ ] Unstaking works properly
- [ ] Balance updates in real-time

### Navigation and UX
- [ ] Tab switching smooth
- [ ] Real-time updates work
- [ ] Error messages helpful
- [ ] Transaction confirmations clear
- [ ] MetaMask integration seamless

## Network Configuration

### MetaMask Setup
```
Network Name: Hardhat
RPC URL: http://localhost:8545
Chain ID: 31337
Currency Symbol: ETH
Block Explorer: (leave empty)
```

### Test Accounts
```
Primary Test Account: 0x010C5E560D0e042B53Cedba9A7404E90F82D7592
Deployer Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

## Troubleshooting Guide

### Common Issues and Solutions

1. **Network Issues**
   ```bash
   # Problem: Wrong network or RPC errors
   # Solution: Verify MetaMask network settings
   # Ensure yarn chain is running
   ```

2. **Contract Deployment Issues**
   ```bash
   # Problem: Contracts not found
   # Solution: Redeploy contracts
   npx hardhat deploy --network localhost --reset
   ```

3. **Transaction Failures**
   ```bash
   # Problem: Transactions failing
   # Solution: Check account balance and network
   # Reset MetaMask account if needed
   ```

4. **Script Execution Errors**
   ```bash
   # Problem: Script fails with "User not registered"
   # Solution: Use register-and-boost.ts or register via frontend first
   ```

5. **Frontend Loading Issues**
   ```bash
   # Problem: Frontend not loading properly
   # Solution: Clear browser cache, restart yarn start
   ```

## Performance Testing

### Load Testing Scenarios

1. **Multiple User Registration**
   ```bash
   # Test system with multiple users
   npx hardhat run scripts/createTestUsers.ts --network localhost
   ```

2. **High Transaction Volume**
   ```bash
   # Simulate high activity
   for i in {1..20}; do
     npx hardhat run scripts/create-test-user.ts --network localhost
   done
   ```

3. **Pool Stress Testing**
   - Multiple simultaneous loans
   - Large stake/unstake operations
   - Pool depletion scenarios

## Expected Test Results

### Successful Test Completion Indicators

- [ ] Credit scores range from 300 to 622+
- [ ] Interest rates decrease from 100% to 11-15%
- [ ] Lending pool maintains 10 ETH base liquidity
- [ ] Frontend responsive and error-free
- [ ] All smart contract functions operational
- [ ] Real-time updates working across all interfaces

### Performance Metrics

- Transaction confirmation: < 2 seconds on local network
- Frontend load time: < 3 seconds
- Credit score calculation: Instant
- Loan eligibility check: < 1 second

## Documentation Testing

Test that all documentation examples work:

```bash
# Test all README examples
yarn chain
yarn deploy  
yarn start

# Test all script examples from this guide
cd packages/hardhat
npx hardhat run scripts/register-and-boost.ts --network localhost
```

## Next Steps After Testing

1. **Testnet Deployment**: Deploy to Sepolia or other testnets
2. **Gas Optimization**: Analyze and optimize transaction costs
3. **Security Review**: Audit smart contracts
4. **UI/UX Improvements**: Based on testing feedback
5. **Integration Testing**: Test with real wallet flows

---

**Happy Testing!** 🚀

For issues or questions, refer to the main [README.md](./README.md) or create an issue in the repository. 