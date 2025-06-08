import React from "react";
import { CreditCardIcon } from "@heroicons/react/24/outline";

interface CreditScoreDisplayProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  className?: string;
}

export const CreditScoreDisplay: React.FC<CreditScoreDisplayProps> = ({
  score,
  size = "md",
  showBar = true,
  className = "",
}) => {
  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-500";
    if (score >= 700) return "text-blue-500";
    if (score >= 650) return "text-yellow-500";
    if (score >= 600) return "text-orange-500";
    return "text-red-500";
  };

  const getCreditRating = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    if (score >= 600) return "Poor";
    return "Very Poor";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 750) return "bg-green-500";
    if (score >= 700) return "bg-blue-500";
    if (score >= 650) return "bg-yellow-500";
    if (score >= 600) return "bg-orange-500";
    return "bg-red-500";
  };

  const scorePercentage = ((score - 300) / 550) * 100;

  const sizeClasses = {
    sm: {
      scoreText: "text-2xl",
      icon: "h-6 w-6",
      rating: "text-sm",
      bar: "h-2",
    },
    md: {
      scoreText: "text-4xl",
      icon: "h-8 w-8",
      rating: "text-base",
      bar: "h-3",
    },
    lg: {
      scoreText: "text-6xl",
      icon: "h-12 w-12",
      rating: "text-lg",
      bar: "h-4",
    },
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <CreditCardIcon className={`${sizeClasses[size].icon} ${getCreditScoreColor(score)}`} />
        <div className="text-center">
          <div className={`font-bold ${getCreditScoreColor(score)} ${sizeClasses[size].scoreText}`}>{score}</div>
          <div className={`text-base-content/70 ${sizeClasses[size].rating}`}>{getCreditRating(score)}</div>
        </div>
      </div>

      {showBar && (
        <div className="flex-1 max-w-xs">
          <div className="mb-1">
            <div className="flex justify-between text-xs text-base-content/70">
              <span>300</span>
              <span>850</span>
            </div>
          </div>
          <div className={`w-full bg-base-300 rounded-full ${sizeClasses[size].bar}`}>
            <div
              className={`${sizeClasses[size].bar} rounded-full ${getScoreBarColor(score)} transition-all duration-1000`}
              style={{ width: `${Math.max(0, Math.min(100, scorePercentage))}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};
