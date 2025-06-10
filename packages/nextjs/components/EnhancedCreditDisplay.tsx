import React from "react";
import {
  BuildingLibraryIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface ScoreBreakdown {
  transactional: number;
  behavioral: number;
  asset: number;
  defi: number;
  repayment: number;
  governance: number;
  social: number;
}

interface EnhancedProfile {
  totalGasPaid: bigint;
  uniqueProtocols: bigint;
  stablecoinRatio: bigint;
  assetDiversity: bigint;
  avgHoldingPeriod: bigint;
  liquidityProvided: bigint;
  stakingRewards: bigint;
  governanceVotes: bigint;
  nftInteractions: bigint;
  socialScore: bigint;
}

interface EnhancedCreditDisplayProps {
  scoreBreakdown?: ScoreBreakdown;
  enhancedProfile?: EnhancedProfile;
  className?: string;
}

export const EnhancedCreditDisplay: React.FC<EnhancedCreditDisplayProps> = ({
  scoreBreakdown,
  enhancedProfile,
  className = "",
}) => {
  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-500";
    if (score >= 700) return "text-blue-500";
    if (score >= 650) return "text-yellow-500";
    if (score >= 600) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 750) return "bg-green-500";
    if (score >= 700) return "bg-blue-500";
    if (score >= 650) return "bg-yellow-500";
    if (score >= 600) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatBigInt = (value: bigint, decimals: number = 18): string => {
    const divisor = BigInt(10 ** decimals);
    const quotient = value / divisor;
    const remainder = value % divisor;

    if (quotient === 0n && remainder === 0n) return "0";
    if (quotient >= 1000n) return `${quotient.toString()}`;
    if (quotient >= 1n) return `${quotient.toString()}.${remainder.toString().padStart(decimals, "0").slice(0, 2)}`;

    const remainderStr = remainder.toString().padStart(decimals, "0");
    const firstNonZero = remainderStr.search(/[1-9]/);
    return `0.${remainderStr.slice(firstNonZero, firstNonZero + 3)}`;
  };

  const scoringFactors = [
    {
      name: "Transactional Behavior",
      weight: 20,
      score: scoreBreakdown?.transactional || 0,
      icon: CurrencyDollarIcon,
      description: "Transaction volume, frequency & account age",
      color: "text-blue-500",
    },
    {
      name: "Behavioral Patterns",
      weight: 15,
      score: scoreBreakdown?.behavioral || 0,
      icon: ChartBarIcon,
      description: "Gas efficiency & protocol diversity",
      color: "text-purple-500",
    },
    {
      name: "Asset Management",
      weight: 15,
      score: scoreBreakdown?.asset || 0,
      icon: ShieldCheckIcon,
      description: "Portfolio diversity & holding patterns",
      color: "text-green-500",
    },
    {
      name: "DeFi Participation",
      weight: 20,
      score: scoreBreakdown?.defi || 0,
      icon: BuildingLibraryIcon,
      description: "Liquidity provision & staking rewards",
      color: "text-orange-500",
    },
    {
      name: "Repayment History",
      weight: 20,
      score: scoreBreakdown?.repayment || 0,
      icon: TrophyIcon,
      description: "Loan repayment track record",
      color: "text-emerald-500",
    },
    {
      name: "Governance",
      weight: 5,
      score: scoreBreakdown?.governance || 0,
      icon: UsersIcon,
      description: "DAO participation & voting",
      color: "text-indigo-500",
    },
    {
      name: "Social Reputation",
      weight: 5,
      score: scoreBreakdown?.social || 0,
      icon: StarIcon,
      description: "Attestations & community standing",
      color: "text-pink-500",
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Score Breakdown */}
      {scoreBreakdown && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Credit Score Breakdown</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {scoringFactors.map((factor, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <factor.icon className={`h-5 w-5 ${factor.color}`} />
                      <span className="font-semibold">{factor.name}</span>
                    </div>
                    <div className="text-sm bg-base-200 px-2 py-1 rounded">{factor.weight}%</div>
                  </div>
                  <div className="text-sm text-base-content/70 mb-2">{factor.description}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-base-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getScoreBarColor(factor.score)}`}
                        style={{ width: `${((factor.score - 300) / 550) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`font-bold ${getCreditScoreColor(factor.score)}`}>{factor.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Profile Metrics */}
      {enhancedProfile && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Detailed Activity Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-blue-500">
                  <ChartBarIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Total Gas Paid</div>
                <div className="stat-value text-blue-500">{formatBigInt(enhancedProfile.totalGasPaid, 0)}</div>
                <div className="stat-desc">Gas units consumed</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-purple-500">
                  <BuildingLibraryIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Unique Protocols</div>
                <div className="stat-value text-purple-500">{enhancedProfile.uniqueProtocols.toString()}</div>
                <div className="stat-desc">Different DApps used</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-green-500">
                  <ShieldCheckIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Stablecoin Ratio</div>
                <div className="stat-value text-green-500">{enhancedProfile.stablecoinRatio.toString()}%</div>
                <div className="stat-desc">Portfolio stability</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-orange-500">
                  <CurrencyDollarIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Asset Diversity</div>
                <div className="stat-value text-orange-500">{enhancedProfile.assetDiversity.toString()}</div>
                <div className="stat-desc">Different tokens held</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-emerald-500">
                  <TrophyIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Liquidity Provided</div>
                <div className="stat-value text-emerald-500">{formatBigInt(enhancedProfile.liquidityProvided)} ETH</div>
                <div className="stat-desc">DEX liquidity</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-indigo-500">
                  <UsersIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Governance Votes</div>
                <div className="stat-value text-indigo-500">{enhancedProfile.governanceVotes.toString()}</div>
                <div className="stat-desc">DAO participation</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-pink-500">
                  <StarIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">NFT Interactions</div>
                <div className="stat-value text-pink-500">{enhancedProfile.nftInteractions.toString()}</div>
                <div className="stat-desc">NFT transactions</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-yellow-500">
                  <StarIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Social Score</div>
                <div className="stat-value text-yellow-500">{enhancedProfile.socialScore.toString()}</div>
                <div className="stat-desc">Reputation points</div>
              </div>

              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-figure text-blue-500">
                  <TrophyIcon className="h-8 w-8" />
                </div>
                <div className="stat-title">Staking Rewards</div>
                <div className="stat-value text-blue-500">{formatBigInt(enhancedProfile.stakingRewards)} ETH</div>
                <div className="stat-desc">Total rewards earned</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
