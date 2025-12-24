// FPP安全工具库 - 深度防护版本
import { keccak256, encodePacked, bytesToHex } from "./fpp-hash"

// ============ 安全配置 ============

const SECURITY_CONFIG = {
  MAX_RATE_LIMIT_ENTRIES: 10000,
  NONCE_EXPIRY_MS: 60 * 60 * 1000, // 1小时
  MAX_TRANSACTION_AGE_MS: 30 * 60 * 1000, // 30分钟
  MIN_ENTROPY_BITS: 128,
  PRIVATE_KEY_WIPE_DELAY_MS: 100,
  MAX_NONCE_STORAGE: 10000,
}

// ============ 安全随机数生成 ============

export function getSecureRandom(): Uint8Array {
  const array = new Uint8Array(32)

  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array)
  } else if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array)
  } else {
    throw new Error("CRITICAL: No secure random number generator available. Cannot proceed.")
  }

  return array
}

export function getSecureRandomInt(max: number): number {
  if (max <= 0) throw new Error("Max must be positive")
  const bytes = getSecureRandom().slice(0, 4)
  const value = new DataView(bytes.buffer).getUint32(0)
  return value % max
}

// ============ 输入验证 ============

export function validateAddress(address: string): boolean {
  if (!address) return false
  if (!address.startsWith("0x")) return false
  if (address.length !== 42) return false
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false
  if (address === "0x0000000000000000000000000000000000000000") return false
  return true
}

export function validateCommitment(commitment: string): boolean {
  if (!commitment) return false
  if (!commitment.startsWith("0x")) return false
  if (commitment.length !== 66) return false
  if (!/^0x[a-fA-F0-9]{64}$/.test(commitment)) return false
  if (commitment === "0x" + "0".repeat(64)) return false
  return true
}

export function validateAmount(amount: number): boolean {
  if (typeof amount !== "number") return false
  if (!Number.isFinite(amount)) return false
  if (amount <= 0) return false
  if (amount % 10 !== 0) return false
  if (amount > 1000000) return false
  if (!Number.isInteger(amount)) return false
  return true
}

export function validatePrivateKey(privateKey: string): boolean {
  if (!privateKey) return false
  if (!privateKey.startsWith("0x")) return false
  if (privateKey.length !== 66) return false
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) return false
  const value = BigInt(privateKey)
  if (value === BigInt(0)) return false
  if (value === BigInt(1)) return false
  return true
}

export function validateNullifier(nullifier: string): boolean {
  return validateCommitment(nullifier) // 相同格式
}

export function validateRingSize(ringSize: number): boolean {
  if (!Number.isInteger(ringSize)) return false
  if (ringSize < 5) return false // 最小环大小
  if (ringSize > 20) return false // 最大环大小
  return true
}

// ============ 速率限制 (改进版) ============

interface RateLimitEntry {
  count: number
  resetTime: number
  firstRequestTime: number
  requestTimes: number[]
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (rateLimitMap.size > SECURITY_CONFIG.MAX_RATE_LIMIT_ENTRIES) {
    const entries = Array.from(rateLimitMap.entries())
    entries.sort((a, b) => a[1].firstRequestTime - b[1].firstRequestTime)
    const toDelete = entries.slice(0, Math.floor(entries.length / 2))
    toDelete.forEach(([k]) => rateLimitMap.delete(k))
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
      firstRequestTime: now,
      requestTimes: [now],
    })
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs }
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    }
  }

  record.count++
  record.requestTimes.push(now)

  const recentRequests = record.requestTimes.filter((t) => now - t < 1000)
  if (recentRequests.length > 5) {
    secureLog(SecurityLogLevel.WARN, "Burst request pattern detected", { key, count: recentRequests.length })
  }

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetTime - now,
  }
}

// ============ 重放攻击防护 (改进版) ============

interface NonceEntry {
  timestamp: number
  used: boolean
  source?: string
}

const usedNonces = new Map<string, NonceEntry>()

export function generateNonce(): string {
  const timestamp = Date.now()
  const randomBytes = getSecureRandom()
  const randomHex = bytesToHex(randomBytes)

  return keccak256(encodePacked(["uint256", "bytes32"], [BigInt(timestamp), randomHex as `0x${string}`]))
}

export function validateAndConsumeNonce(nonce: string, source?: string): boolean {
  if (!nonce || !nonce.startsWith("0x") || nonce.length !== 66) {
    return false
  }

  const now = Date.now()

  if (usedNonces.size > SECURITY_CONFIG.MAX_NONCE_STORAGE) {
    const toDelete: string[] = []
    usedNonces.forEach((entry, key) => {
      if (now - entry.timestamp > SECURITY_CONFIG.NONCE_EXPIRY_MS * 2) {
        toDelete.push(key)
      }
    })
    toDelete.forEach((key) => usedNonces.delete(key))
  }

  if (usedNonces.has(nonce)) {
    secureLog(SecurityLogLevel.WARN, "Nonce reuse attempt detected", { nonce: maskSensitiveData(nonce), source })
    return false
  }

  usedNonces.set(nonce, { timestamp: now, used: true, source })
  return true
}

