# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Flow
```bash
# Start local blockchain (Terminal 1)
yarn chain

# Deploy contracts (Terminal 2) 
yarn deploy

# Start frontend (Terminal 3)
yarn start
```

### Testing & Demo Commands
```bash
# Test enhanced credit system with realistic data
yarn workspace @se-2/hardhat run scripts/test-enhanced-credit-system.ts --network localhost

# Test universal cross-chain credit scoring
yarn workspace @se-2/hardhat run scripts/test-universal-score.ts --network localhost

# Test ZK proof system
yarn workspace @se-2/hardhat run scripts/test-zk-system.ts --network localhost

# Test oracle integration
yarn workspace @se-2/hardhat run scripts/test-oracle-integration.ts --network localhost

# Run comprehensive test suite
yarn test
```

### Build & Quality Commands
```bash
# Format code
yarn format

# Lint code
yarn lint

# Type checking
yarn next:check-types
yarn hardhat:check-types

# Clean build
yarn hardhat:clean
yarn hardhat:compile
```

### ZK Circuit Commands
```bash
# Compile ZK circuits
yarn circuits:compile
# Or directly: cd circuits && ./compile.sh

# Test circuits
yarn circuits:test
```

### Multi-Chain Deployment
```bash
# Deploy to multiple testnets
yarn deploy:multi-chain

# Deploy to specific networks
yarn deploy:sepolia
yarn deploy:arbitrum-sepolia
yarn deploy:optimism-sepolia
yarn deploy:base-sepolia
```

## Architecture Overview

### Monorepo Structure
This is a Scaffold-ETH 2 monorepo with the following key packages:
- `packages/hardhat/` - Smart contracts, deployment scripts, tests
- `packages/nextjs/` - Frontend application with React/Next.js
- `circuits/` - Zero-Knowledge proof circuits using Circom

### Core Smart Contracts
- **CreditScoring.sol** - Advanced credit scoring with 7 sophisticated factors
- **ZKCreditLending.sol** - Privacy-preserving lending with dynamic rates
- **CrossChainCreditAggregator.sol** - Multi-chain credit aggregation via LayerZero
- **Groth16Verifier.sol** - Zero-knowledge proof verification
- **DynamicTargetRateModelWithOracles.sol** - Oracle-powered interest rate model

### Credit Scoring System
The system uses 7 sophisticated scoring factors (vs traditional 4-factor systems):
1. **Transactional Behavior** (20%) - Volume, frequency, account maturity
2. **Behavioral Patterns** (15%) - Gas efficiency, protocol diversity
3. **Asset Management** (15%) - Portfolio diversity, stablecoin allocation
4. **DeFi Participation** (20%) - Liquidity provision, staking, yield farming
5. **Repayment History** (20%) - Loan performance and reliability
6. **Governance Participation** (5%) - DAO voting, community engagement
7. **Social Reputation** (5%) - On-chain attestations, NFT activity

### Zero-Knowledge Privacy
- Uses Groth16 ZK-SNARKs for privacy-preserving credit verification
- 5 privacy levels with economic incentives (maximum privacy is FREE)
- Circom circuits in `circuits/src/` for proof generation
- Complete financial privacy while maintaining verifiable creditworthiness

### Multi-Chain Architecture
- Universal credit scoring across 5 major blockchains (Ethereum, Polygon, Arbitrum, Optimism, Base)
- LayerZero integration for cross-chain messaging
- Weighted scoring: Ethereum (40%), Polygon (25%), Arbitrum (20%), Optimism (10%), Base (5%)
- Cross-chain bonuses for diversification, consistency, volume, and sophistication

### Oracle System
Three oracle types for maximum flexibility:
- **Custom Advanced** - Development/testing with price simulation
- **Chainlink Standard** - Industry standard for compatibility/audits
- **Hybrid** - Production with runtime switching and fallback mechanisms

## Development Patterns

### Smart Contract Interactions
Always use Scaffold-ETH hooks for contract interactions:
```typescript
// Reading from contracts
const { data } = useScaffoldReadContract({
  contractName: "CreditScoring",
  functionName: "getCreditProfile",
  args: [address],
});

// Writing to contracts
const { writeContractAsync } = useScaffoldWriteContract({
  contractName: "ZKCreditLending"
});
```

### Testing Patterns
- Use the provided test scripts in `packages/hardhat/scripts/` for comprehensive testing
- Scripts like `test-enhanced-credit-system.ts` provide realistic test data
- Always test ZK proofs with `test-zk-system.ts` before deployment
- Oracle integration testing via `test-oracle-integration.ts`

### Frontend Components
Key React components in `packages/nextjs/components/`:
- **CreditScoreDisplay.tsx** - Basic credit score visualization
- **EnhancedCreditDisplay.tsx** - Advanced scoring factor breakdown
- **ZKCreditInterface.tsx** - Privacy-preserving lending interface
- Use Scaffold-ETH components: `Address`, `Balance`, `EtherInput`, `AddressInput`

### Contract Deployment
- Deployment scripts in `packages/hardhat/deploy/` are numbered for execution order
- Always run `yarn deploy` after contract changes to update frontend ABIs
- Use `scripts/generateTsAbis.ts` to ensure TypeScript types are current

### Privacy & Security
- Never expose private keys or sensitive data in code
- ZK circuits require proper trusted setup for production
- Use privacy levels appropriately (Level 5 = maximum privacy, FREE)
- Implement proper access controls and validation in smart contracts

## Key File Locations

### Smart Contracts
- Core contracts: `packages/hardhat/contracts/`
- Cross-chain: `packages/hardhat/contracts/crosschain/`
- Mock contracts: `packages/hardhat/contracts/mocks/`
- Deployment scripts: `packages/hardhat/deploy/`

### Frontend
- Pages: `packages/nextjs/app/`
- Components: `packages/nextjs/components/`
- Hooks: `packages/nextjs/hooks/scaffold-eth/`
- Contract ABIs: `packages/nextjs/contracts/deployedContracts.ts`

### Configuration
- Hardhat config: `packages/hardhat/hardhat.config.ts`
- Frontend config: `packages/nextjs/scaffold.config.ts`
- Oracle config: `packages/hardhat/config/oracle-config.ts`
- LayerZero config: `packages/hardhat/config/layerzero-config.ts`

### Testing & Utilities
- Test scripts: `packages/hardhat/scripts/test-*.ts`
- Unit tests: `packages/hardhat/test/`
- ZK circuits: `circuits/src/`
- Utilities: `packages/nextjs/utils/`

## Network Configuration

The project supports multiple networks configured in `hardhat.config.ts`:
- **Local**: localhost (default for development)
- **Mainnets**: Ethereum, Arbitrum, Optimism, Polygon, Base
- **Testnets**: Sepolia, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia

Always test on localhost first, then testnets before mainnet deployment.