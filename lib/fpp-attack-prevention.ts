// FPP 攻击防护模块 - 防止各种攻击向量
import { keccak256, encodePacked } from "./fpp-hash"
import { secureRandomInt } from "./fpp-crypto"

// ============ 闪电贷攻击防护 ============

interface DepositRecord {
  block: number
  timestamp: number
  amount: number
}

const recentDeposits = new Map<string, DepositRecord[]>()

export function recordDeposit(address: string, block: number, amount: number): void {
  const normalizedAddress = address.toLowerCase()
  const records = recentDeposits.get(normalizedAddress) || []
  records.push({ block, timestamp: Date.now(), amount })

  // 只保留最近100条记录
  if (records.length > 100) {
    records.shift()
  }
  recentDeposits.set(normalizedAddress, records)
}

export function checkFlashLoanRisk(
  address: string,
  currentBlock: number,
  operationType: "payment" | "withdrawal",
): { allowed: boolean; reason?: string } {
  const normalizedAddress = address.toLowerCase()
  const records = recentDeposits.get(normalizedAddress) || []

  // 检查同一区块内是否有存款
  const sameBlockDeposit = records.find((r) => r.block === currentBlock)
  if (sameBlockDeposit) {
    return {
      allowed: false,
      reason: `Flash loan attack detected: ${operationType} attempted in same block as deposit`,
    }
  }

  // 检查12秒内是否有存款（约1个区块时间）
  const recentDeposit = records.find((r) => Date.now() - r.timestamp < 12000)
  if (recentDeposit) {
    return {
      allowed: false,
      reason: `Must wait at least 12 seconds after deposit before ${operationType}`,
    }
  }

  // 检查大额存款后的快速操作
  const largeRecentDeposit = records.find((r) => r.amount >= 1000 && Date.now() - r.timestamp < 60000)
  if (largeRecentDeposit) {
    return {
      allowed: false,
      reason: "Large deposits require 60 second cooldown before operations",
    }
  }

  return { allowed: true }
}

// ============ 时间戳操纵检测 ============

export function checkTimestampManipulation(providedTimestamp: number): { valid: boolean; reason?: string } {
  const now = Date.now()
  const MAX_DRIFT = 15000 // 15秒容差

  if (Math.abs(providedTimestamp - now) > MAX_DRIFT) {
    return {
      valid: false,
      reason: `Timestamp drift too large: ${Math.abs(providedTimestamp - now)}ms`,
    }
  }

  if (providedTimestamp > now + 1000) {
    return {
      valid: false,
      reason: "Future timestamp detected",
    }
  }

  return { valid: true }
}

// ============ 密钥镜像碰撞检测 ============

const usedKeyImages = new Map<string, { txId: string; timestamp: number }>()

export function checkKeyImageCollision(
  keyImage: string,
  txId: string,
): { collision: boolean; reason?: string; existingTxId?: string } {
  const normalized = keyImage.toLowerCase()

  // 检查是否已使用
  const existing = usedKeyImages.get(normalized)
  if (existing) {
    return {
      collision: true,
      reason: "Key image already used - double spend attempt",
      existingTxId: existing.txId,
    }
  }

  // 检查弱密钥镜像模式
  if (normalized.includes("0000000000") || normalized.includes("ffffffffff")) {
    return {
      collision: true,
      reason: "Weak key image pattern detected",
    }
  }

  // 检查与已有密钥镜像的相似度（防止微调攻击）
  for (const [existingKI] of usedKeyImages) {
    let diffCount = 0
    for (let i = 0; i < Math.min(normalized.length, existingKI.length); i++) {
      if (normalized[i] !== existingKI[i]) diffCount++
    }
    if (diffCount < 5 && diffCount > 0) {
      return {
        collision: true,
        reason: "Key image too similar to existing one - possible manipulation",
      }
    }
  }

  return { collision: false }
}

export function registerKeyImage(keyImage: string, txId: string): void {
  usedKeyImages.set(keyImage.toLowerCase(), { txId, timestamp: Date.now() })
}

