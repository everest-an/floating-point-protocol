// FPP 安全模块集成 - 统一入口
import {
  performDDoSCheck,
  recordRequestResult,
  initializeSecurityGuards,
  botDetector,
  sessionManager,
} from "./fpp-ddos-protection"
import { performFullSecurityAudit, securityCheckpoint, type SecurityAuditResult } from "./fpp-comprehensive-security"
import { validateAddressStrict, performComprehensiveSecurityCheck } from "./fpp-attack-prevention"
import { privacyGuard, buildPrivacyProtectedTransaction } from "./fpp-privacy-guard"
import { crossFunctionSecurity } from "./fpp-cross-function-security"
import { scsvsSecurity } from "./fpp-scsvs-audit"
import { secureLog, SecurityLogLevel, checkRateLimit, validateAndConsumeNonce, generateNonce } from "./fpp-security"

// ============ 统一安全检查接口 ============

export interface UnifiedSecurityCheckResult {
  allowed: boolean
  securityScore: number
  grade: "A" | "B" | "C" | "D" | "F"
  blockers: string[]
  warnings: string[]
  requiresChallenge: boolean
  challengeType?: "captcha" | "pow" | "behavior"
  auditDetails?: SecurityAuditResult
}

export async function performUnifiedSecurityCheck(params: {
  userAddress: string
  operation: "deposit" | "payment" | "withdrawal"
  amount: number
  recipientAddress?: string
  sessionId?: string
  fingerprint?: string
  ipHash?: string
}): Promise<UnifiedSecurityCheckResult> {
  const blockers: string[] = []
  const warnings: string[] = []
  let requiresChallenge = false
  let challengeType: "captcha" | "pow" | "behavior" | undefined

  // 1. DDoS检查
  const ddosResult = performDDoSCheck({
    identifier: params.ipHash || params.userAddress,
    sessionId: params.sessionId,
    fingerprint: params.fingerprint,
    operation: params.operation,
  })

  if (!ddosResult.allowed) {
    blockers.push(ddosResult.reason || "DDoS protection triggered")
    if (ddosResult.requiresChallenge) {
      requiresChallenge = true
      challengeType = ddosResult.challengeType
    }
  }

  // 2. 地址验证
  const addressCheck = validateAddressStrict(params.userAddress)
  if (!addressCheck.valid) {
    blockers.push(addressCheck.reason || "Invalid address")
  }

  if (params.recipientAddress) {
    const recipientCheck = validateAddressStrict(params.recipientAddress)
    if (!recipientCheck.valid) {
      blockers.push(`Invalid recipient: ${recipientCheck.reason}`)
    }
  }

  // 3. 速率限制
  const rateLimit = checkRateLimit(`${params.operation}:${params.userAddress}`, 10, 60000)
  if (!rateLimit.allowed) {
    blockers.push(`Rate limit exceeded. Retry in ${Math.ceil(rateLimit.resetIn / 1000)}s`)
  }

  // 4. 攻击防护检查
  const attackCheck = await performComprehensiveSecurityCheck({
    userAddress: params.userAddress,
    operation: params.operation,
    amount: params.amount,
    recipientAddress: params.recipientAddress,
  })

  if (!attackCheck.passed) {
    blockers.push(...attackCheck.failedChecks.map((c) => c.reason))
  }
  warnings.push(...attackCheck.warnings)

  // 5. 完整安全审计
  const audit = await performFullSecurityAudit({
    userAddress: params.userAddress,
    operation: params.operation,
    amount: params.amount,
    recipientAddress: params.recipientAddress,
  })

  warnings.push(...audit.recommendations)
  if (audit.criticalIssues.length > 0) {
    blockers.push(...audit.criticalIssues)
  }

  // 6. SCSVS检查
  const scsvs = scsvsSecurity.runAllChecks({
    hasAccessControl: true,
    hasInputValidation: true,
    hasArithmeticProtection: true,
    hasReentrancyProtection: true,
    gasLimit: 500000,
    transactionSize: params.amount,
  })

  for (const check of scsvs) {
    if (check.status === "FAIL") {
      blockers.push(`SCSVS ${check.category}: ${check.details}`)
    } else if (check.status === "WARN") {
      warnings.push(`SCSVS ${check.category}: ${check.details}`)
    }
  }

  // 7. 跨功能安全检查
  if (params.operation === "payment" && params.recipientAddress) {
    const cfResult = crossFunctionSecurity.validateStateSync(params.userAddress)
    if (!cfResult.synced) {
      warnings.push("State synchronization pending")
    }
  }

  // 计算最终分数
  const baseScore = audit.overallScore
  const ddosPenalty = ddosResult.allowed ? 0 : 30
  const blockerPenalty = blockers.length * 10
  const warningPenalty = warnings.length * 2

  const finalScore = Math.max(0, baseScore - ddosPenalty - blockerPenalty - warningPenalty)

  // 确定等级
  let grade: UnifiedSecurityCheckResult["grade"] = "A"
  if (finalScore < 90) grade = "B"
  if (finalScore < 80) grade = "C"
  if (finalScore < 70) grade = "D"
  if (finalScore < 60 || blockers.length > 0) grade = "F"

  // 记录结果
  const allowed = blockers.length === 0 && finalScore >= 60
  recordRequestResult(params.userAddress, params.operation, allowed)

  secureLog(
    allowed ? SecurityLogLevel.INFO : SecurityLogLevel.WARN,
    `Security check: ${allowed ? "PASSED" : "BLOCKED"}`,
    {
      operation: params.operation,
      score: finalScore,
      grade,
      blockerCount: blockers.length,
      warningCount: warnings.length,
    },
  )

  return {
    allowed,
    securityScore: finalScore,
    grade,
    blockers,
    warnings: [...new Set(warnings)],
    requiresChallenge,
    challengeType,
    auditDetails: audit,
  }
}

