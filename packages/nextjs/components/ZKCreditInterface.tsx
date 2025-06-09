import React from "react";

export const ZKCreditInterface: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">ZK Credit System</h1>
          <p className="text-xl text-base-content/70">
            Privacy-preserving credit scoring with zero-knowledge proofs
          </p>
        </div>
        
        <div className="bg-base-100 rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
            <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
            <p className="text-base-content/70 mb-6">
              The ZK Credit interface is currently under development. This will allow you to:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-500">🔒</span>
                  <div>
                    <h3 className="font-semibold">Private Credit Proofs</h3>
                    <p className="text-sm text-base-content/70">
                      Generate zero-knowledge proofs of your creditworthiness without revealing sensitive data
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-blue-500">⚡</span>
                  <div>
                    <h3 className="font-semibold">Instant Verification</h3>
                    <p className="text-sm text-base-content/70">
                      Verify credit scores and loan eligibility without exposing transaction history
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-purple-500">🌐</span>
                  <div>
                    <h3 className="font-semibold">Cross-Platform</h3>
                    <p className="text-sm text-base-content/70">
                      Use your ZK credit proofs across different DeFi protocols and platforms
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-orange-500">🛡️</span>
                  <div>
                    <h3 className="font-semibold">Maximum Privacy</h3>
                    <p className="text-sm text-base-content/70">
                      Your financial data remains completely private while still proving creditworthiness
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-info/10 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-info">ℹ️</span>
                <span className="font-semibold text-info">Development Status</span>
              </div>
              <p className="text-sm text-info">
                This feature is currently in development. Please use the main Credit Scoring page for now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 