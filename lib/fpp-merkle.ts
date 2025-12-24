// Merkle Tree Implementation for FPP
// 用于验证点的存在性和生成包含证明

import { keccak256, toHex } from "./fpp-hash"

// ============ Helper Functions ============

function toBytes32(input: string): `0x${string}` {
  // If already a valid bytes32 hex string (0x + 64 hex chars = 66 chars total)
  if (input.startsWith("0x") && input.length === 66) {
    return input as `0x${string}`
  }

  // If hex string but wrong length, hash it to get exactly 32 bytes
  if (input.startsWith("0x")) {
    // Hash the hex string to normalize to 32 bytes
    return keccak256(input as `0x${string}`)
  }

  // For non-hex strings, convert to hex first then hash
  return keccak256(toHex(input))
}

function safeHashPair(left: string, right: string): string {
  const a = toBytes32(left)
  const b = toBytes32(right)
  // Sort for consistent ordering
  const [first, second] = a < b ? [a, b] : [b, a]
  // Concatenate and hash
  const concatenated = (first + second.slice(2)) as `0x${string}`
  return keccak256(concatenated)
}

// ============ Merkle Tree ============

export interface MerkleProof {
  root: string
  leaf: string
  path: string[]
  indices: number[] // 0 = left, 1 = right
}

export class MerkleTree {
  private leaves: string[]
  private layers: string[][]

  constructor(leaves: string[]) {
    this.leaves = leaves.map((leaf) => toBytes32(leaf))

    // Ensure even number of leaves
    if (this.leaves.length % 2 !== 0) {
      this.leaves.push(this.leaves[this.leaves.length - 1])
    }
    this.layers = this.buildLayers()
  }

  private hashPair(left: string, right: string): string {
    return safeHashPair(left, right)
  }

  private buildLayers(): string[][] {
    const layers: string[][] = [this.leaves]

    while (layers[layers.length - 1].length > 1) {
      const currentLayer = layers[layers.length - 1]
      const newLayer: string[] = []

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i]
        const right = currentLayer[i + 1] || currentLayer[i]
        newLayer.push(this.hashPair(left, right))
      }

      layers.push(newLayer)
    }

    return layers
  }

  getRoot(): string {
    return this.layers[this.layers.length - 1][0]
  }

  getProof(leaf: string): MerkleProof | null {
    const normalizedLeaf = toBytes32(leaf)
    let index = this.leaves.indexOf(normalizedLeaf)
    if (index === -1) return null

    const path: string[] = []
    const indices: number[] = []

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i]
      const isRightNode = index % 2 === 1
      const siblingIndex = isRightNode ? index - 1 : index + 1

      if (siblingIndex < layer.length) {
        path.push(layer[siblingIndex])
        indices.push(isRightNode ? 0 : 1)
      }

      index = Math.floor(index / 2)
    }

    return {
      root: this.getRoot(),
      leaf: normalizedLeaf,
      path,
      indices,
    }
  }

  static verifyProof(proof: MerkleProof): boolean {
    let hash = toBytes32(proof.leaf)

    for (let i = 0; i < proof.path.length; i++) {
      const sibling = proof.path[i]
      if (proof.indices[i] === 0) {
        // Sibling is on the left
        hash = safeHashPair(sibling, hash)
      } else {
        // Sibling is on the right
        hash = safeHashPair(hash, sibling)
      }
    }

    return hash === proof.root
  }
}

// ============ Commitment Merkle Tree ============
// 专门用于管理点承诺的Merkle树

export class CommitmentTree {
  private tree: MerkleTree
  private commitments: Map<string, { pointId: string; index: number }>

  constructor() {
    this.commitments = new Map()
    const genesisHash = keccak256(toHex("fpp-genesis-commitment"))
    this.tree = new MerkleTree([genesisHash])
  }

  addCommitment(pointId: string, commitment: string): number {
    const normalizedCommitment = toBytes32(commitment)
    const index = this.commitments.size
    this.commitments.set(normalizedCommitment, { pointId, index })

    // Rebuild tree with new commitment
    const allCommitments = Array.from(this.commitments.keys())
    this.tree = new MerkleTree(allCommitments)

    return index
  }

  getRoot(): string {
    return this.tree.getRoot()
  }

  getProof(commitment: string): MerkleProof | null {
    const normalizedCommitment = toBytes32(commitment)
    return this.tree.getProof(normalizedCommitment)
  }

  hasCommitment(commitment: string): boolean {
    const normalizedCommitment = toBytes32(commitment)
    return this.commitments.has(normalizedCommitment)
  }

  getCommitmentInfo(commitment: string): { pointId: string; index: number } | undefined {
    const normalizedCommitment = toBytes32(commitment)
    return this.commitments.get(normalizedCommitment)
  }

  verify(proof: MerkleProof): boolean {
    return MerkleTree.verifyProof(proof)
  }

  size(): number {
    return this.commitments.size
  }
}

// ============ Nullifier Set with Merkle Proof ============

export class NullifierTree {
  private nullifiers: Set<string>
  private tree: MerkleTree | null

  constructor() {
    this.nullifiers = new Set()
    this.tree = null
  }

  addNullifier(nullifier: string): boolean {
    const normalizedNullifier = toBytes32(nullifier)
    if (this.nullifiers.has(normalizedNullifier)) {
      return false // Double spend detected
    }
    this.nullifiers.add(normalizedNullifier)

    // Rebuild tree
    if (this.nullifiers.size > 0) {
      this.tree = new MerkleTree(Array.from(this.nullifiers))
    }

    return true
  }

  hasNullifier(nullifier: string): boolean {
    const normalizedNullifier = toBytes32(nullifier)
    return this.nullifiers.has(normalizedNullifier)
  }

  getRoot(): string | null {
    return this.tree?.getRoot() || null
  }

  getNonMembershipProof(nullifier: string): { isSpent: boolean; root: string | null } {
    const normalizedNullifier = toBytes32(nullifier)
    return {
      isSpent: this.nullifiers.has(normalizedNullifier),
      root: this.getRoot(),
    }
  }

  size(): number {
    return this.nullifiers.size
  }
}

// ============ Export singleton instances ============

export const globalCommitmentTree = new CommitmentTree()
export const globalNullifierTree = new NullifierTree()
