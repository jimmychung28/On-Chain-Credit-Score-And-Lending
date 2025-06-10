"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BuildingLibraryIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface StatCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string;
  description: string;
  color: string;
  delay: number;
}

function StatCard({ icon: Icon, title, value, description, color, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      whileHover={{
        scale: 1.05,
        rotateY: 5,
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      }}
      className="bg-base-100/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-base-300/50"
    >
      <motion.div
        initial={{ rotate: 0 }}
        whileHover={{ rotate: 10 }}
        transition={{ duration: 0.3 }}
        className={`${color} mb-4`}
      >
        <Icon className="h-12 w-12" />
      </motion.div>

      <motion.h3
        className="text-xl font-bold mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
      >
        {title}
      </motion.h3>

      <motion.div
        className={`text-3xl font-bold mb-2 ${color}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.4, type: "spring", stiffness: 200 }}
      >
        {value}
      </motion.div>

      <motion.p
        className="text-base-content/70 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.6 }}
      >
        {description}
      </motion.p>
    </motion.div>
  );
}

export function AnimatedStatsCards() {
  const stats = [
    {
      icon: ChartBarIcon,
      title: "Transactional Behavior",
      value: "20%",
      description: "Volume, frequency & account maturity analysis",
      color: "text-blue-500",
      delay: 0,
    },
    {
      icon: ShieldCheckIcon,
      title: "Behavioral Patterns",
      value: "15%",
      description: "Gas efficiency & protocol diversity",
      color: "text-purple-500",
      delay: 0.1,
    },
    {
      icon: CurrencyDollarIcon,
      title: "Asset Management",
      value: "15%",
      description: "Portfolio diversity & holding patterns",
      color: "text-green-500",
      delay: 0.2,
    },
    {
      icon: BuildingLibraryIcon,
      title: "DeFi Participation",
      value: "20%",
      description: "Liquidity provision & staking rewards",
      color: "text-orange-500",
      delay: 0.3,
    },
    {
      icon: TrophyIcon,
      title: "Repayment History",
      value: "20%",
      description: "Loan performance & credit reliability",
      color: "text-emerald-500",
      delay: 0.4,
    },
    {
      icon: UsersIcon,
      title: "Governance",
      value: "5%",
      description: "DAO participation & voting activity",
      color: "text-indigo-500",
      delay: 0.5,
    },
    {
      icon: StarIcon,
      title: "Social Reputation",
      value: "5%",
      description: "Attestations & community standing",
      color: "text-pink-500",
      delay: 0.6,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