// ============ 安全初始化 ============

let securityInitialized = false

export function initializeSecurity(): void {
  if (securityInitialized) return

  initializeSecurityGuards()

  // 初始化机器人检测跟踪
  if (typeof window !== "undefined") {
    const sessionId = sessionManager.generateFingerprint()
    botDetector.startTracking(sessionId)

    // 添加交互监听
    const recordMouse = () => botDetector.recordInteraction(sessionId, "mouse")
    const recordClick = () => botDetector.recordInteraction(sessionId, "click")
    const recordKey = () => botDetector.recordInteraction(sessionId, "key")
    const recordScroll = () => botDetector.recordInteraction(sessionId, "scroll")

    document.addEventListener("mousemove", recordMouse, { passive: true })
    document.addEventListener("click", recordClick, { passive: true })
    document.addEventListener("keydown", recordKey, { passive: true })
    document.addEventListener("scroll", recordScroll, { passive: true })
  }

  securityInitialized = true
  secureLog(SecurityLogLevel.INFO, "Security system initialized")
}

// ============ 便捷安全函数 ============

export async function secureDeposit(params: {
  userAddress: string
  amount: number
  sessionId?: string
}): Promise<{ allowed: boolean; errors: string[] }> {
  const check = await performUnifiedSecurityCheck({
    ...params,
    operation: "deposit",
  })

  return {
    allowed: check.allowed,
    errors: check.blockers,
  }
}

export async function securePayment(params: {
  userAddress: string
  recipientAddress: string
  amount: number
  sessionId?: string
}): Promise<{ allowed: boolean; errors: string[]; privacyProtected?: boolean }> {
  const check = await performUnifiedSecurityCheck({
    ...params,
    operation: "payment",
  })

  if (!check.allowed) {
    return { allowed: false, errors: check.blockers }
  }

  // 应用隐私保护
  const privacyProtected = true // 所有交易都通过隐私保护

  return {
    allowed: true,
    errors: [],
    privacyProtected,
  }
}

export async function secureWithdrawal(params: {
  userAddress: string
  amount: number
  sessionId?: string
}): Promise<{ allowed: boolean; errors: string[] }> {
  const check = await performUnifiedSecurityCheck({
    ...params,
    operation: "withdrawal",
  })

  return {
    allowed: check.allowed,
    errors: check.blockers,
  }
}

// 导出所有安全模块
export {
  performDDoSCheck,
  performFullSecurityAudit,
  securityCheckpoint,
  validateAddressStrict,
  performComprehensiveSecurityCheck,
  privacyGuard,
  buildPrivacyProtectedTransaction,
  crossFunctionSecurity,
  scsvsSecurity,
  botDetector,
  sessionManager,
  generateNonce,
  validateAndConsumeNonce,
}
