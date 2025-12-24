/**
 * Floating Point Protocol Client Library
 * Client-side utilities for interacting with the FPP smart contract
 */

import { keccak256, toHex, encodePacked } from "./fpp-hash"

// Types
export interface FloatingPoint {
  id: string
  value: number
  commitment: string
  createdAt: number
  isSpent: boolean
}

export interface PaymentData {
  inputPoints: FloatingPoint[]
  outputCommitments: string[]
  nullifiers: string[]
  zkProof: string
  ringSignature: string
}

// Constants
export const POINT_VALUE_USD = 10
export const POINT_VALUE_WEI = BigInt(10 * 10 ** 18)

/**
 * Generate a Pedersen commitment for a point
 */
export function generateCommitment(secret: string, value: number): string {
  const data = encodePacked(["bytes32", "uint256"], [secret as `0x${string}`, BigInt(value)])
  return keccak256(data)
}

/**
 * Generate a nullifier for spending a point
 */
export function generateNullifier(pointId: string, secret: string): string {
  const data = encodePacked(["string", "bytes32"], [pointId, secret as `0x${string}`])
  return keccak256(data)
}

/**
 * Generate a random secret for cryptographic operations
 */
export function generateRandomSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return toHex(array)
}

/**
 * Weighted random selection of points for payment
 */
export function selectPointsForPayment(amount: number, availablePoints: FloatingPoint[]): FloatingPoint[] {
  const neededPoints = Math.ceil(amount / POINT_VALUE_USD)

  if (availablePoints.length < neededPoints) {
    throw new Error("Insufficient points for payment")
  }

  // Calculate weights based on point age (older = higher weight)
  const now = Date.now()
  const weights = availablePoints.map((point) => {
    const age = now - point.createdAt
    const dayAge = age / (1000 * 60 * 60 * 24)
    return 1 + Math.log(dayAge + 1)
  })

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const selected: FloatingPoint[] = []
  const remaining = [...availablePoints]
  const remainingWeights = [...weights]

  while (selected.length < neededPoints && remaining.length > 0) {
    let random = Math.random() * remainingWeights.reduce((s, w) => s + w, 0)

    for (let i = 0; i < remaining.length; i++) {
      random -= remainingWeights[i]
      if (random <= 0) {
        selected.push(remaining[i])
        remaining.splice(i, 1)
        remainingWeights.splice(i, 1)
        break
      }
    }
  }

  return selected
}

/**
 * Prepare payment data for submission
 */
export async function preparePaymentData(inputPoints: FloatingPoint[], recipientSecret: string): Promise<PaymentData> {
  const outputCommitments: string[] = []
  const nullifiers: string[] = []
  const userSecret = generateRandomSecret()

  // Generate nullifiers for inputs
  for (const point of inputPoints) {
    const nullifier = generateNullifier(point.id, userSecret)
    nullifiers.push(nullifier)
  }

  // Generate commitments for outputs
  for (let i = 0; i < inputPoints.length; i++) {
    const outputSecret = generateRandomSecret()
    const commitment = generateCommitment(outputSecret, POINT_VALUE_USD)
    outputCommitments.push(commitment)
  }

  // Generate ZK proof (simplified - would use actual ZK library)
  const proofData = encodePacked(
    ["bytes32[]", "bytes32[]", "uint256"],
    [nullifiers as `0x${string}`[], outputCommitments as `0x${string}`[], BigInt(Date.now())],
  )
  const zkProof = keccak256(proofData)

  // Generate ring signature (simplified)
  const ringSignature = keccak256(encodePacked(["bytes32", "string"], [zkProof, recipientSecret]))

  return {
    inputPoints,
    outputCommitments,
    nullifiers,
    zkProof,
    ringSignature,
  }
}

/**
 * Format point ID for display
 */
export function formatPointId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

/**
 * Calculate total value of points
 */
export function calculateTotalValue(points: FloatingPoint[]): number {
  return points.length * POINT_VALUE_USD
}
