#!/bin/bash

# Circom Circuit Compilation Script
# This script compiles the credit score ZK circuit

set -e

echo "🏗️  Compiling ZK Credit Score Circuit..."

# Create build directory if it doesn't exist
mkdir -p build

# Compile the circuit
echo "📦 Compiling circuit..."
circom src/credit_score.circom --r1cs --wasm --sym -o build/

# Download powers of tau file (needed for trusted setup)
echo "⬇️  Downloading powers of tau..."
if [ ! -f "ptau/powersOfTau28_hez_final_14.ptau" ]; then
    mkdir -p ptau
    cd ptau
    curl -L https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau -o powersOfTau28_hez_final_14.ptau
    cd ..
fi

# Generate circuit-specific setup
echo "🔑 Generating trusted setup..."
cd build
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v -e="some_random_text"
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup credit_score.r1cs pot14_final.ptau credit_score_0000.zkey
snarkjs zkey contribute credit_score_0000.zkey credit_score_0001.zkey --name="1st Contributor Name" -v -e="Another random entropy"
snarkjs zkey export verificationkey credit_score_0001.zkey verification_key.json

echo "✅ Circuit compilation complete!"
echo "📁 Files generated:"
echo "   - build/credit_score.r1cs (R1CS constraint system)"
echo "   - build/credit_score_js/ (WASM files)"
echo "   - build/credit_score_0001.zkey (Proving key)"
echo "   - build/verification_key.json (Verification key)" 