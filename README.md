# 🏗 On-Chain Credit Scoring Protocol

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 A decentralized credit scoring protocol built on Ethereum that assesses creditworthiness based on blockchain-native data rather than traditional financial history. This protocol is particularly important for DeFi and emerging markets where users may not have access to formal banking systems but do have blockchain transaction history.

⚙️ Built using NextJS, RainbowKit, Hardhat, Wagmi, Viem, and Typescript on top of Scaffold-ETH 2.

## 🌟 Features

### Credit Scoring System
- ✅ **On-Chain Credit Profiles**: Complete credit profiles stored on-chain with transparent scoring algorithms
- 📊 **Multi-Factor Scoring**: Credit scores calculated based on:
  - Transaction volume and frequency (45% weight)
  - Account age (15% weight) 
  - Loan repayment history (30% weight)
  - ETH staking amount (10% weight)
- 🔄 **Real-Time Updates**: Credit scores update automatically when new data is recorded
- 📈 **Score Range**: Traditional 300-850 credit score range for familiarity

### Lending Protocol
- 💰 **Pooled Lending**: Community-funded lending pool for decentralized loan distribution
- 🎯 **Risk-Based Pricing**: Interest rates automatically calculated based on credit scores (3%-20%)
- ⏰ **Fixed Terms**: 30-day loan terms with transparent repayment schedules
- 🛡️ **Default Tracking**: Automatic default detection and credit score impact

### Staking Mechanism
- 🔒 **Credit Enhancement**: Users can stake ETH to improve their credit scores
- 💎 **Collateral Benefits**: Staked ETH demonstrates financial commitment
- 🔄 **Flexible Withdrawal**: Stake and unstake ETH as needed (affects credit score)

## 🏗 Architecture

### Smart Contracts

#### CreditScoring.sol
The core contract that manages credit profiles and scoring algorithms:

```solidity
struct CreditProfile {
    uint256 score;           // Credit score (300-850)
    uint256 totalVolume;     // Total transaction volume
    uint256 transactionCount; // Number of transactions
    uint256 avgTransactionValue; // Average transaction value
    uint256 accountAge;      // Account age in blocks
    uint256 lastUpdated;     // Last update timestamp
    bool isActive;           // Profile status
    uint256 loanCount;       // Total loans taken
    uint256 repaidLoans;     // Successfully repaid loans
    uint256 defaultedLoans;  // Defaulted loans
}
```

**Key Functions:**
- `registerUser()`: Register for credit scoring system
- `recordTransaction()`: Record transaction data for scoring
- `recordLoan()`: Record loan outcomes (repaid/defaulted)
- `depositStake()`: Stake ETH to improve credit score
- `getCreditScore()`: Get current credit score
- `getCreditProfile()`: Get complete credit profile

#### CreditLending.sol
The lending protocol that uses credit scores for loan decisions:

```solidity
struct Loan {
    uint256 amount;          // Loan amount
    uint256 interestRate;    // Interest rate (basis points)
    uint256 duration;        // Loan duration
    uint256 startTime;       // Start timestamp
    uint256 dueDate;         // Due date
    bool isActive;           // Loan status
    bool isRepaid;           // Repayment status
    uint256 amountRepaid;    // Amount repaid
    address borrower;        // Borrower address
    address lender;          // Lender address
}
```

**Key Functions:**
- `depositToPool()`: Add funds to lending pool
- `withdrawFromPool()`: Remove funds from lending pool
- `requestLoan()`: Request a loan (requires minimum credit score)
- `repayLoan()`: Repay an active loan
- `checkLoanEligibility()`: Check if user qualifies for loan

### Frontend Interface

#### Credit Scoring Dashboard
- 📊 **Credit Profile Display**: Shows current credit score, rating, and detailed metrics
- 🎯 **Score Breakdown**: Visual representation of scoring factors
- 📈 **Historical Data**: Transaction history and loan performance
- 🔄 **Real-Time Updates**: Live updates when transactions are processed

#### Lending Interface
- 💰 **Loan Request**: Simple interface to request loans with automatic eligibility checking
- 📋 **Pool Management**: Deposit/withdraw funds from lending pool
- 📊 **Pool Statistics**: Real-time pool metrics and performance data
- 💳 **Loan Management**: Track active loans and repayment schedules

