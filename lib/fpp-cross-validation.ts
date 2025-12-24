import { secureLog, SecurityLogLevel } from "./fpp-security"

// ============ 类型定义 ============

export interface PointState {
  id: string
  isActive: boolean
  lockedUntil: number
  pendingWithdrawalId: string | null
  creator: string
  commitment: string
  nullifier?: string
}

export interface WithdrawalState {
  id: string
  requester: string
  pointIds: string[]
  nullifiers: string[]
  completed: boolean
  cancelled: boolean
  permanentlyCancelled: boolean
  unlockTime: number
}

export interface CrossValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  securityAlerts: SecurityAlert[]
}

export interface SecurityAlert {
  type: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  message: string
  data?: Record<string, unknown>
}

// ============ 状态追踪 ============

class CrossFunctionStateTracker {
  private pointStates: Map<string, PointState> = new Map()
  private withdrawalStates: Map<string, WithdrawalState> = new Map()
  private usedNullifiers: Set<string> = new Set()
  private permanentNullifiers: Set<string> = new Set()
  private usedKeyImages: Set<string> = new Set()
  private recentOperations: Array<{
    type: string
    pointIds: string[]
    timestamp: number
    txHash: string
  }> = []

  // 更新点状态
  updatePointState(point: PointState): void {
    this.pointStates.set(point.id, { ...point })
  }

  // 获取点状态
  getPointState(pointId: string): PointState | undefined {
    return this.pointStates.get(pointId)
  }

  // 标记nullifier为已使用
  markNullifierUsed(nullifier: string, permanent = false): void {
    this.usedNullifiers.add(nullifier)
    if (permanent) {
      this.permanentNullifiers.add(nullifier)
    }
  }

  // 检查nullifier是否已使用
  isNullifierUsed(nullifier: string): boolean {
    return this.usedNullifiers.has(nullifier)
  }

  // 检查nullifier是否永久使用
  isNullifierPermanent(nullifier: string): boolean {
    return this.permanentNullifiers.has(nullifier)
  }

  // 标记密钥镜像为已使用
  markKeyImageUsed(keyImage: string): void {
    this.usedKeyImages.add(keyImage)
  }

  // 检查密钥镜像是否已使用
  isKeyImageUsed(keyImage: string): boolean {
    return this.usedKeyImages.has(keyImage)
  }

  // 记录操作
  recordOperation(type: string, pointIds: string[], txHash: string): void {
    this.recentOperations.push({
      type,
      pointIds,
      timestamp: Date.now(),
      txHash,
    })

    // 保留最近1000条记录
    if (this.recentOperations.length > 1000) {
      this.recentOperations = this.recentOperations.slice(-1000)
    }
  }

  // 获取点的最近操作
  getRecentOperationsForPoint(pointId: string): typeof this.recentOperations {
    return this.recentOperations.filter((op) => op.pointIds.includes(pointId))
  }

  // 更新提款状态
  updateWithdrawalState(withdrawal: WithdrawalState): void {
    this.withdrawalStates.set(withdrawal.id, { ...withdrawal })
  }

  // 获取提款状态
  getWithdrawalState(withdrawalId: string): WithdrawalState | undefined {
    return this.withdrawalStates.get(withdrawalId)
  }

  // 获取点的待处理提款
  getPendingWithdrawalForPoint(pointId: string): WithdrawalState | undefined {
    const point = this.pointStates.get(pointId)
    if (!point?.pendingWithdrawalId) return undefined
    return this.withdrawalStates.get(point.pendingWithdrawalId)
  }
}

export const stateTracker = new CrossFunctionStateTracker()

// ============ 跨功能验证 ============

/**
 * 验证存款后支付的安全性
 */
