/**
 * EIP-712 Structured Signing for FPP
 * Prevents signature phishing attacks
 */

import { keccak256, encodePacked, toHex } from "./fpp-hash"

// Domain separator components
export const EIP712_DOMAIN = {
  name: "FloatingPointProtocol",
  version: "1",
  chainId: 1, // Will be set dynamically
  verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Will be set dynamically
}

// Type hashes
export const PAYMENT_TYPEHASH = keccak256(
  toHex(
    "PrivacyPayment(bytes32[] inputNullifiers,bytes32[] outputCommitments,address recipient,uint256 amount,uint256 nonce,uint256 deadline)",
  ),
)

export const WITHDRAWAL_TYPEHASH = keccak256(
  toHex(
    "WithdrawalRequest(bytes32[] pointIds,bytes32[] nullifiers,address requester,uint256 amount,uint256 nonce,uint256 deadline)",
  ),
)

export interface PaymentSignatureData {
  inputNullifiers: string[]
  outputCommitments: string[]
  recipient: string
  amount: bigint
  nonce: bigint
  deadline: bigint
}

export interface WithdrawalSignatureData {
  pointIds: string[]
  nullifiers: string[]
  requester: string
  amount: bigint
  nonce: bigint
  deadline: bigint
}

/**
 * Generate domain separator
 */
export function getDomainSeparator(chainId: number, contractAddress: string): string {
  return keccak256(
    encodePacked(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        keccak256(toHex("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")),
        keccak256(toHex(EIP712_DOMAIN.name)),
        keccak256(toHex(EIP712_DOMAIN.version)),
        BigInt(chainId),
        contractAddress as `0x${string}`,
      ],
    ),
  )
}

/**
 * Generate payment struct hash
 */
export function getPaymentStructHash(data: PaymentSignatureData): string {
  const nullifiersHash = keccak256(encodePacked(["bytes32[]"], [data.inputNullifiers as `0x${string}`[]]))
  const commitmentsHash = keccak256(encodePacked(["bytes32[]"], [data.outputCommitments as `0x${string}`[]]))

  return keccak256(
    encodePacked(
      ["bytes32", "bytes32", "bytes32", "address", "uint256", "uint256", "uint256"],
      [
        PAYMENT_TYPEHASH as `0x${string}`,
        nullifiersHash as `0x${string}`,
        commitmentsHash as `0x${string}`,
        data.recipient as `0x${string}`,
        data.amount,
        data.nonce,
        data.deadline,
      ],
    ),
  )
}

/**
 * Generate withdrawal struct hash
 */
export function getWithdrawalStructHash(data: WithdrawalSignatureData): string {
  const pointIdsHash = keccak256(encodePacked(["bytes32[]"], [data.pointIds as `0x${string}`[]]))
  const nullifiersHash = keccak256(encodePacked(["bytes32[]"], [data.nullifiers as `0x${string}`[]]))

  return keccak256(
    encodePacked(
      ["bytes32", "bytes32", "bytes32", "address", "uint256", "uint256", "uint256"],
      [
        WITHDRAWAL_TYPEHASH as `0x${string}`,
        pointIdsHash as `0x${string}`,
        nullifiersHash as `0x${string}`,
        data.requester as `0x${string}`,
        data.amount,
        data.nonce,
        data.deadline,
      ],
    ),
  )
}

/**
 * Generate typed data hash for signing
 */
export function getTypedDataHash(domainSeparator: string, structHash: string): string {
  return keccak256(
    encodePacked(
      ["string", "bytes32", "bytes32"],
      ["\x19\x01", domainSeparator as `0x${string}`, structHash as `0x${string}`],
    ),
  )
}

/**
 * EIP-712 typed data for wallet signing
 */
export function getPaymentTypedData(
  chainId: number,
  contractAddress: string,
  data: PaymentSignatureData,
): {
  domain: typeof EIP712_DOMAIN
  types: Record<string, Array<{ name: string; type: string }>>
  primaryType: string
  message: Record<string, unknown>
} {
  return {
    domain: {
      ...EIP712_DOMAIN,
      chainId,
      verifyingContract: contractAddress as `0x${string}`,
    },
    types: {
      PrivacyPayment: [
        { name: "inputNullifiers", type: "bytes32[]" },
        { name: "outputCommitments", type: "bytes32[]" },
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "PrivacyPayment",
    message: {
      inputNullifiers: data.inputNullifiers,
      outputCommitments: data.outputCommitments,
      recipient: data.recipient,
      amount: data.amount.toString(),
      nonce: data.nonce.toString(),
      deadline: data.deadline.toString(),
    },
  }
}

/**
 * EIP-712 typed data for withdrawal signing
 */
export function getWithdrawalTypedData(
  chainId: number,
  contractAddress: string,
  data: WithdrawalSignatureData,
): {
  domain: typeof EIP712_DOMAIN
  types: Record<string, Array<{ name: string; type: string }>>
  primaryType: string
  message: Record<string, unknown>
} {
  return {
    domain: {
      ...EIP712_DOMAIN,
      chainId,
      verifyingContract: contractAddress as `0x${string}`,
    },
    types: {
      WithdrawalRequest: [
        { name: "pointIds", type: "bytes32[]" },
        { name: "nullifiers", type: "bytes32[]" },
        { name: "requester", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "WithdrawalRequest",
    message: {
      pointIds: data.pointIds,
      nullifiers: data.nullifiers,
      requester: data.requester,
      amount: data.amount.toString(),
      nonce: data.nonce.toString(),
      deadline: data.deadline.toString(),
    },
  }
}

/**
 * Validate signature format (prevents malformed signatures)
 */
export function validateSignatureFormat(signature: string): { valid: boolean; error?: string } {
  if (!signature || typeof signature !== "string") {
    return { valid: false, error: "Invalid signature type" }
  }

  if (!signature.startsWith("0x")) {
    return { valid: false, error: "Signature must start with 0x" }
  }

  // Standard signature length: 65 bytes = 130 hex chars + 2 for 0x
  if (signature.length !== 132) {
    return { valid: false, error: `Invalid signature length: ${signature.length}, expected 132` }
  }

  // Check hex format
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
    return { valid: false, error: "Invalid hex format" }
  }

  // Extract v value
  const v = Number.parseInt(signature.slice(130, 132), 16)
  if (v !== 27 && v !== 28 && v !== 0 && v !== 1) {
    return { valid: false, error: `Invalid v value: ${v}` }
  }

  // Check s value is in lower half of curve order (EIP-2)
  const s = BigInt("0x" + signature.slice(66, 130))
  const halfCurveOrder = BigInt("0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0")
  if (s > halfCurveOrder) {
    return { valid: false, error: "s value too high (malleable signature)" }
  }

  return { valid: true }
}

/**
 * Check if message looks like a phishing attempt
 */
export function detectPhishingAttempt(message: string): { suspicious: boolean; reason?: string } {
  const suspiciousPatterns = [
    /approve.*unlimited/i,
    /infinite.*approval/i,
    /max.*uint256/i,
    /0xffffffff/i,
    /transfer.*all/i,
    /emergency.*withdraw/i,
    /admin.*override/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return { suspicious: true, reason: `Suspicious pattern detected: ${pattern}` }
    }
  }

  return { suspicious: false }
}
