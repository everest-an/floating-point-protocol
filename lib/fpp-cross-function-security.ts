// FPP 跨功能安全模块 - 防止跨功能攻击
import { keccak256, toHex } from "./fpp-hash"

// ============ 状态同步验证 ============

interface ChainState {
  blockNumber: bigint
  blockHash: string
  timestamp: number
  nullifierSetRoot: string
  commitmentRoot: string
  pointCount: bigint
}

interface LocalState {
  lastSyncBlock: bigint
  localNullifiers: Set<string>
  localCommitments: Set<string>
  pendingTxs: Map<string, { nonce: bigint; deadline: number }>
}

class CrossFunctionSecurityManager {
  private chainState: ChainState | null = null
  private localState: LocalState = {
    lastSyncBlock: BigInt(0),
    localNullifiers: new Set(),
    localCommitments: new Set(),
    pendingTxs: new Map(),
  }
  private userNonces: Map<string, bigint> = new Map()
  private operationLocks: Map<string, number> = new Map()
  private multiBlockTracker: Map<string, Array<{ block: bigint; action: string; timestamp: number }>> = new Map()

  // ============ 状态同步 ============

  async syncWithChain(
    provider: {
      getBlockNumber: () => Promise<bigint>
      getBlock: (blockNumber: bigint) => Promise<{ hash: string; timestamp: bigint }>
      call: (params: { to: string; data: string }) => Promise<string>
    },
    contractAddress: string,
  ): Promise<{ synced: boolean; drift: bigint }> {
    try {
      const blockNumber = await provider.getBlockNumber()
      const block = await provider.getBlock(blockNumber)

      // 获取链上状态
      const nullifierRoot = await provider.call({
        to: contractAddress,
        data: keccak256(toHex("nullifierMerkleRoot()")).slice(0, 10),
      })

      const commitmentRoot = await provider.call({
        to: contractAddress,
        data: keccak256(toHex("commitmentMerkleRoot()")).slice(0, 10),
      })

      this.chainState = {
        blockNumber,
        blockHash: block.hash,
        timestamp: Number(block.timestamp) * 1000,
        nullifierSetRoot: nullifierRoot,
        commitmentRoot: commitmentRoot,
        pointCount: BigInt(0),
      }

      const drift = blockNumber - this.localState.lastSyncBlock
      this.localState.lastSyncBlock = blockNumber

      return { synced: true, drift }
    } catch {
      return { synced: false, drift: BigInt(-1) }
    }
  }

  validateStateSyncBeforeOperation(): { valid: boolean; error?: string } {
    if (!this.chainState) {
      return { valid: false, error: "Chain state not synced" }
    }

    const now = Date.now()
    const stateStaleness = now - this.chainState.timestamp

    // 状态超过30秒算陈旧
    if (stateStaleness > 30000) {
      return { valid: false, error: `State is stale: ${stateStaleness}ms old. Please refresh.` }
    }

    return { valid: true }
  }

  // ============ 多区块攻击检测 ============

  trackOperation(userAddress: string, action: string, blockNumber: bigint): void {
    const key = userAddress.toLowerCase()
    const operations = this.multiBlockTracker.get(key) || []

    operations.push({
      block: blockNumber,
      action,
      timestamp: Date.now(),
    })

    // 保留最近100个操作
    if (operations.length > 100) {
      operations.shift()
    }

    this.multiBlockTracker.set(key, operations)
  }

  detectMultiBlockAttack(
    userAddress: string,
    currentBlock: bigint,
    windowBlocks = 5,
  ): {
    detected: boolean
    pattern?: string
    operations?: Array<{ block: bigint; action: string }>
  } {
    const key = userAddress.toLowerCase()
    const operations = this.multiBlockTracker.get(key) || []

    // 获取最近N个区块内的操作
    const recentOps = operations.filter((op) => currentBlock - op.block <= BigInt(windowBlocks))

    if (recentOps.length < 2) {
      return { detected: false }
    }

    // 检测模式：deposit -> payment 在短时间内
    const hasDeposit = recentOps.some((op) => op.action === "deposit")
    const hasPayment = recentOps.some((op) => op.action === "payment")
    const hasWithdrawal = recentOps.some((op) => op.action === "withdrawal")

    if (hasDeposit && hasPayment && hasWithdrawal) {
      return {
        detected: true,
        pattern: "FLASH_LOAN_MULTI_BLOCK",
        operations: recentOps,
      }
    }

    if (hasDeposit && hasPayment) {
      const depositBlock = recentOps.find((op) => op.action === "deposit")?.block || BigInt(0)
      const paymentBlock = recentOps.find((op) => op.action === "payment")?.block || BigInt(0)

      if (paymentBlock - depositBlock <= BigInt(2)) {
        return {
          detected: true,
          pattern: "RAPID_DEPOSIT_PAYMENT",
          operations: recentOps,
        }
      }
    }

    return { detected: false }
  }

  // ============ Nonce管理 ============

