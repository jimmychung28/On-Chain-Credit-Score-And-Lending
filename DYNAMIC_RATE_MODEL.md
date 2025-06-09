# Dynamic Target Rate Model

## Overview

The Dynamic Target Rate Model is an advanced interest rate calculation system that automatically adjusts lending rates based on multiple market factors. Unlike traditional static rate models that only consider credit scores, this system provides sophisticated, real-time rate adjustments similar to those used by leading DeFi protocols like Aave and Compound.

## Key Features

### 🎯 **Utilization-Based Rate Curves**
- **Target Utilization**: Optimal pool utilization rate (default: 80%)
- **Kinked Rate Model**: Different slopes below and above target utilization
- **Dynamic Adjustment**: Rates increase exponentially when utilization exceeds target

### 📊 **Credit Score Risk Tiers**
- **8 Risk Tiers**: From excellent (750+) to terrible (300-399)
- **Risk Multipliers**: 0.8x to 5.0x based on creditworthiness
- **Base Premiums**: Additional risk premiums per tier (0% to 30%)

### 🌍 **Market Condition Factors**
- **Volatility Multiplier**: Adjusts rates based on market volatility
- **Liquidity Premium**: Additional premium during low liquidity periods
- **Risk Premium**: Base market risk adjustment

### 💰 **Loan-Specific Adjustments**
- **Size Discounts**: Larger loans get better rates (economies of scale)
- **Duration Premiums**: Longer loans carry higher rates (increased risk)

### 📈 **Performance-Based Optimization**
- **Default Rate Tracking**: Adjusts rates based on historical defaults
- **Automatic Optimization**: Self-adjusting parameters based on performance

## Rate Calculation Formula

```
Final Rate = Base Rate × Credit Multiplier × Market Conditions + Premiums + Adjustments
```

### Step-by-Step Calculation:

1. **Base Utilization Rate**
   ```
   If Utilization ≤ Target:
     Rate = Base Rate + (Utilization / Target) × Slope1
   
   If Utilization > Target:
     Rate = Base Rate + Slope1 + ((Utilization - Target) / (100% - Target)) × Slope2
   ```

2. **Credit Risk Adjustment**
   ```
   Adjusted Rate = Base Rate × Risk Multiplier + Base Premium
   ```

3. **Market Conditions**
   ```
   Market Rate = Adjusted Rate × Volatility Multiplier + Liquidity Premium + Risk Premium
   ```

4. **Loan-Specific Adjustments**
   ```
   Size Adjustment:
   - ≥10 ETH: 5% discount
   - ≥1 ETH: 2% discount
   
   Duration Adjustment:
   - >90 days: 10% premium
   - >60 days: 5% premium
   ```

5. **Performance Adjustment**
   ```
   Default Rate Adjustment:
   - >10% defaults: 20% premium
   - >5% defaults: 10% premium
   - <1% defaults: 5% discount
   ```

## Default Parameters

### Rate Model
- **Base Rate**: 2.00% (200 bp)
- **Target Utilization**: 80.00% (8000 bp)
- **Slope 1**: 4.00% (400 bp)
- **Slope 2**: 60.00% (6000 bp)
- **Max Rate**: 100.00% (10000 bp)

### Market Conditions
- **Volatility Multiplier**: 1.00x (100)
- **Liquidity Premium**: 0.00% (0 bp)
- **Risk Premium**: 0.50% (50 bp)

### Credit Risk Tiers

| Score Range | Risk Multiplier | Base Premium | Description |
|-------------|----------------|--------------|-------------|
| 750-850     | 0.80x          | 0.00%        | Excellent   |
| 700-749     | 0.90x          | 0.50%        | Very Good   |
| 650-699     | 1.00x          | 1.00%        | Good        |
| 600-649     | 1.20x          | 2.00%        | Fair        |
| 500-599     | 1.50x          | 4.00%        | Poor        |
| 450-499     | 2.00x          | 8.00%        | Bad         |
| 400-449     | 3.00x          | 15.00%       | Very Bad    |
| 300-399     | 5.00x          | 30.00%       | Terrible    |

## Example Rate Scenarios

