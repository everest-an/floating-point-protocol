# ZK Proof System Integration Guide

## Overview

FPP now includes a complete zero-knowledge proof system based on Groth16 ZK-SNARKs, replacing the Mock verifiers with production-grade privacy.

## Components

### Smart Contracts

1. **PoseidonHasher.sol** - ZK-friendly hash function
2. **MerkleTreeWithHistory.sol** - Incremental Merkle tree (20 levels, 1M+ capacity)
3. **Groth16Verifier.sol** - ZK-SNARK verifier with pairing operations

### Circom Circuits

1. **deposit.circom** - Proves knowledge of (nullifier, secret) → commitment
2. **withdraw.circom** - Proves Merkle membership + nullifier ownership

### TypeScript Libraries

1. **proof-generator.ts** - Generate proofs using snarkjs
2. **merkle.ts** - Merkle tree operations and proof fetching

## Setup

### 1. Install Dependencies

```bash
# Install circom compiler
npm install -g circom

# Install snarkjs
npm install -g snarkjs

# Install circuit libraries
cd ethereum
npm install circomlib circomlibjs snarkjs
```

### 2. Compile Circuits

```bash
cd ethereum
chmod +x scripts/compile-circuits.sh
./scripts/compile-circuits.sh
```

This generates:

- `build/circuits/withdraw.wasm` - WASM for proof generation
- `build/zkeys/withdraw_final.zkey` - Proving key
- `contracts/Groth16VerifierGenerated.sol` - Solidity verifier

### 3. Copy Circuit Files to Frontend

```bash
mkdir -p ../public/circuits
cp build/circuits/withdraw.wasm ../public/circuits/
cp build/zkeys/withdraw_final.zkey ../public/circuits/
cp build/zkeys/withdraw_verification_key.json ../public/circuits/
```

## Usage

### Deposit with Privacy

```typescript
import { createNote, serializeNote } from '@/lib/zkp/proof-generator';

// Create a new note
const note = await createNote();

// Save note locally (user must keep this!)
localStorage.setItem('note-' + note.commitment, serializeNote(note));

// Deposit on-chain
await contract.deposit(note.commitment, { value: amount });
```

### Withdraw with Zero-Knowledge

```typescript
import { generateWithdrawProof } from '@/lib/zkp/proof-generator';
import { getMerkleProofFromChain } from '@/lib/zkp/merkle';

// Load saved note
const noteString = localStorage.getItem('note-' + commitment);
const note = deserializeNote(noteString);

// Get Merkle proof from events
const merkleProof = await getMerkleProofFromChain(
    note.commitment,
    provider,
    contractAddress
);

// Generate ZK proof
const { proof, args } = await generateWithdrawProof(
    note,
    recipientAddress,
    relayerAddress,
    feeAmount,
    0, // refund
    merkleProof
);

// Submit withdrawal
await contract.withdraw(
    proof.a,
    proof.b,
    proof.c,
    args.root,
    args.nullifierHash,
    args.recipient,
    args.relayer,
    args.fee,
    args.refund
);
```

## Security Considerations

### Trusted Setup

The Powers of Tau ceremony in `compile-circuits.sh` is for TESTING ONLY.

**For production**, you MUST:

1. Use a multi-party computation (MPC) ceremony
2. Involve multiple independent participants
3. Destroy all toxic waste securely
4. Publish ceremony transcript

Resources:

- <https://ceremony.tornado.cash/> (example)
- <https://github.com/weijiekoh/perpetualpowersoftau>

### Note Storage

Users must securely store their notes (nullifier, secret):

- Browser LocalStorage (⚠️ vulnerable to XSS)
- Browser Extension (better)
- Hardware wallet (best)
- Encrypted backup

**If note is lost, funds are PERMANENTLY UNRECOVERABLE.**

### Relayer System

For full privacy, withdrawals should use relayers:

1. User generates proof off-chain
2. Sends proof + fee to relayer
3. Relayer submits on-chain
4. User's address never linked to withdrawal

## Testing

```typescript
// ethereum/test/zk-proof.test.ts
describe("ZK Proof System", () => {
    it("should deposit with commitment", async () => {
        const note = await createNote();
        await fpp.deposit(note.commitment);
        // Verify commitment in tree
    });
    
    it("should withdraw with valid proof", async () => {
        // Deposit first
        const note = await createNote();
        await fpp.deposit(note.commitment);
        
        // Build Merkle proof
        const merkleProof = await getMerkleProof(note.commitment);
        
        // Generate ZK proof
        const { proof } = await generateWithdrawProof(...);
        
        // Withdraw
        await fpp.withdraw(proof.a, proof.b, proof.c, ...);
    });
    
    it("should reject invalid proof", async () => {
        const fakeProof = { a: [0,0], b: [[0,0],[0,0]], c: [0,0] };
        await expect(
            fpp.withdraw(fakeProof.a, ...)
        ).to.be.revertedWith("Invalid proof");
    });
});
```

## Gas Costs

Approximate gas costs:

- Deposit: ~200k gas
- Withdraw (with ZK verification): ~600k gas
- Merkle root update: ~50k gas per insertion

## Circuit Parameters

- **Merkle Tree Levels**: 20 (supports 2^20 = 1,048,576 deposits)
- **Field Size**: ~254 bits (BN128 curve)
- **Proof Size**: 3 G1 points + 1 G2 point (~512 bytes)

## Troubleshooting

### "Proof generation taking too long"

Proof generation is CPU-intensive:

- Use Web Workers in browser
- Show progress indicator to user
- Optimize circuit (reduce constraints)

### "Invalid proof" on-chain

Check:

1. Public inputs match exactly
2. Merkle root is known (in history)
3. Nullifier not already used
4. Circuit compiled correctly

### "Powers of Tau not found"

Re-run compile script:

```bash
cd ethereum
rm -rf build
./scripts/compile-circuits.sh
```

## Next Steps

1. ✅ Basic ZK system implemented
2. [ ] Add relayer infrastructure
3. [ ] Implement multi-asset support
4. [ ] Add recursive proofs (Halo2/Plonky2)
5. [ ] Professional trusted setup ceremony
6. [ ] Circuit audit by ZK security firm

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Guide](https://github.com/iden3/snarkjs)
- [Tornado Cash Circuits](https://github.com/tornadocash/tornado-core)
- [ZK Security Best Practices](https://www.zellic.io/blog/zk-security-checklist)