## 🚀 Getting Started

### Prerequisites

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd OnChainCredit/y
```

2. Install dependencies:
```bash
yarn install
```

3. Start a local Ethereum network:
```bash
yarn chain
```

4. Deploy the smart contracts:
```bash
yarn deploy
```

5. Start the frontend application:
```bash
yarn start
```

6. Visit your app on: `http://localhost:3000`

## 📖 Usage Guide

### For Borrowers

1. **Register**: Connect your wallet and register for the credit scoring system
2. **Build Credit**: 
   - Make regular transactions to build transaction history
   - Stake ETH to demonstrate financial commitment
   - Maintain a good repayment history
3. **Request Loans**: Once you have a sufficient credit score (≥400), request loans
4. **Repay On Time**: Repay loans before the due date to maintain good credit

### For Lenders

1. **Deposit Funds**: Add ETH to the lending pool to earn interest
2. **Earn Returns**: Receive proportional interest from loan repayments
3. **Monitor Pool**: Track pool performance and your share of earnings
4. **Withdraw**: Remove funds from the pool when needed

### Credit Score Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Transaction Volume | 25% | Total ETH volume transacted |
| Transaction Frequency | 20% | Number of transactions made |
| Account Age | 15% | Age of the Ethereum account |
| Repayment History | 30% | Loan repayment track record |
| Staking Amount | 10% | ETH staked as collateral |

### Interest Rate Tiers

| Credit Score | Interest Rate | Rating |
|--------------|---------------|---------|
| 750+ | 3% | Excellent |
| 700-749 | 5% | Good |
| 650-699 | 8% | Fair |
| 600-649 | 11% | Poor |
| 500-599 | 15% | Bad |
| 400-499 | 20% | Very Poor |

## 🔧 Configuration

### Smart Contract Parameters

The protocol includes several configurable parameters:

```solidity
// Credit Scoring Parameters
uint256 public constant MAX_SCORE = 850;
uint256 public constant MIN_SCORE = 300;

// Scoring Weights (adjustable by owner)
uint256 public volumeWeight = 25;       // 25%
uint256 public frequencyWeight = 20;    // 20%
uint256 public ageWeight = 15;          // 15%
uint256 public repaymentWeight = 30;    // 30%
uint256 public stakingWeight = 10;      // 10%

// Lending Parameters
uint256 public constant MAX_LOAN_AMOUNT = 100 ether;
uint256 public constant MIN_CREDIT_SCORE = 400;
uint256 public constant LOAN_DURATION = 30 days;
uint256 public constant ORIGINATION_FEE = 50; // 0.5%
```

## 🧪 Testing

Run the smart contract tests:
```bash
yarn hardhat:test
```

## 🛳 Deployment

### Local Development
The contracts are automatically deployed to your local Hardhat network when you run `yarn deploy`.

### Testnet Deployment
1. Configure your network in `packages/hardhat/hardhat.config.ts`
2. Set up your deployer account with `yarn generate` or import existing key
3. Deploy with `yarn deploy --network <network-name>`

### Mainnet Deployment
⚠️ **Warning**: This is experimental software. Thoroughly test on testnets before mainnet deployment.

## 🔒 Security Considerations

- **Smart Contract Audits**: Contracts should be audited before mainnet deployment
- **Oracle Dependencies**: Consider integrating price oracles for more accurate valuations
- **Governance**: Implement governance mechanisms for parameter updates
- **Emergency Controls**: Include emergency pause functionality for critical issues

## 🤝 Contributing

We welcome contributions to the On-Chain Credit Scoring Protocol!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [Scaffold-ETH 2](https://scaffoldeth.io)
- Inspired by traditional credit scoring systems
- Designed for the DeFi ecosystem

## 🔗 Links

- [Scaffold-ETH 2 Documentation](https://docs.scaffoldeth.io)
- [Ethereum Development Resources](https://ethereum.org/developers)
- [DeFi Pulse](https://defipulse.com)

---

**Disclaimer**: This is experimental software for educational and development purposes. Use at your own risk.