export function validateDepositToPayment(
  userAddress: string,
  inputPointIds: string[],
  lastDepositTimestamp: number,
): CrossValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const securityAlerts: SecurityAlert[] = []

  const now = Date.now()
  const MIN_TIME_BETWEEN_DEPOSIT_AND_PAYMENT = 12000 // 12秒 (约1个区块)

  // 检查存款后是否立即支付
  if (now - lastDepositTimestamp < MIN_TIME_BETWEEN_DEPOSIT_AND_PAYMENT) {
    securityAlerts.push({
      type: "FLASH_LOAN_PATTERN",
      severity: "CRITICAL",
      message: "Attempted payment too soon after deposit",
      data: { timeSinceDeposit: now - lastDepositTimestamp },
    })
    errors.push("Must wait at least 12 seconds after deposit before payment")
  }

  // 检查每个输入点
  for (const pointId of inputPointIds) {
    const pointState = stateTracker.getPointState(pointId)

    if (!pointState) {
      errors.push(`Point ${pointId.slice(0, 10)}... not found in state tracker`)
      continue
    }

    if (!pointState.isActive) {
      errors.push(`Point ${pointId.slice(0, 10)}... is not active`)
    }

    if (now < pointState.lockedUntil) {
      errors.push(`Point ${pointId.slice(0, 10)}... is locked until ${new Date(pointState.lockedUntil).toISOString()}`)
    }

    if (pointState.pendingWithdrawalId) {
      securityAlerts.push({
        type: "CROSS_FUNCTION_VIOLATION",
        severity: "CRITICAL",
        message: "Attempted to pay with point that is in pending withdrawal",
        data: { pointId, withdrawalId: pointState.pendingWithdrawalId },
      })
      errors.push(`Point ${pointId.slice(0, 10)}... is in pending withdrawal`)
    }

    // 检查最近操作
    const recentOps = stateTracker.getRecentOperationsForPoint(pointId)
    const recentPayments = recentOps.filter((op) => op.type === "payment" && now - op.timestamp < 60000)
    if (recentPayments.length > 0) {
      securityAlerts.push({
        type: "DOUBLE_SPEND_ATTEMPT",
        severity: "HIGH",
        message: "Point was recently used in another payment",
        data: { pointId, recentPayments },
      })
      errors.push(`Point ${pointId.slice(0, 10)}... was recently used in another payment`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    securityAlerts,
  }
}

/**
 * 验证支付后提款的安全性
 */
export function validatePaymentToWithdrawal(
  userAddress: string,
  pointIds: string[],
  nullifiers: string[],
): CrossValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const securityAlerts: SecurityAlert[] = []

  for (let i = 0; i < pointIds.length; i++) {
    const pointId = pointIds[i]
    const nullifier = nullifiers[i]

    const pointState = stateTracker.getPointState(pointId)

    if (!pointState) {
      errors.push(`Point ${pointId.slice(0, 10)}... not found`)
      continue
    }

    // 检查点是否已被支付使用
    if (!pointState.isActive) {
      const recentOps = stateTracker.getRecentOperationsForPoint(pointId)
      const recentPayment = recentOps.find((op) => op.type === "payment")
      if (recentPayment) {
        securityAlerts.push({
          type: "SPENT_POINT_WITHDRAWAL",
          severity: "CRITICAL",
          message: "Attempted to withdraw point that was already spent",
          data: { pointId, paymentTxHash: recentPayment.txHash },
        })
        errors.push(`Point ${pointId.slice(0, 10)}... was already spent`)
      }
    }

    // 检查nullifier
    if (stateTracker.isNullifierPermanent(nullifier)) {
      securityAlerts.push({
        type: "NULLIFIER_REUSE",
        severity: "CRITICAL",
        message: "Attempted to reuse permanently spent nullifier",
        data: { nullifier: nullifier.slice(0, 10) + "..." },
      })
      errors.push(`Nullifier already permanently used`)
    } else if (stateTracker.isNullifierUsed(nullifier)) {
      warnings.push(`Nullifier was previously used but not permanently - may indicate cancelled withdrawal`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    securityAlerts,
  }
}

/**
 * 验证提款取消的安全性
 */
export function validateWithdrawalCancellation(
  withdrawalId: string,
  userAddress: string,
  makePermanent: boolean,
): CrossValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const securityAlerts: SecurityAlert[] = []

  const withdrawal = stateTracker.getWithdrawalState(withdrawalId)

  if (!withdrawal) {
    errors.push("Withdrawal request not found")
    return { isValid: false, errors, warnings, securityAlerts }
  }

  if (withdrawal.requester.toLowerCase() !== userAddress.toLowerCase()) {
    securityAlerts.push({
      type: "UNAUTHORIZED_CANCELLATION",
      severity: "HIGH",
      message: "Attempted to cancel withdrawal belonging to another user",
      data: { withdrawalId, requester: withdrawal.requester, caller: userAddress },
    })
    errors.push("Not authorized to cancel this withdrawal")
  }

  if (withdrawal.completed) {
    errors.push("Withdrawal already completed")
  }

  if (withdrawal.permanentlyCancelled) {
    errors.push("Withdrawal already permanently cancelled")
  }

  if (!makePermanent && withdrawal.cancelled) {
    warnings.push("Withdrawal was already cancelled once - can only permanently cancel now")
  }

  // 检查是否有可疑的取消-重放模式
  if (!makePermanent) {
    const pointReuses: string[] = []
    for (const pointId of withdrawal.pointIds) {
      const recentOps = stateTracker.getRecentOperationsForPoint(pointId)
      const cancelOps = recentOps.filter((op) => op.type === "withdrawal_cancel")
      if (cancelOps.length > 2) {
        pointReuses.push(pointId)
      }
    }
    if (pointReuses.length > 0) {
      securityAlerts.push({
        type: "CANCEL_REPLAY_PATTERN",
        severity: "MEDIUM",
        message: "Suspicious pattern of withdrawal cancellations detected",
        data: { pointIds: pointReuses },
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    securityAlerts,
  }
}

/**
 * 验证值守恒
 */
export function validateValueConservation(
  inputPointIds: string[],
  outputCommitments: string[],
  pointValue = 10,
): CrossValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const securityAlerts: SecurityAlert[] = []

  const inputValue = inputPointIds.length * pointValue
  const outputValue = outputCommitments.length * pointValue

  if (inputValue !== outputValue) {
    securityAlerts.push({
      type: "VALUE_MISMATCH",
      severity: "CRITICAL",
      message: "Input and output values do not match",
      data: { inputValue, outputValue, difference: inputValue - outputValue },
    })
    errors.push(`Value not conserved: input ${inputValue} != output ${outputValue}`)
  }

  // 检查是否有重复的输出承诺
  const commitmentSet = new Set(outputCommitments)
  if (commitmentSet.size !== outputCommitments.length) {
    securityAlerts.push({
      type: "DUPLICATE_OUTPUT",
      severity: "HIGH",
      message: "Duplicate output commitments detected",
    })
    errors.push("Duplicate output commitments")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    securityAlerts,
  }
}

/**
 * 验证环签名成员
 */
export function validateRingMembers(
  ringMembers: string[],
  realInputCommitment: string,
  minRingSize = 5,
  maxRingSize = 20,
): CrossValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const securityAlerts: SecurityAlert[] = []

  if (ringMembers.length < minRingSize) {
    errors.push(`Ring size ${ringMembers.length} is below minimum ${minRingSize}`)
  }

  if (ringMembers.length > maxRingSize) {
    errors.push(`Ring size ${ringMembers.length} exceeds maximum ${maxRingSize}`)
  }

  // 检查是否包含真实输入
  if (!ringMembers.includes(realInputCommitment)) {
    securityAlerts.push({
      type: "INVALID_RING",
      severity: "CRITICAL",
      message: "Ring does not contain real input commitment",
    })
    errors.push("Real input must be included in ring")
  }

  // 检查重复成员
  const memberSet = new Set(ringMembers)
  if (memberSet.size !== ringMembers.length) {
    securityAlerts.push({
      type: "DUPLICATE_RING_MEMBER",
      severity: "HIGH",
      message: "Duplicate ring members detected",
    })
    errors.push("Ring contains duplicate members")
  }

  // 检查诱饵点是否有效
  for (const member of ringMembers) {
    if (member !== realInputCommitment) {
      // 检查诱饵是否是活跃的点
      // 这需要通过承诺查找点，这里简化处理
      if (member.length !== 66 || !member.startsWith("0x")) {
        errors.push(`Invalid ring member format: ${member.slice(0, 10)}...`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    securityAlerts,
  }
}

/**
 * 完整的交易前验证
 */
export function validateTransactionPreSubmit(params: {
  type: "deposit" | "payment" | "withdrawal" | "cancel_withdrawal"
  userAddress: string
  pointIds?: string[]
  nullifiers?: string[]
  outputCommitments?: string[]
  ringMembers?: string[]
  keyImage?: string
  withdrawalId?: string
  lastDepositTimestamp?: number
}): CrossValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []
  const allAlerts: SecurityAlert[] = []

  secureLog(SecurityLogLevel.INFO, "Starting cross-function validation", {
    type: params.type,
    user: params.userAddress.slice(0, 10) + "...",
  })

  switch (params.type) {
    case "payment":
      if (params.pointIds && params.lastDepositTimestamp) {
        const depositCheck = validateDepositToPayment(params.userAddress, params.pointIds, params.lastDepositTimestamp)
        allErrors.push(...depositCheck.errors)
        allWarnings.push(...depositCheck.warnings)
        allAlerts.push(...depositCheck.securityAlerts)
      }

      if (params.pointIds && params.outputCommitments) {
        const valueCheck = validateValueConservation(params.pointIds, params.outputCommitments)
        allErrors.push(...valueCheck.errors)
        allWarnings.push(...valueCheck.warnings)
        allAlerts.push(...valueCheck.securityAlerts)
      }

      if (params.keyImage && stateTracker.isKeyImageUsed(params.keyImage)) {
        allAlerts.push({
          type: "KEY_IMAGE_REUSE",
          severity: "CRITICAL",
          message: "Key image has already been used",
        })
        allErrors.push("Key image already used - double spend attempt")
      }
      break

    case "withdrawal":
      if (params.pointIds && params.nullifiers) {
        const withdrawalCheck = validatePaymentToWithdrawal(params.userAddress, params.pointIds, params.nullifiers)
        allErrors.push(...withdrawalCheck.errors)
        allWarnings.push(...withdrawalCheck.warnings)
        allAlerts.push(...withdrawalCheck.securityAlerts)
      }
      break

    case "cancel_withdrawal":
      if (params.withdrawalId) {
        const cancelCheck = validateWithdrawalCancellation(params.withdrawalId, params.userAddress, false)
        allErrors.push(...cancelCheck.errors)
        allWarnings.push(...cancelCheck.warnings)
        allAlerts.push(...cancelCheck.securityAlerts)
      }
      break
  }

  // 记录安全警报
  for (const alert of allAlerts) {
    secureLog(
      alert.severity === "CRITICAL" ? SecurityLogLevel.CRITICAL : SecurityLogLevel.WARN,
      `Security Alert: ${alert.type}`,
      { message: alert.message, data: alert.data },
    )
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    securityAlerts: allAlerts,
  }
}

// ============ 导出单例 ============

export { stateTracker as crossFunctionStateTracker }
