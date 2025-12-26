#!/bin/bash

# Compile Circom Circuits and Generate Verifiers
# This script compiles the circom circuits and generates Solidity verifiers

echo "🔧 Compiling ZK Circuits..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Please install:"
    echo "npm install -g circom"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Please install:"
    echo "npm install -g snarkjs"
    exit 1
fi

# Create output directories
mkdir -p build/circuits
mkdir -p build/zkeys
cd circuits

echo "📝 Compiling deposit circuit..."
circom deposit.circom --r1cs --wasm --sym -o ../build/circuits
if [ $? -ne 0 ]; then
    echo "❌ Deposit circuit compilation failed"
    exit 1
fi

echo "📝 Compiling withdraw circuit..."
circom withdraw.circom --r1cs --wasm --sym -o ../build/circuits
if [ $? -ne 0 ]; then
    echo "❌ Withdraw circuit compilation failed"
    exit 1
fi

cd ..

echo "🔑 Setting up Powers of Tau ceremony..."
if [ ! -f build/pot14_final.ptau ]; then
    echo "Generating Powers of Tau (this may take a while)..."
    
    # Start ceremony
    snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
    
    # Contribute randomness
    snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau \
        --name="First contribution" -v -e="random entropy $(date +%s)"
    
    # Prepare phase 2
    snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v
    
    echo "✅ Powers of Tau ceremony completed"
else
    echo "ℹ️  Using existing Powers of Tau file"
fi

echo "🔐 Generating withdraw circuit zkey..."
if [ ! -f build/zkeys/withdraw_final.zkey ]; then
    # Setup
    snarkjs groth16 setup build/circuits/withdraw.r1cs build/pot14_final.ptau build/zkeys/withdraw_0000.zkey
    
    # Contribute to phase 2
    snarkjs zkey contribute build/zkeys/withdraw_0000.zkey build/zkeys/withdraw_0001.zkey \
        --name="Withdraw contribution" -v -e="random entropy $(date +%s)"
    
    # Export verification key
    snarkjs zkey export verificationkey build/zkeys/withdraw_0001.zkey build/zkeys/withdraw_verification_key.json
    
    # Beacon (for production, use real random beacon)
    snarkjs zkey beacon build/zkeys/withdraw_0001.zkey build/zkeys/withdraw_final.zkey \
        0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"
    
    echo "✅ Withdraw zkey generated"
else
    echo "ℹ️  Using existing withdraw zkey"
fi

echo "📄 Exporting Solidity verifier..."
snarkjs zkey export solidityverifier build/zkeys/withdraw_final.zkey contracts/Groth16VerifierGenerated.sol

echo "🎉 Circuit compilation complete!"
echo ""
echo "Generated files:"
echo "  - contracts/Groth16VerifierGenerated.sol (use this in production)"
echo "  - build/circuits/withdraw.wasm (for proof generation)"
echo "  - build/zkeys/withdraw_final.zkey (for proof generation)"
echo ""
echo "Next steps:"
echo "1. Copy build/circuits/withdraw.wasm and build/zkeys/withdraw_final.zkey to public/circuits/"
echo "2. Update FloatingPointProtocol.sol to use Groth16VerifierGenerated"
echo "3. Test with: npm test"
