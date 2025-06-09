"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CreditCardIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";


const Home: NextPage = () => {
  const { address: connectedAddress, isConnected } = useAccount();

  return (
    <>
      {/* Hero Section */}
      <div className="hero min-h-screen bg-gradient-to-br from-primary/20 via-base-100 to-secondary/20">
        <div className="hero-content text-center">
          <div className="max-w-4xl">
            <h1 className="text-6xl font-bold mb-6">
              <span className="text-primary">On-Chain</span> Credit Protocol
            </h1>
            <p className="text-xl mb-8 text-base-content/80 max-w-2xl mx-auto">
              Build your creditworthiness using blockchain data. Access DeFi lending without traditional financial
              history.
            </p>

            {isConnected ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 bg-base-200 p-4 rounded-xl">
                  <span className="text-sm font-medium">Connected:</span>
                  <Address address={connectedAddress} />
                </div>
                <div className="flex gap-4">
                  <Link href="/zk-credit" className="btn btn-primary btn-lg gap-2">
                    🔐 ZK Privacy Credit
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                  <Link href="/credit-scoring" className="btn btn-outline btn-lg gap-2">
                    Legacy System
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-base-content/60">Connect your wallet to get started</p>
                <div className="btn btn-primary btn-lg btn-disabled">Connect Wallet to Continue</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-base-200">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <CreditCardIcon className="h-16 w-16 text-primary mb-4" />
                <h3 className="card-title">Build Credit Score</h3>
                <p>
                  Your on-chain activities automatically build your credit profile based on transaction history, account
                  age, and DeFi engagement.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <BanknotesIcon className="h-16 w-16 text-secondary mb-4" />
                <h3 className="card-title">Access Loans</h3>
                <p>
                  Get competitive interest rates (3-20%) based on your credit score. No traditional credit checks
                  required.
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <ChartBarIcon className="h-16 w-16 text-accent mb-4" />
                <h3 className="card-title">Earn Yield</h3>
                <p>
                  Stake ETH to boost your credit score and provide liquidity to earn lending fees from the protocol.
                </p>
              </div>
            </div>
          </div>

          {/* Credit Score Factors */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="text-2xl font-bold text-center mb-8">Credit Score Factors</h3>
              <div className="grid md:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="radial-progress text-primary mb-2" style={{ "--value": 30 } as any}>
                    30%
                  </div>
                  <p className="font-semibold">Repayment History</p>
                  <p className="text-sm text-base-content/70">Most important factor</p>
                </div>
                <div className="text-center">
                  <div className="radial-progress text-secondary mb-2" style={{ "--value": 25 } as any}>
                    25%
                  </div>
                  <p className="font-semibold">Transaction Volume</p>
                  <p className="text-sm text-base-content/70">Total ETH moved</p>
                </div>
                <div className="text-center">
                  <div className="radial-progress text-accent mb-2" style={{ "--value": 20 } as any}>
                    20%
                  </div>
                  <p className="font-semibold">Activity Frequency</p>
                  <p className="text-sm text-base-content/70">Regular usage</p>
                </div>
                <div className="text-center">
                  <div className="radial-progress text-info mb-2" style={{ "--value": 15 } as any}>
                    15%
                  </div>
                  <p className="font-semibold">Account Age</p>
                  <p className="text-sm text-base-content/70">Time on blockchain</p>
                </div>
                <div className="text-center">
                  <div className="radial-progress text-warning mb-2" style={{ "--value": 10 } as any}>
                    10%
                  </div>
                  <p className="font-semibold">Staking Amount</p>
                  <p className="text-sm text-base-content/70">ETH staked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-base-100">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose On-Chain Credit?</h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <ShieldCheckIcon className="h-8 w-8 text-success flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Decentralized & Transparent</h3>
                  <p className="text-base-content/80">
                    All scoring algorithms and lending rules are transparent and immutable on the blockchain.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <GlobeAltIcon className="h-8 w-8 text-info flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Global Access</h3>
                  <p className="text-base-content/80">
                    Available to anyone with an Ethereum wallet, regardless of location or traditional banking access.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckBadgeIcon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Privacy-First</h3>
                  <p className="text-base-content/80">
                    No personal information required. Your wallet activity speaks for itself.
                  </p>
                </div>
              </div>
            </div>

            <div className="stats stats-vertical shadow-xl">
              <div className="stat">
                <div className="stat-title">Credit Score Range</div>
                <div className="stat-value text-primary">300-850</div>
                <div className="stat-desc">Similar to traditional FICO</div>
              </div>

              <div className="stat">
                <div className="stat-title">Interest Rates</div>
                <div className="stat-value text-secondary">3% - 20%</div>
                <div className="stat-desc">Based on credit score</div>
              </div>

              <div className="stat">
                <div className="stat-title">Loan Term</div>
                <div className="stat-value text-accent">30 Days</div>
                <div className="stat-desc">Fixed term loans</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-primary-content mb-6">Ready to Build Your Credit?</h2>
          <p className="text-xl text-primary-content/80 mb-8 max-w-2xl mx-auto">
            Join the future of decentralized finance and start building your on-chain credit profile today.
          </p>

          {isConnected ? (
            <Link href="/credit-scoring" className="btn btn-accent btn-lg gap-2">
              Get Started Now
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          ) : (
            <div className="btn btn-accent btn-lg btn-disabled">Connect Wallet to Start</div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;