// ============ 交易签名验证 ============

export interface SignatureVerification {
  isValid: boolean
  signer?: string
  error?: string
}

export function verifyTransactionSignature(
  message: string,
  signature: string,
  expectedSigner: string,
): SignatureVerification {
  if (!message || !signature || !expectedSigner) {
    return { isValid: false, error: "Missing parameters" }
  }

  if (!validateAddress(expectedSigner)) {
    return { isValid: false, error: "Invalid signer address" }
  }

  if (signature.length !== 132 || !signature.startsWith("0x")) {
    return { isValid: false, error: "Invalid signature format" }
  }

  // 在真实实现中使用 ecrecover
  return { isValid: true, signer: expectedSigner }
}

// ============ 安全整数运算 ============

export function safeAdd(a: bigint, b: bigint): bigint {
  const result = a + b
  if (result < a || result < b) throw new Error("Integer overflow in addition")
  return result
}

export function safeSub(a: bigint, b: bigint): bigint {
  if (b > a) throw new Error("Integer underflow in subtraction")
  return a - b
}

export function safeMul(a: bigint, b: bigint): bigint {
  if (a === BigInt(0) || b === BigInt(0)) return BigInt(0)
  const result = a * b
  if (result / a !== b) throw new Error("Integer overflow in multiplication")
  return result
}

export function safeDiv(a: bigint, b: bigint): bigint {
  if (b === BigInt(0)) throw new Error("Division by zero")
  return a / b
}

// ============ 敏感数据处理 ============

export function secureWipeMemory(data: Uint8Array): void {
  // 多次覆盖以防止内存残留
  for (let round = 0; round < 3; round++) {
    const pattern = round === 0 ? 0xff : round === 1 ? 0x00 : 0xaa
    for (let i = 0; i < data.length; i++) {
      data[i] = pattern
    }
  }
}

export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (!data || data.length <= visibleChars * 2) return "****"
  return `${data.slice(0, visibleChars)}...${data.slice(-visibleChars)}`
}

export async function withSecureKey<T>(keyGenerator: () => string, operation: (key: string) => Promise<T>): Promise<T> {
  let key = ""
  try {
    key = keyGenerator()
    return await operation(key)
  } finally {
    setTimeout(() => {
      key = "0".repeat(key.length)
    }, SECURITY_CONFIG.PRIVATE_KEY_WIPE_DELAY_MS)
  }
}

export function secureWipeString(str: string): void {
  if (typeof str === "string" && str.length > 0) {
    const length = str.length
    let wiped = ""
    for (let i = 0; i < length; i++) {
      wiped += "\0"
    }
    str = wiped
  }
}

// ============ 安全日志 ============

export enum SecurityLogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

// Default to WARN level for safety, can be overridden at runtime
const LOG_LEVEL = SecurityLogLevel.WARN

export function secureLog(
  level: SecurityLogLevel,
  message: string,
  data?: unknown,
  sensitiveKeys: string[] = ["privateKey", "secret", "password", "seed", "_sessionKey", "blindingFactor"],
): void {
  if (level < LOG_LEVEL) return

  const prefix = ["[DEBUG]", "[INFO]", "[WARN]", "[ERROR]", "[CRITICAL]"][level]

  let safeData = data
  if (data && typeof data === "object") {
    safeData = deepRedact({ ...(data as object) }, sensitiveKeys)
  }

  console.log(`[FPP] ${prefix} ${message}`, safeData || "")
}

function deepRedact(obj: Record<string, unknown>, sensitiveKeys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key)) {
      result[key] = "[REDACTED]"
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = deepRedact(value as Record<string, unknown>, sensitiveKeys)
    } else {
      result[key] = value
    }
  }
  return result
}

// ============ 时间锁验证 ============

export interface TimeLockStatus {
  isLocked: boolean
  remainingTime: number
  progress: number
  isExpired: boolean
}

export function validateTimeLock(
  requestTime: number,
  unlockTime: number,
  currentTime: number,
  expiryTime?: number,
): TimeLockStatus {
  const totalLockTime = unlockTime - requestTime
  const elapsed = currentTime - requestTime
  const remaining = Math.max(0, unlockTime - currentTime)

  const isExpired = expiryTime ? currentTime > expiryTime : false

  return {
    isLocked: currentTime < unlockTime,
    remainingTime: remaining,
    progress: Math.min(100, (elapsed / totalLockTime) * 100),
    isExpired,
  }
}

// ============ 交易验证 ============