// ============ 诱饵选择混淆 ============

export function obfuscateDecoySelection(selectedIndices: number[], totalCount: number): number[] {
  // 添加一些随机"噪声"选择
  const noiseCount = Math.min(3, Math.floor(totalCount * 0.1))
  const noiseIndices: number[] = []

  for (let i = 0; i < noiseCount; i++) {
    let idx = secureRandomInt(totalCount)
    // 确保不重复
    while (selectedIndices.includes(idx) || noiseIndices.includes(idx)) {
      idx = secureRandomInt(totalCount)
    }
    noiseIndices.push(idx)
  }

  // 混合并打乱顺序
  const combined = [...selectedIndices, ...noiseIndices]
  for (let i = combined.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }

  return combined
}

// ============ 诱饵分析攻击检测 ============

const decoySelectionHistory = new Map<string, number[][]>()

export function detectDecoyAnalysisAttack(
  address: string,
  currentSelection: number[],
): { suspicious: boolean; reason?: string } {
  const normalized = address.toLowerCase()
  const history = decoySelectionHistory.get(normalized) || []

  // 检查重复模式
  const selectionHash = currentSelection.sort((a, b) => a - b).join(",")
  for (const prevSelection of history) {
    const prevHash = prevSelection.sort((a, b) => a - b).join(",")
    if (selectionHash === prevHash) {
      return {
        suspicious: true,
        reason: "Repeated decoy selection pattern detected",
      }
    }
  }

  // 记录当前选择
  history.push([...currentSelection])
  if (history.length > 50) history.shift()
  decoySelectionHistory.set(normalized, history)

  // 检查选择是否过于集中
  const selectionFrequency = new Map<number, number>()
  for (const selection of history) {
    for (const idx of selection) {
      selectionFrequency.set(idx, (selectionFrequency.get(idx) || 0) + 1)
    }
  }

  const maxFrequency = Math.max(...selectionFrequency.values())
  if (maxFrequency > history.length * 0.5) {
    return {
      suspicious: true,
      reason: "Decoy selection shows bias towards certain indices",
    }
  }

  return { suspicious: false }
}

// ============ 地址验证（严格模式） ============

export function validateAddressStrict(address: string): { valid: boolean; reason?: string } {
  // 基本格式检查
  if (!address || typeof address !== "string") {
    return { valid: false, reason: "Address is required" }
  }

  // 长度检查
  if (address.length !== 42) {
    return { valid: false, reason: "Invalid address length" }
  }

  // 前缀检查
  if (!address.startsWith("0x")) {
    return { valid: false, reason: "Address must start with 0x" }
  }

  // 十六进制检查
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, reason: "Invalid address format" }
  }

  // 零地址检查
  if (address === "0x0000000000000000000000000000000000000000") {
    return { valid: false, reason: "Cannot use zero address" }
  }

  // EIP-55 校验和验证
  const checksumValid = validateEIP55Checksum(address)
  if (!checksumValid) {
    return { valid: false, reason: "Invalid address checksum" }
  }

  return { valid: true }
}

function validateEIP55Checksum(address: string): boolean {
  // 如果地址全小写或全大写，跳过校验和检查
  const lower = address.slice(2).toLowerCase()
  const upper = address.slice(2).toUpperCase()

  if (address.slice(2) === lower || address.slice(2) === upper) {
    return true
  }

  // EIP-55 校验和
  const hash = keccak256(encodePacked(["string"], [lower]))

  for (let i = 0; i < 40; i++) {
    const hashChar = Number.parseInt(hash[i + 2], 16)
    const addrChar = address[i + 2]

    if (hashChar >= 8) {
      if (addrChar !== addrChar.toUpperCase()) return false
    } else {
      if (addrChar !== addrChar.toLowerCase()) return false
    }
  }

  return true
}

