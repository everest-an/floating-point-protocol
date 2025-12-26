/**
 * ZK Proof Generator for FPP
 * Generates zero-knowledge proofs for deposits and withdrawals
 */

import { groth16 } from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';

let poseidonHash: any = null;

/**
 * Initialize Poseidon hasher
 */
async function getPoseidon() {
    if (!poseidonHash) {
        poseidonHash = await buildPoseidon();
    }
    return poseidonHash;
}

/**
 * Convert BigInt to hex string for Solidity
 */
function toHex(number: bigint, length = 32): string {
    const str = number.toString(16).padStart(length * 2, '0');
    return '0x' + str;
}

/**
 * Generate random BigInt for nullifier/secret
 */
export function randomBigInt(): bigint {
    const bytes = new Uint8Array(31);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(bytes);
    } else {
        // Node.js
        const crypto = require('crypto');
        crypto.randomFillSync(bytes);
    }

    let hex = '0x';
    bytes.forEach(b => {
        hex += b.toString(16).padStart(2, '0');
    });

    return BigInt(hex);
}

/**
 * Compute Poseidon hash of 2 elements
 */
export async function poseidon2(inputs: [bigint, bigint]): Promise<bigint> {
    const poseidon = await getPoseidon();
    const hash = poseidon.F.toString(poseidon(inputs));
    return BigInt(hash);
}

/**
 * Compute commitment = Poseidon(nullifier, secret)
 */
export async function computeCommitment(nullifier: bigint, secret: bigint): Promise<bigint> {
    return await poseidon2([nullifier, secret]);
}

/**
 * Compute nullifier hash = Poseidon(nullifier, nullifier)
 */
export async function computeNullifierHash(nullifier: bigint): Promise<bigint> {
    return await poseidon2([nullifier, nullifier]);
}

/**
 * Note structure for saving deposit information
 */
export interface Note {
    nullifier: bigint;
    secret: bigint;
    commitment: bigint;
    nullifierHash: bigint;
}

/**
 * Create a new note for deposit
 */
export async function createNote(): Promise<Note> {
    const nullifier = randomBigInt();
    const secret = randomBigInt();
    const commitment = await computeCommitment(nullifier, secret);
    const nullifierHash = await computeNullifierHash(nullifier);

    return {
        nullifier,
        secret,
        commitment,
        nullifierHash
    };
}

/**
 * Serialize note to string for storage
 */
export function serializeNote(note: Note): string {
    return JSON.stringify({
        nullifier: note.nullifier.toString(),
        secret: note.secret.toString(),
        commitment: note.commitment.toString(),
        nullifierHash: note.nullifierHash.toString()
    });
}

/**
 * Deserialize note from string
 */
export function deserializeNote(noteString: string): Note {
    const parsed = JSON.parse(noteString);
    return {
        nullifier: BigInt(parsed.nullifier),
        secret: BigInt(parsed.secret),
        commitment: BigInt(parsed.commitment),
        nullifierHash: BigInt(parsed.nullifierHash)
    };
}

/**
 * Merkle proof structure
 */
export interface MerkleProof {
    root: bigint;
    pathElements: bigint[];
    pathIndices: number[];
    leaf: bigint;
}

/**
 * Format proof for Solidity verifier
 */
function formatProofForSolidity(proof: any, publicSignals: string[]) {
    const proofProcessed = unstringifyBigInts(proof);
    const pubProcessed = unstringifyBigInts(publicSignals);

    return {
        a: [proofProcessed.pi_a[0], proofProcessed.pi_a[1]],
        b: [
            [proofProcessed.pi_b[0][1], proofProcessed.pi_b[0][0]],
            [proofProcessed.pi_b[1][1], proofProcessed.pi_b[1][0]]
        ],
        c: [proofProcessed.pi_c[0], proofProcessed.pi_c[1]],
        input: pubProcessed
    };
}

function unstringifyBigInts(o: any): any {
    if (typeof o === 'string' && /^[0-9]+$/.test(o)) {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o === 'object' && o !== null) {
        const res: any = {};
        Object.keys(o).forEach(k => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    }
    return o;
}

/**
 * Generate deposit proof (for debugging, not needed on-chain)
 */
export async function generateDepositProof(nullifier: bigint, secret: bigint) {
    const input = {
        nullifier: nullifier.toString(),
        secret: secret.toString()
    };

    const { proof, publicSignals } = await groth16.fullProve(
        input,
        '/circuits/deposit.wasm',
        '/circuits/deposit_final.zkey'
    );

    const commitment = BigInt(publicSignals[0]);

    return { proof, publicSignals, commitment };
}

/**
 * Generate withdraw proof
 */
export async function generateWithdrawProof(
    note: Note,
    recipient: string,
    relayer: string,
    fee: bigint,
    refund: bigint,
    merkleProof: MerkleProof
): Promise<{
    proof: { a: any; b: any; c: any; input: any[] };
    args: {
        root: string;
        nullifierHash: string;
        recipient: string;
        relayer: string;
        fee: string;
        refund: string;
    };
}> {
    const input = {
        // Public inputs
        root: merkleProof.root.toString(),
        nullifierHash: note.nullifierHash.toString(),
        recipient: BigInt(recipient).toString(),
        relayer: BigInt(relayer).toString(),
        fee: fee.toString(),
        refund: refund.toString(),

        // Private inputs
        nullifier: note.nullifier.toString(),
        secret: note.secret.toString(),
        pathElements: merkleProof.pathElements.map(x => x.toString()),
        pathIndices: merkleProof.pathIndices
    };

    console.log('Generating proof with input:', input);

    const { proof, publicSignals } = await groth16.fullProve(
        input,
        '/circuits/withdraw.wasm',
        '/circuits/withdraw_final.zkey'
    );

    const formatted = formatProofForSolidity(proof, publicSignals);

    return {
        proof: formatted,
        args: {
            root: toHex(merkleProof.root),
            nullifierHash: toHex(note.nullifierHash),
            recipient: recipient,
            relayer: relayer,
            fee: fee.toString(),
            refund: refund.toString()
        }
    };
}

/**
 * Verify proof locally before submitting to chain
 */
export async function verifyProof(
    proof: any,
    publicSignals: string[]
): Promise<boolean> {
    const vKey = await fetch('/circuits/withdraw_verification_key.json').then(r => r.json());
    return await groth16.verify(vKey, publicSignals, proof);
}
