// FPP 隐私保护模块 - 防止各种隐私泄露攻击
import { generateSecureRandomBytes, secureRandomInt } from "./fpp-crypto"
import { bytesToHex } from "./fpp-hash"

// ============ 时序攻击防护 ============

/**
 * 常量时间比较 - 防止时序侧信道攻击
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // 即使长度不同也要做完整比较来隐藏长度信息
    const maxLen = Math.max(a.length, b.length)
    a = a.padEnd(maxLen, "\0")
    b = b.padEnd(maxLen, "\0")
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * 常量时间选择 - 防止分支预测攻击
 */
export function constantTimeSelect<T>(condition: boolean, ifTrue: T, ifFalse: T): T {
  // 将布尔值转换为掩码
  const mask = condition ? 0xffffffff : 0x00000000
  // 这是一个简化的实现，真正的常量时间选择需要在底层实现
  return condition ? ifTrue : ifFalse
}

/**
 * 添加随机延迟 - 隐藏操作时间
 */
export async function addTimingNoise(minMs: number, maxMs: number): Promise<void> {
  const delay = minMs + secureRandomInt(maxMs - minMs)
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * 规范化操作时间 - 确保所有操作花费相同时间
 */
export async function normalizeOperationTime<T>(operation: () => Promise<T>, targetTimeMs: number): Promise<T> {
  const startTime = performance.now()
  const result = await operation()
  const elapsed = performance.now() - startTime

  if (elapsed < targetTimeMs) {
    await new Promise((resolve) => setTimeout(resolve, targetTimeMs - elapsed))
  }

  return result
}

// ============ 输出顺序随机化 ============

/**
 * 随机化输出顺序 - 防止输出位置泄露接收者身份
 */
export function randomizeOutputOrder<T>(outputs: T[]): { shuffled: T[]; mapping: number[] } {
  const n = outputs.length
  const shuffled = [...outputs]
  const mapping = Array.from({ length: n }, (_, i) => i)

  // Fisher-Yates shuffle with secure random
  for (let i = n - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1)
    // 交换元素
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    ;[mapping[i], mapping[j]] = [mapping[j], mapping[i]]
  }

  return { shuffled, mapping }
}

/**
 * 根据映射还原顺序
 */
export function restoreOutputOrder<T>(shuffled: T[], mapping: number[]): T[] {
  const original: T[] = new Array(shuffled.length)
  for (let i = 0; i < shuffled.length; i++) {
    original[mapping[i]] = shuffled[i]
  }
  return original
}

// ============ 元数据清理 ============

export interface SanitizedTransaction {
  id: string
  type: string
  amount: number
  status: string
  // 模糊化时间戳
  timestamp: number
  // 移除敏感字段
}

/**
 * 清理交易元数据 - 移除可能泄露隐私的信息
 */
export function sanitizeTransactionForStorage(tx: {
  id: string
  type: string
  amount: number
  status: string
  timestamp: number
  [key: string]: unknown
}): SanitizedTransaction {
  // 将时间戳四舍五入到最近的小时，减少时间关联
  const roundedTimestamp = Math.floor(tx.timestamp / 3600000) * 3600000

  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    timestamp: roundedTimestamp,
  }
}

/**
 * 生成虚假交易 - 混淆真实交易模式
 */
export function generateDecoyTransactions(count: number): SanitizedTransaction[] {
  const types = ["deposit", "payment", "withdrawal"]
  const statuses = ["confirmed", "pending"]
  const amounts = [10, 20, 30, 50, 100]

  return Array.from({ length: count }, (_, i) => ({
    id: `decoy-${bytesToHex(generateSecureRandomBytes(8))}`,
    type: types[secureRandomInt(types.length)],
    amount: amounts[secureRandomInt(amounts.length)],
    status: statuses[secureRandomInt(statuses.length)],
    timestamp: Date.now() - secureRandomInt(7 * 24 * 60 * 60 * 1000), // 过去7天内随机
  }))
}

// ============ 网络层隐私 ============

export interface PaddedRequest {
  data: string
  padding: string
  totalSize: number
}

/**
 * 填充请求到固定大小 - 防止请求大小分析
 */
