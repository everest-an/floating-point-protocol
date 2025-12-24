/**
 * Token Approval Guard
 * Prevents excessive/unlimited approvals and monitors approval patterns
 */

import { keccak256, toHex } from "./fpp-hash"

// Maximum recommended approval amount (1000 FP worth of USDT)
export const MAX_RECOMMENDED_APPROVAL = BigInt(10000) * BigInt(10 ** 6) // $10,000 USDT

// Unlimited approval threshold
export const UNLIMITED_THRESHOLD = BigInt(2) ** BigInt(128)

interface ApprovalRecord {
  spender: string
  amount: bigint
  timestamp: number
  txHash: string
}

// In-memory approval tracking
const approvalHistory: Map<string, ApprovalRecord[]> = new Map()

/**
 * Check if approval amount is safe
 */
export function isApprovalSafe(amount: bigint): {
  safe: boolean
  warning?: string
  recommendation?: string
} {
  if (amount === BigInt(0)) {
    return { safe: true }
  }

  if (amount >= UNLIMITED_THRESHOLD) {
    return {
      safe: false,
      warning: "CRITICAL: Unlimited approval detected!",
      recommendation: `Approve only the amount needed: ${MAX_RECOMMENDED_APPROVAL.toString()} (max recommended)`,
    }
  }

  if (amount > MAX_RECOMMENDED_APPROVAL) {
    return {
      safe: false,
      warning: `High approval amount: $${(amount / BigInt(10 ** 6)).toString()} USDT`,
      recommendation: `Consider approving a smaller amount. Max recommended: $${(MAX_RECOMMENDED_APPROVAL / BigInt(10 ** 6)).toString()} USDT`,
    }
  }

  return { safe: true }
}

/**
 * Calculate minimum required approval for operation
 */
export function calculateMinimumApproval(
  operationType: "deposit" | "payment",
  amount: bigint,
  existingAllowance: bigint,
): bigint {
  const required = amount
  if (existingAllowance >= required) {
    return BigInt(0) // No additional approval needed
  }
  return required - existingAllowance
}

/**
 * Record approval for tracking
 */
export function recordApproval(userAddress: string, spender: string, amount: bigint, txHash: string): void {
  const key = userAddress.toLowerCase()
  const record: ApprovalRecord = {
    spender: spender.toLowerCase(),
    amount,
    timestamp: Date.now(),
    txHash,
  }

  const existing = approvalHistory.get(key) || []
  existing.push(record)

  // Keep only last 100 approvals per user
  if (existing.length > 100) {
    existing.shift()
  }

  approvalHistory.set(key, existing)
}

/**
 * Get approval history for user
 */
export function getApprovalHistory(userAddress: string): ApprovalRecord[] {
  return approvalHistory.get(userAddress.toLowerCase()) || []
}

/**
 * Detect suspicious approval patterns
 */
export function detectSuspiciousApprovalPattern(userAddress: string): {
  suspicious: boolean
  reason?: string
} {
  const history = getApprovalHistory(userAddress)
  if (history.length < 3) {
    return { suspicious: false }
  }

  const recentApprovals = history.filter((a) => Date.now() - a.timestamp < 60 * 60 * 1000) // Last hour

  // Multiple approvals to different spenders in short time
  const uniqueSpenders = new Set(recentApprovals.map((a) => a.spender))
  if (uniqueSpenders.size > 3) {
    return {
      suspicious: true,
      reason: `Multiple approvals to ${uniqueSpenders.size} different spenders in the last hour`,
    }
  }

  // Rapidly increasing approval amounts
  if (recentApprovals.length >= 3) {
    let increasing = true
    for (let i = 1; i < recentApprovals.length; i++) {
      if (recentApprovals[i].amount <= recentApprovals[i - 1].amount) {
        increasing = false
        break
      }
    }
    if (increasing) {
      return {
        suspicious: true,
        reason: "Rapidly increasing approval amounts detected",
      }
    }
  }

  return { suspicious: false }
}

/**
 * Generate approval warning message for UI
 */
export function getApprovalWarningMessage(
  amount: bigint,
  spender: string,
  spenderName?: string,
): {
  level: "info" | "warning" | "danger"
  title: string
  message: string
} {
  const safety = isApprovalSafe(amount)
  const displayAmount = (amount / BigInt(10 ** 6)).toString()
  const spenderLabel = spenderName || `${spender.slice(0, 6)}...${spender.slice(-4)}`

  if (amount >= UNLIMITED_THRESHOLD) {
    return {
      level: "danger",
      title: "Unlimited Approval Request",
      message: `You are about to grant ${spenderLabel} UNLIMITED access to your USDT. This is extremely dangerous and not recommended. Consider approving only the amount you need.`,
    }
  }

  if (!safety.safe) {
    return {
      level: "warning",
      title: "High Approval Amount",
      message: `You are approving $${displayAmount} USDT to ${spenderLabel}. ${safety.recommendation || ""}`,
    }
  }

  return {
    level: "info",
    title: "Token Approval",
    message: `Approve $${displayAmount} USDT for ${spenderLabel} to complete this transaction.`,
  }
}

/**
 * Revoke approval helper
 */
export function getRevokeApprovalData(spender: string): string {
  // approve(spender, 0)
  const selector = keccak256(toHex("approve(address,uint256)")).slice(0, 10)
  const paddedSpender = spender.toLowerCase().slice(2).padStart(64, "0")
  const paddedAmount = "0".padStart(64, "0")
  return `${selector}${paddedSpender}${paddedAmount}`
}

/**
 * Check if contract is a known safe spender
 */
export function isKnownSafeSpender(address: string, chainId: number): boolean {
  // Known FPP contract addresses by chain
  const knownContracts: Record<number, string[]> = {
    1: [], // Mainnet - add after deployment
    11155111: [], // Sepolia - add after deployment
  }

  const contracts = knownContracts[chainId] || []
  return contracts.some((c) => c.toLowerCase() === address.toLowerCase())
}