  async syncNonce(
    userAddress: string,
    provider: { call: (params: { to: string; data: string }) => Promise<string> },
    contractAddress: string,
  ): Promise<bigint> {
    const key = userAddress.toLowerCase()

    try {
      // 获取链上nonce
      const selector = keccak256(toHex("userNonces(address)")).slice(0, 10)
      const paddedAddress = userAddress.slice(2).padStart(64, "0")
      const chainNonce = await provider.call({
        to: contractAddress,
        data: `${selector}${paddedAddress}`,
      })

      const nonce = BigInt(chainNonce)
      this.userNonces.set(key, nonce)
      return nonce
    } catch {
      return this.userNonces.get(key) || BigInt(0)
    }
  }

  getNextNonce(userAddress: string): bigint {
    const key = userAddress.toLowerCase()
    const current = this.userNonces.get(key) || BigInt(0)
    return current
  }

  incrementNonce(userAddress: string): void {
    const key = userAddress.toLowerCase()
    const current = this.userNonces.get(key) || BigInt(0)
    this.userNonces.set(key, current + BigInt(1))
  }

  validateNonce(userAddress: string, providedNonce: bigint): { valid: boolean; expected: bigint } {
    const expected = this.getNextNonce(userAddress)
    return {
      valid: providedNonce === expected,
      expected,
    }
  }

  // ============ 操作锁 ============

  acquireOperationLock(operationId: string, timeoutMs = 30000): boolean {
    const now = Date.now()
    const existing = this.operationLocks.get(operationId)

    if (existing && now - existing < timeoutMs) {
      return false // 锁已被持有
    }

    this.operationLocks.set(operationId, now)
    return true
  }

  releaseOperationLock(operationId: string): void {
    this.operationLocks.delete(operationId)
  }

  isOperationLocked(operationId: string, timeoutMs = 30000): boolean {
    const lockTime = this.operationLocks.get(operationId)
    if (!lockTime) return false
    return Date.now() - lockTime < timeoutMs
  }

  // ============ 批量操作原子性 ============

