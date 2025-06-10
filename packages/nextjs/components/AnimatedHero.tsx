"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const floatingVariants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export function AnimatedHero() {
  const { address: connectedAddress, isConnected } = useAccount();

  return (
    <div className="hero min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-base-100 to-secondary/20"
        animate={{
          background: [
            "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.2))",
            "linear-gradient(45deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1))",
            "linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="hero-content text-center z-10 relative">
        <motion.div className="max-w-6xl" variants={containerVariants} initial="hidden" animate="visible">
          {/* Main title with typewriter effect */}
          <motion.h1 className="text-7xl md:text-8xl font-bold mb-6" variants={itemVariants}>
            <motion.span
              className="text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Privacy-First
            </motion.span>
            <br />
            <motion.span
              className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 1 }}
            >
              Credit Protocol
            </motion.span>
          </motion.h1>

          {/* Animated subtitle */}
          <motion.div
            className="text-xl md:text-2xl mb-8 text-base-content/80 max-w-4xl mx-auto"
            variants={itemVariants}
          >
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.5 }}>
              The first{" "}
              <motion.span
                className="text-primary font-semibold"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                zero-knowledge
              </motion.span>{" "}
              credit scoring system for DeFi.
            </motion.p>
            <motion.p
              className="mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2 }}
            >
              Sophisticated 7-factor analysis • Complete financial privacy • No wealth bias
            </motion.p>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
            variants={containerVariants}
          >
            {[
              { emoji: "🔐", title: "Privacy by Default", desc: "ZK-SNARKs keep your data private" },
              { emoji: "🧠", title: "Sophisticated Scoring", desc: "7 factors vs traditional 4" },
              { emoji: "⚡", title: "Gas Optimized", desc: "250k gas vs 2M+ alternatives" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-base-100/50 backdrop-blur-sm rounded-2xl p-6 border border-base-300/30"
                variants={itemVariants}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  className="text-4xl mb-3"
                  variants={floatingVariants}
                  animate="animate"
                  style={{ animationDelay: `${index * 0.5}s` }}
                >
                  {feature.emoji}
                </motion.div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-base-content/70 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Call to action */}
          <motion.div variants={itemVariants}>
            {isConnected ? (
              <motion.div
                className="flex flex-col items-center gap-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 2.5 }}
              >
                <motion.div
                  className="flex items-center gap-3 bg-base-100/80 backdrop-blur-sm p-4 rounded-2xl border border-base-300/50"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="text-sm font-medium">Connected:</span>
                  <Address address={connectedAddress} />
                  <motion.div
                    className="w-3 h-3 bg-green-500 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.8, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>

                <Link href="/credit-scoring">
                  <motion.button
                    className="btn btn-primary btn-lg gap-3 text-lg px-8 py-4"
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 10px 30px rgba(59, 130, 246, 0.3)",
                    }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 3 }}
                  >
                    🔐 Experience Privacy-First Credit
                    <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ArrowRightIcon className="h-6 w-6" />
                    </motion.div>
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 2.5 }}
              >
                <motion.p
                  className="text-base-content/60 text-lg"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Connect your wallet to unlock the future of DeFi credit
                </motion.p>
                <motion.div
                  className="btn btn-primary btn-lg btn-disabled text-lg px-8"
                  animate={{
                    background: ["#6366f1", "#8b5cf6", "#6366f1"],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Connect Wallet to Continue
                </motion.div>
              </motion.div>
            )}
          </motion.div>

          {/* Floating stats */}
          <motion.div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto" variants={containerVariants}>
            {[
              { value: "750+", label: "Credit Score Range" },
              { value: "3%", label: "Lowest Interest Rate" },
              { value: "100%", label: "Privacy Protection" },
            ].map((stat, index) => (
              <motion.div key={index} className="text-center" variants={itemVariants} whileHover={{ scale: 1.1 }}>
                <motion.div
                  className="text-3xl font-bold text-primary mb-2"
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
                <div className="text-base-content/70 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
