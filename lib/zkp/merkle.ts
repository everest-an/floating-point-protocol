/**
 * Merkle Tree utilities for FPP
 * Helps generate Merkle proofs for withdrawals
 */

import { poseidon2 } from './proof-generator';

const ZERO_VALUE = 21663839004416932945382355908790599225266501822907911457504978515578255421292n;
const LEVELS = 20;

/**
 * Compute zero value for a specific level
 */
export async function getZeroHash(level: number): Promise<bigint> {
    if (level === 0) return ZERO_VALUE;

    const precomputed: bigint[] = [
        ZERO_VALUE,
        0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6cn,
        0x256a6135777eee2fd26f54b8b7037a25439d5235caee224154186d2b8a52e31dn,
        0x1151949895e82ab19924de92c40a3d6f7bcb60d92b00504b8199613683f0c200n,
        0x20121ee811489ff8d61f09fb89e313f14959a0f28bb428a20dba6b0b068b3bdbn,
        // ... more levels
    ];

    if (level < precomputed.length) {
        return precomputed[level];
    }

    // Compute if not precomputed
    let current = ZERO_VALUE;
    for (let i = 0; i < level; i++) {
        current = await poseidon2([current, current]);
    }
    return current;
}

/**
 * Merkle tree node
 */
export interface MerkleNode {
    left: MerkleNode | null;
    right: MerkleNode | null;
    value: bigint;
}

/**
 * Simple Merkle tree implementation (client-side)
 */
export class MerkleTree {
    private levels: number;
    private leaves: bigint[];
    private zeros: bigint[];

    constructor(levels: number = LEVELS) {
        this.levels = levels;
        this.leaves = [];
        this.zeros = [];
    }

    async initialize() {
        for (let i = 0; i <= this.levels; i++) {
            this.zeros[i] = await getZeroHash(i);
        }
    }

    /**
     * Insert a leaf
     */
    insert(leaf: bigint) {
        this.leaves.push(leaf);
    }

    /**
     * Get Merkle root
     */
    async getRoot(): Promise<bigint> {
        if (this.leaves.length === 0) {
            return this.zeros[this.levels];
        }

        let currentLevel = [...this.leaves];

        for (let level = 0; level < this.levels; level++) {
            const nextLevel: bigint[] = [];

            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length
                    ? currentLevel[i + 1]
                    : this.zeros[level];

                const parent = await poseidon2([left, right]);
                nextLevel.push(parent);
            }

            // Fill remaining with zeros
            while (nextLevel.length < Math.pow(2, this.levels - level - 1)) {
                nextLevel.push(this.zeros[level + 1]);
            }

            currentLevel = nextLevel;
        }

        return currentLevel[0];
    }

    /**
     * Get Merkle proof for a leaf
     */
    async getProof(leafIndex: number): Promise<{
        pathElements: bigint[];
        pathIndices: number[];
    }> {
        if (leafIndex >= this.leaves.length) {
            throw new Error('Leaf index out of bounds');
        }

        const pathElements: bigint[] = [];
        const pathIndices: number[] = [];

        let currentIndex = leafIndex;
        let currentLevel = [...this.leaves];

        for (let level = 0; level < this.levels; level++) {
            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

            const sibling = siblingIndex < currentLevel.length
                ? currentLevel[siblingIndex]
                : this.zeros[level];

            pathElements.push(sibling);
            pathIndices.push(isLeft ? 0 : 1);

            // Move to next level
            const nextLevel: bigint[] = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length
                    ? currentLevel[i + 1]
                    : this.zeros[level];

                nextLevel.push(await poseidon2([left, right]));
            }

            currentLevel = nextLevel;
            currentIndex = Math.floor(currentIndex / 2);
        }

        return { pathElements, pathIndices };
    }

    /**
     * Verify a Merkle proof
     */
    async verifyProof(
        leaf: bigint,
        proof: { pathElements: bigint[]; pathIndices: number[] },
        root: bigint
    ): Promise<boolean> {
        let current = leaf;

        for (let i = 0; i < proof.pathElements.length; i++) {
            const sibling = proof.pathElements[i];
            const isLeft = proof.pathIndices[i] === 0;

            current = isLeft
                ? await poseidon2([current, sibling])
                : await poseidon2([sibling, current]);
        }

        return current === root;
    }
}

/**
 * Fetch Merkle proof from on-chain events
 */
export async function getMerkleProofFromChain(
    commitment: bigint,
    provider: any,
    contractAddress: string
): Promise<{
    root: bigint;
    pathElements: bigint[];
    pathIndices: number[];
}> {
    // Query CommitmentInserted events
    const contract = new provider.eth.Contract(
        [{ /* ABI */ }],
        contractAddress
    );

    const events = await contract.getPastEvents('CommitmentInserted', {
        fromBlock: 0,
        toBlock: 'latest'
    });

    // Find leaf index
    const leafIndex = events.findIndex(
        e => BigInt(e.returnValues.commitment) === commitment
    );

    if (leafIndex === -1) {
        throw new Error('Commitment not found');
    }

    // Rebuild tree from events
    const tree = new MerkleTree(LEVELS);
    await tree.initialize();

    for (const event of events) {
        tree.insert(BigInt(event.returnValues.commitment));
    }

    // Get proof
    const proof = await tree.getProof(leafIndex);
    const root = await tree.getRoot();

    return {
        root,
        pathElements: proof.pathElements,
        pathIndices: proof.pathIndices
    };
}
