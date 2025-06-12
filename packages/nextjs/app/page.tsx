"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CreditCardIcon,
  CubeTransparentIcon,
  GlobeAltIcon,
  LockClosedIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AnimatedHero } from "~~/components/AnimatedHero";
import { AnimatedStatsCards } from "~~/components/AnimatedStatsCards";
import { ThreeJSScene } from "~~/components/ThreeJSScene";

/* eslint-disable react/no-unescaped-entities */

const Home: NextPage = () => {
  const { isConnected } = useAccount();

  return (
    <>
      {/* Three.js Background */}
      <ThreeJSScene />

      {/* Animated Hero Section */}
      <AnimatedHero />

      {/* Sophisticated Credit Factors Section */}
      <motion.div
        className="py-20 bg-white/95 backdrop-blur-lg relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 opacity-10"
          animate={{
            background: [
              "radial-gradient(circle at 20% 80%, #3b82f6 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 50%)",
              "radial-gradient(circle at 40% 40%, #10b981 0%, transparent 50%)",
              "radial-gradient(circle at 20% 80%, #3b82f6 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg"
              initial={{ scale: 0.5 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 1, type: "spring", stiffness: 100 }}
              viewport={{ once: true }}
            >
              <span className="text-black">Sophisticated</span>
              <br />
              <span className="text-black">Credit Factors</span>
            </motion.h2>
            <motion.p
              className="text-xl text-black max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
            >
              Revolutionary 7-factor analysis that goes beyond traditional credit scoring.
              <br />
              <span className="text-blue-800 font-bold bg-yellow-200 px-2 py-1 rounded">
                Fair, sophisticated, privacy-preserving.
              </span>
            </motion.p>
          </motion.div>

          <AnimatedStatsCards />
        </div>
      </motion.div>

      {/* Multi-Chain Universal Scoring Section */}
      <motion.div
        className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 40%)",
              "radial-gradient(circle at 80% 70%, #8b5cf6 0%, transparent 40%)",
              "radial-gradient(circle at 50% 50%, #10b981 0%, transparent 40%)",
              "radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 40%)",
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg"
              initial={{ scale: 0.5 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 1, type: "spring", stiffness: 100 }}
              viewport={{ once: true }}
            >
              <span className="text-gray-900">🌐 Universal</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Multi-Chain Credit
              </span>
            </motion.h2>
            <motion.p
              className="text-xl text-gray-700 max-w-4xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
            >
              The world's first <span className="font-bold text-blue-600">Universal Credit Score</span> that aggregates
              your financial behavior across{" "}
              <span className="font-bold text-purple-600">5 major blockchain ecosystems</span>.
              <br />
              <span className="text-green-700 font-semibold bg-green-100 px-3 py-1 rounded-full mt-2 inline-block">
                ✨ Your true multi-chain financial identity, finally unified
              </span>
            </motion.p>
          </motion.div>

          {/* Multi-Chain Benefits Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: "🌐",
                title: "5 Major Blockchains",
                description: "Ethereum, Polygon, Arbitrum, Optimism, and Base all contribute to your Universal Score",
                highlight: "Complete ecosystem coverage",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: "⚖️",
                title: "Weighted Aggregation",
                description:
                  "Each blockchain's contribution is weighted by ecosystem maturity, liquidity, and adoption",
                highlight: "Fair importance weighting",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: "🎯",
                title: "Cross-Chain Bonuses",
                description: "Earn extra points for diversification, consistency, volume, and sophistication",
                highlight: "+50 +30 +25 +15 points",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: "🔄",
                title: "Real-Time Updates",
                description: "LayerZero-powered messaging keeps your Universal Score current across all chains",
                highlight: "Instant synchronization",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: "🔐",
                title: "Privacy Preserved",
                description: "Zero-knowledge proofs work across all chains - your privacy travels with you",
                highlight: "Universal privacy",
                color: "from-indigo-500 to-blue-500",
              },
              {
                icon: "📈",
                title: "Score Enhancement",
                description: "Multi-chain activity typically increases scores by 50-150 points over single-chain",
                highlight: "650 → 769 average boost",
                color: "from-teal-500 to-green-500",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="card bg-white/95 backdrop-blur-lg shadow-xl border border-gray-200 hover:border-gray-300"
                initial={{ opacity: 0, y: 50, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  rotateY: 5,
                  boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
                }}
              >
                <div className="card-body items-center text-center">
                  <motion.div
                    className="text-4xl mb-4"
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 1, delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.2, rotate: 10 }}
                  >
                    {item.icon}
                  </motion.div>
                  <h3 className="card-title text-xl mb-3 text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 mb-3">{item.description}</p>
                  <motion.div
                    className={`badge badge-lg bg-gradient-to-r ${item.color} text-white border-none font-semibold px-3 py-2`}
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.9, 1, 0.9],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.2,
                    }}
                  >
                    {item.highlight}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Weight Explanation Section */}
          <motion.div
            className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-16 border border-blue-200"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h3
              className="text-3xl font-bold text-center mb-6 text-gray-900"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              viewport={{ once: true }}
            >
              🧮 How Chain Weighting Works
            </motion.h3>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <p className="text-lg text-gray-700 mb-4">
                  Your Universal Score isn't just an average - it's a{" "}
                  <span className="font-bold text-blue-600">weighted calculation</span> that reflects each blockchain's
                  real-world importance in the DeFi ecosystem.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="font-semibold text-blue-600 w-24">Why weights?</span>
                    <span className="text-gray-600">
                      Different chains have different levels of maturity, liquidity, and adoption
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-purple-600 w-24">Fair scoring:</span>
                    <span className="text-gray-600">
                      Your Ethereum activity matters more than a newer chain's activity
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold text-green-600 w-24">Future-proof:</span>
                    <span className="text-gray-600">Weights can be updated as the ecosystem evolves</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white rounded-xl p-6 shadow-lg"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <h4 className="text-xl font-bold mb-4 text-gray-900">Chain Weight Breakdown:</h4>
                <div className="space-y-3">
                  {[
                    { name: "Ethereum", weight: "40%", reason: "Largest DeFi ecosystem, highest liquidity" },
                    { name: "Polygon", weight: "25%", reason: "Major DeFi hub, high transaction volume" },
                    { name: "Arbitrum", weight: "20%", reason: "Leading L2, sophisticated DeFi protocols" },
                    { name: "Optimism", weight: "10%", reason: "Growing L2 ecosystem, strong adoption" },
                    { name: "Base", weight: "5%", reason: "Emerging ecosystem, future potential" },
                  ].map((chain, index) => (
                    <motion.div
                      key={index}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      <div>
                        <span className="font-semibold text-gray-900">{chain.name}</span>
                        <p className="text-sm text-gray-600">{chain.reason}</p>
                      </div>
                      <motion.span
                        className="font-bold text-lg text-blue-600"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                      >
                        {chain.weight}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  className="mt-4 pt-3 border-t border-gray-200 text-center"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <span className="text-sm text-gray-600">Total: </span>
                  <span className="font-bold text-green-600">100%</span>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Multi-Chain Visualization */}
          <motion.div
            className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-gray-300"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-3xl font-bold text-center mb-8 text-gray-900">
              🎯 Universal Score Calculation Example
            </h3>
            <div className="grid md:grid-cols-5 gap-6 mb-8">
              {[
                { name: "Ethereum", score: "650", weight: "40%", color: "bg-blue-500" },
                { name: "Polygon", score: "745", weight: "25%", color: "bg-purple-500" },
                { name: "Arbitrum", score: "690", weight: "20%", color: "bg-cyan-500" },
                { name: "Optimism", score: "695", weight: "10%", color: "bg-red-500" },
                { name: "Base", score: "690", weight: "5%", color: "bg-blue-600" },
              ].map((chain, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    className={`w-16 h-16 ${chain.color} rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg`}
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {chain.score}
                  </motion.div>
                  <h4 className="font-semibold text-gray-900">{chain.name}</h4>
                  <p className="text-sm text-gray-600">Weight: {chain.weight}</p>
                </motion.div>
              ))}
            </div>
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-lg text-gray-600 mb-4">
                <span className="font-semibold">Weighted Score:</span> 675 +{" "}
                <span className="font-semibold text-green-600">Cross-Chain Bonuses:</span> +94
              </div>
              <motion.div
                className="text-4xl font-bold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                🎉 Universal Score: 769
              </motion.div>
              <p className="text-sm text-gray-500 mt-2">119-point improvement over single-chain scoring!</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* How It Works Section */}
      <motion.div
        className="py-20 bg-gray-100/95 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16 drop-shadow-lg text-black"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {[
              {
                icon: CreditCardIcon,
                title: "Build Privacy-First Credit",
                description:
                  "Your on-chain activities build your credit profile using zero-knowledge proofs. Financial data stays private.",
                color: "text-primary",
                delay: 0,
              },
              {
                icon: GlobeAltIcon,
                title: "Get Universal Score",
                description:
                  "Aggregate your credit across 5 major blockchains for a true multi-chain financial identity with enhanced scoring.",
                color: "text-secondary",
                delay: 0.15,
              },
              {
                icon: BanknotesIcon,
                title: "Access Dynamic Loans",
                description:
                  "Get competitive rates (3-100%) based on sophisticated behavioral analysis, not wealth. Real-time rate adjustments.",
                color: "text-primary",
                delay: 0.3,
              },
              {
                icon: ChartBarIcon,
                title: "Earn Staking Yield",
                description:
                  "Provide liquidity to the lending pool and earn yield. Help build the future of decentralized credit.",
                color: "text-accent",
                delay: 0.45,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="card bg-white/95 backdrop-blur-lg shadow-xl border border-gray-300"
                initial={{ opacity: 0, y: 50, rotateY: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: item.delay }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  rotateY: 5,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                }}
              >
                <div className="card-body items-center text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 1, delay: item.delay + 0.2, type: "spring", stiffness: 200 }}
                    viewport={{ once: true }}
                  >
                    <item.icon className={`h-16 w-16 ${item.color} mb-4`} />
                  </motion.div>
                  <h3 className="card-title text-xl mb-4">{item.title}</h3>
                  <p className="text-base-content/80">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Revolutionary Features Section */}
      <motion.div
        className="py-20 bg-base-100/90 backdrop-blur-md"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-center mb-16 drop-shadow-lg text-gray-900"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Why Choose <span className="text-blue-900">Privacy-First</span> Credit?
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              {[
                {
                  icon: LockClosedIcon,
                  title: "Zero-Knowledge Privacy",
                  description:
                    "Groth16 ZK-SNARKs keep your financial data cryptographically private. Prove creditworthiness without revealing details.",
                  color: "text-primary",
                },
                {
                  icon: SparklesIcon,
                  title: "Sophisticated Analysis",
                  description:
                    "7-factor behavioral scoring beats traditional 4-factor systems. No wealth bias - pure behavioral assessment.",
                  color: "text-primary",
                },
                {
                  icon: GlobeAltIcon,
                  title: "Global DeFi Access",
                  description:
                    "Available to anyone with an Ethereum wallet. No traditional banking, KYC, or geographic restrictions.",
                  color: "text-accent",
                },
                {
                  icon: CubeTransparentIcon,
                  title: "Transparent & Fair",
                  description:
                    "All algorithms are open-source and immutable on blockchain. Economic honesty - privacy is FREE.",
                  color: "text-info",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex gap-4"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ x: 10 }}
                >
                  <motion.div whileHover={{ rotate: 360, scale: 1.2 }} transition={{ duration: 0.6 }}>
                    <item.icon className={`h-8 w-8 ${item.color} flex-shrink-0 mt-1`} />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-base-content/80">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="bg-base-200/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-base-300/80"
              initial={{ opacity: 0, x: 50, rotateY: -15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              whileHover={{ rotateY: 5, scale: 1.02 }}
            >
              <div className="stats stats-vertical w-full">
                {[
                  {
                    title: "Credit Score Range",
                    value: "300-850",
                    desc: "FICO-compatible scoring",
                    color: "text-primary",
                  },
                  {
                    title: "Interest Rates",
                    value: "3% - 100%",
                    desc: "Dynamic, behavior-based pricing",
                    color: "text-primary",
                  },
                  {
                    title: "Privacy Protection",
                    value: "100%",
                    desc: "Zero-knowledge verification",
                    color: "text-accent",
                  },
                  {
                    title: "Gas Efficiency",
                    value: "~250k",
                    desc: "Optimized for real-world usage",
                    color: "text-info",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    className="stat place-items-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="stat-title text-base-content/70">{stat.title}</div>
                    <motion.div
                      className={`stat-value ${stat.color} text-2xl`}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.5,
                      }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="stat-desc text-sm">{stat.desc}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Call to Action Section */}
      <motion.div
        className="py-20 bg-gradient-to-r from-primary via-secondary to-accent relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              "radial-gradient(circle at 0% 50%, #ffffff 0%, transparent 50%)",
              "radial-gradient(circle at 100% 50%, #ffffff 0%, transparent 50%)",
              "radial-gradient(circle at 50% 0%, #ffffff 0%, transparent 50%)",
              "radial-gradient(circle at 50% 100%, #ffffff 0%, transparent 50%)",
              "radial-gradient(circle at 0% 50%, #ffffff 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-primary-content mb-6 drop-shadow-lg"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Ready to Experience the Future?
          </motion.h2>

          <motion.p
            className="text-xl text-primary-content/90 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Join the revolution in decentralized finance. Build your privacy-first credit profile and access
            sophisticated lending without compromising your financial privacy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            {isConnected ? (
              <Link href="/credit-scoring">
                <motion.button
                  className="btn btn-accent btn-lg gap-3 text-lg px-12 py-4 text-black font-bold"
                  whileHover={{
                    scale: 1.1,
                    boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
                    y: -5,
                  }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(255,255,255,0.3)",
                      "0 0 40px rgba(255,255,255,0.5)",
                      "0 0 20px rgba(255,255,255,0.3)",
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: 2, repeat: Infinity },
                    scale: { type: "spring", stiffness: 300 },
                  }}
                >
                  🚀 Launch Your Credit Journey
                  <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowRightIcon className="h-6 w-6" />
                  </motion.div>
                </motion.button>
              </Link>
            ) : (
              <motion.div
                className="btn btn-accent btn-lg btn-disabled text-lg px-12 text-black"
                animate={{
                  opacity: [0.7, 1, 0.7],
                  scale: [1, 1.02, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Connect Wallet to Begin
              </motion.div>
            )}
          </motion.div>

          {/* Additional CTA elements */}
          <motion.div
            className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            {["🔐 Zero setup fees", "⚡ Instant credit assessment", "🌍 Global accessibility"].map((feature, index) => (
              <motion.div
                key={index}
                className="text-primary-content/90 font-medium"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
              >
                {feature}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default Home;
