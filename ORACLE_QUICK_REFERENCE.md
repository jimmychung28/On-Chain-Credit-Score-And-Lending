# 🔮 Oracle System Quick Reference

## 📋 Quick Commands

```bash
# Deploy hybrid oracle system
yarn deploy:oracles

# Test oracle functionality
yarn test:oracles

# Test on hardhat network
yarn test:oracles:hardhat
```

## 🎛️ Oracle Types

| Type | Code | Use Case |
|------|------|----------|
| Custom Advanced | `0` | Development, complex testing |
| Chainlink Standard | `1` | Compatibility, audits |
| Hybrid | `2` | Production testing |

## 🚀 Quick Usage

### Deploy Oracle Set
```typescript
const factory = await ethers.getContractAt("MockOracleFactory", factoryAddress);
await factory.deployOracleSet();
```

### Switch Oracle Mode
```typescript
const hybridOracle = await ethers.getContractAt("HybridMockOracle", oracleAddress);
await hybridOracle.setMockType(0); // Switch to custom advanced
```

### Update Prices
```typescript
// Single oracle
await oracle.updateAnswer(300000000000); // $3000

// Batch update
await factory.batchUpdatePrices(
    ["ETH_USD", "VOLATILITY"],
    [320000000000, 15000000000]
);
```

### Advanced Testing
```typescript
// Only works with custom/hybrid oracles
await customOracle.simulatePriceMovement(1000, 5); // 10% volatility
```

## 📊 Default Oracle Configuration

| Oracle | Initial Price | Decimals | Type |
|--------|---------------|----------|------|
| ETH_USD | $3,000 | 8 | Hybrid |
| VOLATILITY | 100% (1.0x) | 8 | Custom Advanced |
| LIQUIDITY | 0% | 8 | Chainlink Standard |
| DEFI_RATE | 5% | 8 | Hybrid |

## 🔧 Contract Addresses (After Deployment)

Check deployment logs or run:
```typescript
const ethUsdOracle = await factory.getOracleAddress("ETH_USD");
console.log("ETH/USD Oracle:", ethUsdOracle);
```

## 🧪 Testing Scenarios

### Market Conditions
```typescript
const scenarios = {
    NORMAL: { ethPrice: 300000000000n, volatility: 10000000000n },
    BULL: { ethPrice: 500000000000n, volatility: 5000000000n },
    BEAR: { ethPrice: 150000000000n, volatility: 20000000000n },
    CRASH: { ethPrice: 80000000000n, volatility: 50000000000n }
};
```

### Health Checks
```typescript
const isHealthy = await hybridOracle.isCustomMockHealthy();
const currentMode = await hybridOracle.getCurrentMockTypeString();
```

## 🚨 Troubleshooting

| Error | Solution |
|-------|----------|
| "Oracle not found" | Run `yarn deploy:oracles` |
| "Advanced features only..." | Switch to Custom/Hybrid mode |
| "Stale data" | Update oracle price |

## 📚 Full Documentation

- **Complete Guide**: [Oracle Integration Guide](./ORACLE_INTEGRATION_GUIDE.md)
- **Contract Source**: `contracts/mocks/`
- **Test Scripts**: `scripts/test-hybrid-oracles.ts`