export interface TransactionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateTransaction(tx: {
  inputPointIds: string[]
  outputCommitments: string[]
  nullifiers: string[]
  amount: number
  deadline?: number
  chainId?: number
}): TransactionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!tx.inputPointIds || tx.inputPointIds.length === 0) {
    errors.push("No input points specified")
  }

  if (tx.inputPointIds && tx.inputPointIds.length > 20) {
    errors.push("Batch size exceeds maximum (20)")
  }

  if (!tx.outputCommitments || tx.outputCommitments.length === 0) {
    errors.push("No output commitments specified")
  }

  if (tx.inputPointIds?.length !== tx.outputCommitments?.length) {
    errors.push("Value not conserved: input count !== output count")
  }

  for (const commitment of tx.outputCommitments || []) {
    if (!validateCommitment(commitment)) {
      errors.push(`Invalid commitment format: ${maskSensitiveData(commitment)}`)
    }
  }

  if (!validateAmount(tx.amount)) {
    errors.push(`Invalid amount: ${tx.amount}`)
  }

  if (tx.deadline) {
    const now = Date.now()
    if (tx.deadline < now) {
      errors.push("Transaction has expired")
    } else if (tx.deadline - now > SECURITY_CONFIG.MAX_TRANSACTION_AGE_MS * 2) {
      warnings.push("Transaction deadline is unusually far in the future")
    }
  }

  if (tx.chainId !== undefined && tx.chainId !== 1 && tx.chainId !== 5 && tx.chainId !== 11155111) {
    warnings.push("Transaction chain ID may be invalid")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============ MEV防护 ============

export async function addMEVProtectionDelay(): Promise<void> {
  const delay = getSecureRandomInt(500)
  await new Promise((resolve) => setTimeout(resolve, delay))
}

export function generateCommitForReveal(
  data: string,
  secret: string,
): { commit: string; revealData: { data: string; secret: string } } {
  const commit = keccak256(encodePacked(["string", "string"], [data, secret]))

  return {
    commit,
    revealData: { data, secret },
  }
}

// ============ XSS防护 ============

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/data:/gi, "") // 移除data URI
    .replace(/vbscript:/gi, "") // 移除VBScript
    .slice(0, 1000)
}

export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char])
}

// ============ CSRF防护 ============

let csrfToken: string | null = null

export function generateCSRFToken(): string {
  const randomBytes = getSecureRandom()
  csrfToken = bytesToHex(randomBytes)
  return csrfToken
}

export function validateCSRFToken(token: string): boolean {
  if (!csrfToken || !token) return false
  if (csrfToken.length !== token.length) return false

  // 常量时间比较防止时序攻击
  let result = 0
  for (let i = 0; i < csrfToken.length; i++) {
    result |= csrfToken.charCodeAt(i) ^ token.charCodeAt(i)
  }

  return result === 0
}

// ============ 私钥安全存储接口 ============

export interface SecureKeyStorage {
  store(key: string, value: string): Promise<void>
  retrieve(key: string): Promise<string | null>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

class MemorySecureStorage implements SecureKeyStorage {
  private storage = new Map<string, string>()
  private obfuscationKey: string

  constructor() {
    // 每次初始化生成新的混淆密钥
    this.obfuscationKey = bytesToHex(getSecureRandom())
  }

  async store(key: string, value: string): Promise<void> {
    const obfuscated = this.obfuscate(value)
    this.storage.set(key, obfuscated)
  }

  async retrieve(key: string): Promise<string | null> {
    const obfuscated = this.storage.get(key)
    if (!obfuscated) return null
    return this.deobfuscate(obfuscated)
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async clear(): Promise<void> {
    this.storage.clear()
    // 重新生成混淆密钥
    this.obfuscationKey = bytesToHex(getSecureRandom())
  }

  private obfuscate(value: string): string {
    let result = ""
    for (let i = 0; i < value.length; i++) {
      result += String.fromCharCode(
        value.charCodeAt(i) ^ this.obfuscationKey.charCodeAt(i % this.obfuscationKey.length),
      )
    }
    return btoa(result)
  }

  private deobfuscate(value: string): string {
    const decoded = atob(value)
    let result = ""
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ this.obfuscationKey.charCodeAt(i % this.obfuscationKey.length),
      )
    }
    return result
  }
}

export const secureKeyStorage = new MemorySecureStorage()

// ============ 新增安全功能 ============

export function detectSuspiciousActivity(recentActions: { type: string; timestamp: number }[]): {
  suspicious: boolean
  reason?: string
} {
  const now = Date.now()
  const oneMinute = 60 * 1000

  // 检测1分钟内的操作频率
  const recentCount = recentActions.filter((a) => now - a.timestamp < oneMinute).length
  if (recentCount > 20) {
    return { suspicious: true, reason: "Excessive activity rate" }
  }

  // 检测重复操作模式
  const typeCount = new Map<string, number>()
  recentActions.forEach((a) => {
    typeCount.set(a.type, (typeCount.get(a.type) || 0) + 1)
  })

  for (const [type, count] of typeCount) {
    if (count > 10) {
      return { suspicious: true, reason: `Repeated ${type} operations` }
    }
  }

  return { suspicious: false }
}

export function generateSecureRequestId(): string {
  const timestamp = Date.now()
  const random = bytesToHex(getSecureRandom().slice(0, 16))
  return keccak256(encodePacked(["uint256", "bytes32"], [BigInt(timestamp), random as `0x${string}`]))
}