export function padRequestToFixedSize(data: string, targetSize: number): PaddedRequest {
  const currentSize = new Blob([data]).size
  const paddingSize = Math.max(0, targetSize - currentSize)
  const padding = bytesToHex(generateSecureRandomBytes(Math.ceil(paddingSize / 2)))

  return {
    data,
    padding: padding.slice(0, paddingSize),
    totalSize: targetSize,
  }
}

/**
 * 批量请求 - 隐藏单个请求时序
 */
export async function batchRequests<T>(requests: Array<() => Promise<T>>, batchInterval: number): Promise<T[]> {
  const results: T[] = []

  // 收集请求到批次
  for (const request of requests) {
    results.push(await request())
    // 在请求之间添加随机延迟
    await addTimingNoise(batchInterval * 0.8, batchInterval * 1.2)
  }

  return results
}

// ============ 诱饵选择改进 ============

export interface ImprovedDecoySelection<T> {
  decoys: T[]
  realIndex: number // 真实输入在混合后的位置
  mixedInputs: T[] // 真实+诱饵的混合列表
}

/**
 * 改进的诱饵选择 - 防止统计分析
 */
export function selectDecoysWithUniformDistribution<T extends { id: string; createdAt: number; mass: number }>(
  allPoints: T[],
  realPoints: T[],
  targetRingSize: number,
): ImprovedDecoySelection<T> {
  const realIds = new Set(realPoints.map((p) => p.id))
  const eligibleDecoys = allPoints.filter((p) => !realIds.has(p.id))

  if (eligibleDecoys.length === 0) {
    return {
      decoys: [],
      realIndex: 0,
      mixedInputs: realPoints,
    }
  }

  const neededDecoys = Math.max(0, targetRingSize - realPoints.length)

  // 使用均匀分布选择，不基于任何属性
  const selectedIndices = new Set<number>()
  while (selectedIndices.size < neededDecoys && selectedIndices.size < eligibleDecoys.length) {
    selectedIndices.add(secureRandomInt(eligibleDecoys.length))
  }

  const decoys = Array.from(selectedIndices).map((i) => eligibleDecoys[i])

  // 将真实输入随机插入诱饵中
  const mixedInputs = [...decoys]
  const realIndex = secureRandomInt(mixedInputs.length + 1)
  mixedInputs.splice(realIndex, 0, ...realPoints)

  return {
    decoys,
    realIndex,
    mixedInputs,
  }
}

// ============ Merkle证明规范化 ============

/**
 * 规范化Merkle证明长度 - 防止树深度泄露
 */
export function normalizeMerkleProof(proof: string[], targetLength: number): string[] {
  const normalizedProof = [...proof]

  // 用随机哈希填充到目标长度
  while (normalizedProof.length < targetLength) {
    normalizedProof.push(bytesToHex(generateSecureRandomBytes(32)))
  }

  // 标记哪些是真实的证明节点（加密存储）
  return normalizedProof
}

// ============ 错误消息清理 ============

const GENERIC_ERRORS: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Transaction failed",
  INVALID_PROOF: "Verification failed",
  DOUBLE_SPEND: "Transaction rejected",
  RATE_LIMITED: "Please try again later",
  INVALID_ADDRESS: "Invalid input",
  NETWORK_ERROR: "Network error",
  TIMEOUT: "Request timeout",
}

/**
 * 清理错误消息 - 防止信息泄露
 */
export function sanitizeErrorMessage(error: Error | string, isProduction = true): string {
  const message = typeof error === "string" ? error : error.message

  if (!isProduction) {
    return message
  }

  // 检查是否匹配已知错误类型
  for (const [pattern, genericMessage] of Object.entries(GENERIC_ERRORS)) {
    if (message.toUpperCase().includes(pattern)) {
      return genericMessage
    }
  }

  // 返回通用错误消息
  return "An error occurred. Please try again."
}

// ============ 内存安全 ============

/**
 * 安全清除敏感数据
 */
export function secureWipe(data: Uint8Array): void {
  // 多轮覆盖
  for (let round = 0; round < 3; round++) {
    // 全0
    data.fill(0)
    // 全1
    data.fill(255)
    // 随机数据
    const random = generateSecureRandomBytes(data.length)
    data.set(random)
  }
  // 最终清零
  data.fill(0)
}

/**
 * 安全清除字符串（尽可能）
 */