// ============ 输入清理（防XSS/注入） ============

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return ""

  // 移除所有HTML标签
  let sanitized = input.replace(/<[^>]*>/g, "")

  // 移除所有脚本注入尝试
  sanitized = sanitized.replace(/javascript:/gi, "")
  sanitized = sanitized.replace(/on\w+=/gi, "")

  // 移除特殊字符
  sanitized = sanitized.replace(/[<>'"&]/g, "")

  // 移除不可见字符
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "")

  return sanitized.trim()
}

// ============ 重入攻击防护 ============

const functionLocks = new Map<string, boolean>()

export function enterFunction(functionId: string): boolean {
  if (functionLocks.get(functionId)) {
    return false // 已锁定，拒绝重入
  }
  functionLocks.set(functionId, true)
  return true
}

export function exitFunction(functionId: string): void {
  functionLocks.delete(functionId)
}

// ============ 综合安全检查 ============

export interface SecurityCheckResult {
  passed: boolean
  checks: Array<{
    name: string
    passed: boolean
    reason?: string
  }>
}

export function performComprehensiveSecurityCheck(
  operationType: "deposit" | "payment" | "withdrawal",
  params: {
    address: string
    amount: number
    currentBlock: number
    timestamp?: number
    localMerkleRoot?: string
    chainMerkleRoot?: string
  },
): SecurityCheckResult {
  const checks: SecurityCheckResult["checks"] = []

  // 1. 闪电贷检查
  if (operationType !== "deposit") {
    const flashLoanCheck = checkFlashLoanRisk(params.address, params.currentBlock, operationType)
    checks.push({
      name: "Flash Loan Protection",
      passed: flashLoanCheck.allowed,
      reason: flashLoanCheck.reason,
    })
  }

  // 2. 时间戳检查
  if (params.timestamp) {
    const timestampCheck = checkTimestampManipulation(params.timestamp)
    checks.push({
      name: "Timestamp Validation",
      passed: timestampCheck.valid,
      reason: timestampCheck.reason,
    })
  }

  // 3. 地址验证
  const addressCheck = validateAddressStrict(params.address)
  checks.push({
    name: "Address Validation",
    passed: addressCheck.valid,
    reason: addressCheck.reason,
  })

  // 4. 金额检查
  const amountValid = params.amount > 0 && params.amount <= 1000000 && Number.isFinite(params.amount)
  checks.push({
    name: "Amount Validation",
    passed: amountValid,
    reason: amountValid ? undefined : "Invalid amount",
  })

  // 5. Merkle根同步检查
  if (params.localMerkleRoot && params.chainMerkleRoot) {
    const rootsMatch = params.localMerkleRoot === params.chainMerkleRoot
    checks.push({
      name: "State Sync Validation",
      passed: rootsMatch,
      reason: rootsMatch ? undefined : "Local state out of sync with chain",
    })
  }

  return {
    passed: checks.every((c) => c.passed),
    checks,
  }
}

// ============ 安全日志 ============

export interface SecurityLogEntry {
  type: "INFO" | "WARNING" | "ALERT" | "CRITICAL" | "ERROR"
  category: string
  message: string
  timestamp: number
  address?: string
  txHash?: string
  metadata?: Record<string, unknown>
}

const securityLogs: SecurityLogEntry[] = []

export function logSecurityEvent(event: Omit<SecurityLogEntry, "timestamp">): void {
  const entry: SecurityLogEntry = {
    ...event,
    timestamp: Date.now(),
    // 脱敏处理
    address: event.address ? `${event.address.slice(0, 6)}...${event.address.slice(-4)}` : undefined,
    txHash: event.txHash ? `${event.txHash.slice(0, 10)}...` : undefined,
  }

  securityLogs.push(entry)

  // 保留最近1000条日志
  if (securityLogs.length > 1000) {
    securityLogs.shift()
  }

  // 如果是严重事件，可以触发警报
  if (event.type === "CRITICAL") {
    console.error(`[SECURITY CRITICAL] ${event.category}: ${event.message}`)
  }
}

export function getSecurityLogs(count = 100): SecurityLogEntry[] {
  return securityLogs.slice(-count)
}
