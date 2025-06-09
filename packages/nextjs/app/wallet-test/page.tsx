"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export default function WalletTestPage() {
  const { address, isConnected, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Test contract read
  const {
    data: creditProfile,
    isLoading,
    error,
  } = useScaffoldReadContract({
    contractName: "ZKCreditScoring",
    functionName: "getCreditProfile",
    args: [address],
  });

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🔧 Wallet Connection Test</h1>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Wallet Status</h2>
            <div className="space-y-2">
              <p>
                <strong>Connected:</strong> {isConnected ? "✅ Yes" : "❌ No"}
              </p>
              <p>
                <strong>Status:</strong> {status}
              </p>
              <p>
                <strong>Address:</strong> {address || "Not connected"}
              </p>
            </div>

            {!isConnected && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Available Connectors:</h3>
                <div className="space-y-2">
                  {connectors.map(connector => (
                    <button
                      key={connector.id}
                      onClick={() => connect({ connector })}
                      className="btn btn-primary btn-sm"
                      disabled={connector.id === "injected" && !window.ethereum}
                    >
                      Connect {connector.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isConnected && (
              <button onClick={() => disconnect()} className="btn btn-secondary btn-sm mt-4">
                Disconnect
              </button>
            )}
          </div>
        </div>

        {address && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contract Data Test</h2>
              <div className="space-y-2">
                <p>
                  <strong>Loading:</strong> {isLoading ? "⏳ Yes" : "✅ No"}
                </p>
                <p>
                  <strong>Error:</strong> {error ? `❌ ${error.message}` : "✅ None"}
                </p>
                <p>
                  <strong>Credit Profile:</strong>
                </p>
                <div className="bg-base-200 p-4 rounded">
                  <pre className="text-sm">{JSON.stringify(creditProfile, null, 2)}</pre>
                </div>

                {creditProfile && (
                  <div className="mt-4 space-y-1">
                    <p>
                      <strong>Is Registered:</strong> {creditProfile[2] ? "✅ Yes" : "❌ No"}
                    </p>
                    <p>
                      <strong>Credit Score:</strong> {creditProfile[0]?.toString() || "N/A"}
                    </p>
                    <p>
                      <strong>Privacy Level:</strong> {creditProfile[3]?.toString() || "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">🔧 Troubleshooting Steps</h2>
            <div className="space-y-2 text-sm">
              <p>1. Make sure MetaMask is installed and unlocked</p>
              <p>2. Add localhost network to MetaMask:</p>
              <ul className="ml-4 list-disc">
                <li>Network Name: Hardhat Local</li>
                <li>RPC URL: http://localhost:8545</li>
                <li>Chain ID: 31337</li>
                <li>Currency Symbol: ETH</li>
              </ul>
              <p>3. Import one of these test accounts:</p>
              <ul className="ml-4 list-disc text-xs">
                <li>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</li>
                <li>0x70997970C51812dc3A010C7d01b50e0d17dc79C8</li>
                <li>0x3071CBb43429a095482a6bdE5bB50564c11E5020</li>
              </ul>
              <p>4. Refresh this page and try connecting again</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