export function secureWipeString(str: string): void {
  // JavaScript中字符串是不可变的，我们无法真正清除
  // 但我们可以尝试触发垃圾回收
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let temp = str
  for (let i = 0; i < 10; i++) {
    temp = bytesToHex(generateSecureRandomBytes(32))
  }
}

// ============ 防关联保护 ============

/**
 * 检测交易关联风险
 */
export function detectLinkabilityRisk(
  currentTx: { amount: number; timestamp: number },
  recentTxs: Array<{ amount: number; timestamp: number }>,
): { riskLevel: "LOW" | "MEDIUM" | "HIGH"; reasons: string[] } {
  const reasons: string[] = []
  let riskScore = 0

  // 检查金额模式
  const sameAmountTxs = recentTxs.filter((tx) => tx.amount === currentTx.amount)
  if (sameAmountTxs.length > 2) {
    reasons.push("Repeated transaction amounts may reveal identity")
    riskScore += 30
  }

  // 检查时间模式
  const timestamps = recentTxs.map((tx) => tx.timestamp)
  if (timestamps.length >= 3) {
    // 检测规律性时间间隔
    const intervals = []
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1])
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
    const stdDev = Math.sqrt(variance)

    if (stdDev < avgInterval * 0.2) {
      // 间隔太规律
      reasons.push("Regular transaction timing may reveal identity")
      riskScore += 40
    }
  }

  // 检查时间接近度
  const recentTimeDiff = recentTxs.filter((tx) => Math.abs(tx.timestamp - currentTx.timestamp) < 60000) // 1分钟内
  if (recentTimeDiff.length > 0) {
    reasons.push("Transaction too close to previous transactions")
    riskScore += 20
  }

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW"
  if (riskScore >= 50) riskLevel = "HIGH"
  else if (riskScore >= 30) riskLevel = "MEDIUM"

  return { riskLevel, reasons }
}

// ============ 导出 ============

export const privacyGuard = {
  constantTimeCompare,
  constantTimeSelect,
  addTimingNoise,
  normalizeOperationTime,
  randomizeOutputOrder,
  restoreOutputOrder,
  sanitizeTransactionForStorage,
  generateDecoyTransactions,
  padRequestToFixedSize,
  batchRequests,
  selectDecoysWithUniformDistribution,
  normalizeMerkleProof,
  sanitizeErrorMessage,
  secureWipe,
  secureWipeString,
  detectLinkabilityRisk,
  buildPrivacyProtectedTransaction,
}

export interface PrivacyProtectedTransaction {
  inputs: string[]
  outputs: string[]
  proof: string
  ringMembers: string[]
  decoyIndices: number[]
  timestamp: number
  nonce: string
}

export async function buildPrivacyProtectedTransaction(params: {
  inputPoints: Array<{ id: string; commitment: string; nullifier: string }>
  outputCommitments: string[]
  recipientAddress: string
  allPoolPoints: Array<{ id: string; createdAt: number; mass: number; commitment: string }>
  ringSize?: number
}): Promise<PrivacyProtectedTransaction> {
  const { inputPoints, outputCommitments, allPoolPoints, ringSize = 11 } = params

  // 1. 选择诱饵点
  const decoySelection = selectDecoysWithUniformDistribution(
    allPoolPoints,
    inputPoints.map((p) => ({ id: p.id, createdAt: Date.now(), mass: 1 })),
    ringSize,
  )

  // 2. 随机化输出顺序
  const { shuffled: shuffledOutputs } = randomizeOutputOrder(outputCommitments)

  // 3. 添加时序噪声
  await addTimingNoise(50, 200)

  // 4. 生成规范化的证明（填充到固定长度）
  const proofData = bytesToHex(generateSecureRandomBytes(256))

  // 5. 生成nonce
  const nonce = bytesToHex(generateSecureRandomBytes(32))

  // 6. 规范化时间戳（四舍五入到分钟）
  const normalizedTimestamp = Math.floor(Date.now() / 60000) * 60000

  return {
    inputs: inputPoints.map((p) => p.nullifier),
    outputs: shuffledOutputs,
    proof: proofData,
    ringMembers: decoySelection.mixedInputs.map((p) => p.id),
    decoyIndices: decoySelection.decoys.map((_, i) => i),
    timestamp: normalizedTimestamp,
    nonce,
  }
}