### Low Utilization (20%)
- **Credit Score 750**: 2.8% APR
- **Credit Score 650**: 4.4% APR
- **Credit Score 500**: 8.8% APR

### Target Utilization (80%)
- **Credit Score 750**: 5.2% APR
- **Credit Score 650**: 7.3% APR
- **Credit Score 500**: 13.2% APR

### High Utilization (95%)
- **Credit Score 750**: 40.5% APR
- **Credit Score 650**: 51.5% APR
- **Credit Score 500**: 79.4% APR

### High Volatility Scenario (2x multiplier)
- **Credit Score 650 at 80% utilization**: 16.17% APR (vs 7.3% normal)

## Integration with CreditLending

The Dynamic Target Rate Model is seamlessly integrated with the CreditLending contract:

```solidity
// Calculate dynamic interest rate
uint256 poolUtilization = _calculatePoolUtilization();
uint256 interestRate = rateModel.calculateInterestRate(
    creditScore,
    poolUtilization,
    amount,
    LOAN_DURATION
);
```

## Admin Functions

### Update Rate Model Parameters
```solidity
function updateRateModel(
    uint256 _baseRate,
    uint256 _targetUtilization,
    uint256 _slope1,
    uint256 _slope2,
    uint256 _maxRate
) external onlyOwner
```

### Update Market Conditions
```solidity
function updateMarketConditions(
    uint256 _volatilityMultiplier,
    uint256 _liquidityPremium,
    uint256 _riskPremium
) external onlyOwner
```

### Record Loan Performance
```solidity
function recordLoanPerformance(bool successful) external
```

## View Functions

### Get Rate Components
```solidity
function getCurrentRateComponents(uint256 creditScore, uint256 utilization) 
    external view returns (
        uint256 baseUtilizationRate,
        uint256 creditAdjustedRate,
        uint256 marketAdjustedRate,
        uint256 finalRate
    )
```

### Get Performance Statistics
```solidity
function getPerformanceStats() external view returns (
    uint256 totalOriginated,
    uint256 totalDefaulted,
    uint256 defaultRate
)
```

## Benefits

### For Lenders
- **Higher Yields**: Rates automatically increase with demand
- **Risk-Adjusted Returns**: Better compensation during high-risk periods
- **Market-Responsive**: Rates adjust to market conditions

### For Borrowers
- **Fair Pricing**: Rates reflect actual risk and market conditions
- **Transparent**: Clear rate calculation methodology
- **Competitive**: Better rates during low utilization periods

### For the Protocol
- **Optimal Utilization**: Incentivizes balanced supply and demand
- **Risk Management**: Automatic risk adjustments
- **Performance Optimization**: Self-improving based on historical data

## Comparison with Static Model

| Feature | Static Model | Dynamic Target Rate Model |
|---------|-------------|---------------------------|
| Rate Factors | Credit score only | Credit score + utilization + market conditions |
| Market Response | None | Real-time adjustments |
| Risk Management | Basic tiers | Advanced multi-factor analysis |
| Optimization | Manual | Automatic performance-based |
| Transparency | Limited | Full component breakdown |

## Testing and Deployment

### Deploy the Model
```bash
yarn deploy --reset
```

### Run Demo
```bash
yarn hardhat run scripts/demo-dynamic-rates.ts --network localhost
```

### Test Different Scenarios
```bash
yarn hardhat run scripts/setup-test-credit.ts --network localhost
```

## Future Enhancements

1. **Oracle Integration**: Real-time market data feeds
2. **Cross-Chain Rates**: Multi-chain rate synchronization
3. **Governance**: Community-driven parameter updates
4. **Advanced Analytics**: ML-based rate optimization
5. **Insurance Integration**: Coverage-based rate adjustments

## Security Considerations

- **Access Control**: Only owner can update parameters
- **Bounds Checking**: All rates are bounded by min/max limits
- **Overflow Protection**: SafeMath operations throughout
- **Reentrancy Guards**: Protection against reentrancy attacks

## Conclusion

The Dynamic Target Rate Model represents a significant advancement in DeFi lending protocols, providing sophisticated, market-responsive interest rate calculations that benefit all participants in the ecosystem. By automatically adjusting to market conditions, credit risk, and performance metrics, it ensures optimal capital efficiency and fair pricing for all users. 