  createAtomicBatch(operations: Array<{ type: string; params: unknown }>): {
    batchId: string
    operations: typeof operations
    rollbackData: Map<string, unknown>
  } {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`

    return {
      batchId,
      operations,
      rollbackData: new Map(),
    }
  }

  recordRollbackPoint(batchId: string, key: string, data: unknown): void {
    // 实际实现需要持久化存储
    console.log(`[FPP] Recorded rollback point for batch ${batchId}: ${key}`)
  }

  // ============ 签名安全 ============

  validateSignatureSecurity(signature: string): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!signature || !signature.startsWith("0x")) {
      errors.push("Invalid signature format")
      return { valid: false, errors, warnings }
    }

    if (signature.length !== 132) {
      errors.push(`Invalid signature length: ${signature.length}, expected 132`)
      return { valid: false, errors, warnings }
    }

    // 提取r, s, v
    const r = signature.slice(2, 66)
    const s = signature.slice(66, 130)
    const v = Number.parseInt(signature.slice(130, 132), 16)

    // 检查v值
    if (v !== 27 && v !== 28 && v !== 0 && v !== 1) {
      errors.push(`Invalid v value: ${v}`)
    }

    // 检查s值是否在曲线阶的下半部分（EIP-2 malleability fix）
    const sValue = BigInt("0x" + s)
    const halfN = BigInt("0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0")

    if (sValue > halfN) {
      errors.push("Signature s value is in upper half of curve order (malleable)")
    }

    // 检查r和s不为0
    if (r === "0".repeat(64)) {
      errors.push("Signature r value is zero")
    }

    if (s === "0".repeat(64)) {
      errors.push("Signature s value is zero")
    }

    // 检查弱签名模式
    if (r.startsWith("00000000") || s.startsWith("00000000")) {
      warnings.push("Signature has leading zeros which may indicate a weak key")
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // ============ 审计员访问控制 ============

  private auditorAccessLog: Map<string, Array<{ timestamp: number; dataType: string }>> = new Map()

  recordAuditorAccess(auditorAddress: string, dataType: string): void {
    const key = auditorAddress.toLowerCase()
    const accesses = this.auditorAccessLog.get(key) || []

    accesses.push({
      timestamp: Date.now(),
      dataType,
    })

    // 保留最近1000条
    if (accesses.length > 1000) {
      accesses.shift()
    }

    this.auditorAccessLog.set(key, accesses)
  }

  checkAuditorAccessLimits(
    auditorAddress: string,
    windowMs = 3600000,
    maxAccesses = 100,
  ): {
    allowed: boolean
    currentCount: number
    resetIn: number
  } {
    const key = auditorAddress.toLowerCase()
    const accesses = this.auditorAccessLog.get(key) || []
    const now = Date.now()

    const recentAccesses = accesses.filter((a) => now - a.timestamp < windowMs)

    if (recentAccesses.length >= maxAccesses) {
      const oldestInWindow = recentAccesses[0]?.timestamp || now
      const resetIn = windowMs - (now - oldestInWindow)

      return {
        allowed: false,
        currentCount: recentAccesses.length,
        resetIn,
      }
    }

    return {
      allowed: true,
      currentCount: recentAccesses.length,
      resetIn: 0,
    }
  }

  // ============ Treasury时间锁验证 ============

  private treasuryChangeRequests: Map<
    string,
    {
      newTreasury: string
      requestTime: number
      requester: string
      executed: boolean
    }
  > = new Map()

  recordTreasuryChangeRequest(requestId: string, newTreasury: string, requester: string): void {
    this.treasuryChangeRequests.set(requestId, {
      newTreasury,
      requestTime: Date.now(),
      requester,
      executed: false,
    })
  }

  validateTreasuryChange(
    requestId: string,
    timelockMs = 48 * 60 * 60 * 1000,
  ): {
    canExecute: boolean
    remainingTime: number
    error?: string
  } {
    const request = this.treasuryChangeRequests.get(requestId)

    if (!request) {
      return { canExecute: false, remainingTime: 0, error: "Request not found" }
    }

    if (request.executed) {
      return { canExecute: false, remainingTime: 0, error: "Already executed" }
    }

    const elapsed = Date.now() - request.requestTime
    const remaining = timelockMs - elapsed

    if (remaining > 0) {
      return {
        canExecute: false,
        remainingTime: remaining,
        error: `Timelock not expired. ${Math.ceil(remaining / 3600000)} hours remaining`,
      }
    }

    return { canExecute: true, remainingTime: 0 }
  }

  // ============ 紧急暂停检测 ============

  private pauseHistory: Array<{
    timestamp: number
    paused: boolean
    reason?: string
  }> = []

  recordPauseEvent(paused: boolean, reason?: string): void {
    this.pauseHistory.push({
      timestamp: Date.now(),
      paused,
      reason,
    })
  }

  detectSuspiciousPausePattern(): {
    suspicious: boolean
    pattern?: string
  } {
    const recentPauses = this.pauseHistory.filter((p) => Date.now() - p.timestamp < 24 * 60 * 60 * 1000) // 24小时内

    // 频繁暂停/恢复可能表示攻击或滥用
    if (recentPauses.length > 5) {
      return {
        suspicious: true,
        pattern: `${recentPauses.length} pause/unpause events in 24 hours`,
      }
    }

    // 检测暂停后立即执行敏感操作的模式
    const pauseUnpausePairs = []
    for (let i = 0; i < recentPauses.length - 1; i++) {
      if (recentPauses[i].paused && !recentPauses[i + 1].paused) {
        const duration = recentPauses[i + 1].timestamp - recentPauses[i].timestamp
        if (duration < 60000) {
          // 1分钟内
          pauseUnpausePairs.push({ duration })
        }
      }
    }

    if (pauseUnpausePairs.length > 2) {
      return {
        suspicious: true,
        pattern: "Rapid pause/unpause cycles detected",
      }
    }

    return { suspicious: false }
  }
}

// 导出单例
export const crossFunctionSecurity = new CrossFunctionSecurityManager()

// ============ 综合验证函数 ============

export async function performComprehensiveSecurityCheck(params: {
  userAddress: string
  operation: "deposit" | "payment" | "withdrawal" | "cancel"
  currentBlock: bigint
  nonce: bigint
  signature?: string
}): Promise<{
  passed: boolean
  errors: string[]
  warnings: string[]
  securityScore: number
}> {
  const errors: string[] = []
  const warnings: string[] = []
  let securityScore = 100

  // 1. 状态同步检查
  const stateCheck = crossFunctionSecurity.validateStateSyncBeforeOperation()
  if (!stateCheck.valid) {
    errors.push(stateCheck.error || "State sync failed")
    securityScore -= 30
  }

  // 2. 多区块攻击检测
  const multiBlockCheck = crossFunctionSecurity.detectMultiBlockAttack(params.userAddress, params.currentBlock)
  if (multiBlockCheck.detected) {
    errors.push(`Multi-block attack pattern detected: ${multiBlockCheck.pattern}`)
    securityScore -= 50
  }

  // 3. Nonce验证
  const nonceCheck = crossFunctionSecurity.validateNonce(params.userAddress, params.nonce)
  if (!nonceCheck.valid) {
    errors.push(`Invalid nonce: expected ${nonceCheck.expected}, got ${params.nonce}`)
    securityScore -= 20
  }

  // 4. 操作锁检查
  const lockId = `${params.userAddress}-${params.operation}`
  if (crossFunctionSecurity.isOperationLocked(lockId)) {
    warnings.push("Operation is currently locked - another transaction may be pending")
    securityScore -= 10
  }

  // 5. 签名安全检查
  if (params.signature) {
    const sigCheck = crossFunctionSecurity.validateSignatureSecurity(params.signature)
    if (!sigCheck.valid) {
      errors.push(...sigCheck.errors)
      securityScore -= 40
    }
    warnings.push(...sigCheck.warnings)
  }

  // 6. 暂停模式检测
  const pauseCheck = crossFunctionSecurity.detectSuspiciousPausePattern()
  if (pauseCheck.suspicious) {
    warnings.push(`Suspicious pause pattern: ${pauseCheck.pattern}`)
    securityScore -= 15
  }

  // 记录此次操作
  crossFunctionSecurity.trackOperation(params.userAddress, params.operation, params.currentBlock)

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    securityScore: Math.max(0, securityScore),
  }
}
