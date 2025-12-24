// FPP 综合安全检查模块 - 整合所有安全防护
import {
  quantumResistance,
  extensionGuard,
  networkSecurityGuard,
  phishingGuard,
  aiAntiAnalysis,
} from "./fpp-future-security"
import { privacyGuard } from "./fpp-privacy-guard"
import { validateAddressStrict, logSecurityEvent } from "./fpp-attack-prevention"

// ============ 供应链攻击防护 ============

class SupplyChainGuard {
  private trustedScriptHashes: Set<string> = new Set()
  private loadedScripts: Map<string, { hash: string; timestamp: number }> = new Map()

  // 检测可能的供应链攻击
  detectSupplyChainAttack(): {
    detected: boolean
    warnings: string[]
    suspiciousScripts: string[]
  } {
    const warnings: string[] = []
    const suspiciousScripts: string[] = []

    // 检查所有加载的脚本
    const scripts = document.querySelectorAll("script")

    for (const script of scripts) {
      const src = script.src

      if (src) {
        // 检查是否来自不信任的CDN
        const untrustedCDNs = ["cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com"]

        for (const cdn of untrustedCDNs) {
          if (src.includes(cdn)) {
            warnings.push(`Script loaded from potentially risky CDN: ${cdn}`)
          }
        }

        // 检查是否有SRI（Subresource Integrity）
        if (!script.integrity) {
          warnings.push(`Script without integrity check: ${src.slice(0, 50)}...`)
        }
      }

      // 检查内联脚本中的可疑模式
      if (script.textContent) {
        const suspiciousPatterns = [
          /eval\s*\(/,
          /Function\s*\(/,
          /document\.write/,
          /\.innerHTML\s*=/,
          /localStorage\.(get|set)Item.*private/i,
          /sessionStorage\.(get|set)Item.*key/i,
          /fetch\s*\([^)]*api\..*key/i,
        ]

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(script.textContent)) {
            suspiciousScripts.push(`Suspicious pattern found: ${pattern.source}`)
          }
        }
      }
    }

    return {
      detected: suspiciousScripts.length > 0,
      warnings,
      suspiciousScripts,
    }
  }

  // 验证依赖完整性
  async verifyDependencyIntegrity(): Promise<{
    verified: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    // 检查全局对象是否被污染
    const criticalGlobals = ["crypto", "fetch", "XMLHttpRequest", "WebSocket"]

    for (const globalName of criticalGlobals) {
      const global = (window as unknown as Record<string, unknown>)[globalName]

      if (!global) {
        issues.push(`Critical global '${globalName}' is missing`)
      }

      // 检查原型链是否被修改
      if (global && typeof global === "object") {
        const prototype = Object.getPrototypeOf(global)
        if (prototype && prototype.constructor.name === "Object") {
          issues.push(`Global '${globalName}' prototype may have been tampered`)
        }
      }
    }

    return {
      verified: issues.length === 0,
      issues,
    }
  }
}

export const supplyChainGuard = new SupplyChainGuard()

// ============ WebRTC IP泄露防护 ============

class WebRTCGuard {
  private rtcBlocked = false

  // 检测WebRTC是否可能泄露真实IP
  async detectIPLeak(): Promise<{
    leakRisk: boolean
    localIPs: string[]
    publicIP?: string
  }> {
    const localIPs: string[] = []
    let publicIP: string | undefined

    // 尝试通过WebRTC获取IP
    try {
      const pc = new RTCPeerConnection({
        iceServers: [],
      })

      pc.createDataChannel("")

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 解析SDP中的IP地址
      const sdp = pc.localDescription?.sdp || ""
      const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/g
      const ips = sdp.match(ipRegex) || []

      for (const ip of ips) {
        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
          localIPs.push(ip)
        } else if (!ip.startsWith("0.")) {
          publicIP = ip
        }
      }

      pc.close()
    } catch {
      // WebRTC不可用或被阻止
    }

    return {
      leakRisk: publicIP !== undefined || localIPs.length > 0,
      localIPs,
      publicIP,
    }
  }

  // 建议用户启用WebRTC保护
  getProtectionRecommendations(): string[] {
    return [
      "Use a VPN to mask your real IP address",
      "Disable WebRTC in your browser settings",
      'Use browser extensions like "WebRTC Leak Prevent"',
      "Use Tor Browser for maximum privacy",
    ]
  }
}

export const webRTCGuard = new WebRTCGuard()

// ============ 内存安全防护 ============

class MemoryGuard {
  private sensitiveDataLocations: WeakMap<object, string[]> = new WeakMap()

  // 注册敏感数据位置
  registerSensitiveData(obj: object, fields: string[]): void {
    this.sensitiveDataLocations.set(obj, fields)
  }

  // 安全清理对象中的敏感字段
  secureClearObject(obj: Record<string, unknown>): void {
    const fields = this.sensitiveDataLocations.get(obj) || Object.keys(obj)

    for (const field of fields) {
      if (typeof obj[field] === "string") {
        // 多轮覆盖字符串
        const len = (obj[field] as string).length
        for (let i = 0; i < 3; i++) {
          obj[field] = "0".repeat(len)
          obj[field] = "F".repeat(len)
          obj[field] = crypto.getRandomValues(new Uint8Array(len)).toString()
        }
        obj[field] = ""
      } else if (obj[field] instanceof Uint8Array) {
        privacyGuard.secureWipe(obj[field] as Uint8Array)
      }
      delete obj[field]
    }
  }

  // 检测可能的内存扫描尝试
  detectMemoryScanAttempt(): {
    detected: boolean
    indicators: string[]
  } {
    const indicators: string[] = []

    // 检测调试器
    const startTime = performance.now()
    // eslint-disable-next-line no-debugger
    debugger
    const endTime = performance.now()

    if (endTime - startTime > 100) {
      indicators.push("Debugger may be attached")
    }

    // 检测devtools
    const devtoolsOpen = /./
    devtoolsOpen.toString = () => {
      indicators.push("DevTools may be open")
      return ""
    }
    console.log("%c", devtoolsOpen)

    return {
      detected: indicators.length > 0,
      indicators,
    }
  }

  // 创建安全的临时存储
  createSecureTemporaryStorage<T>(initialValue: T): {
    get: () => T
    set: (value: T) => void
    clear: () => void
  } {
    let value: T | null = initialValue
    let cleared = false

    // 设置自动清理定时器
    const clearTimer = setTimeout(() => {
      value = null
      cleared = true
    }, 60000) // 1分钟后自动清理

    return {
      get: () => {
        if (cleared) throw new Error("Secure storage has been cleared")
        return value as T
      },
      set: (newValue: T) => {
        if (cleared) throw new Error("Secure storage has been cleared")
        value = newValue
      },
      clear: () => {
        clearTimeout(clearTimer)
        value = null
        cleared = true
      },
    }
  }
}

export const memoryGuard = new MemoryGuard()

// ============ 硬件钱包集成检测 ============

class HardwareWalletDetector {
  // 检测是否使用硬件钱包
  async detectHardwareWallet(): Promise<{
    detected: boolean
    type?: "ledger" | "trezor" | "other"
    recommendations: string[]
  }> {
    const recommendations: string[] = []

    // 检查是否有硬件钱包特征
    // 这需要通过签名时间等特征来推断

    // 硬件钱包签名通常需要更长时间（用户需要确认）
    recommendations.push("For maximum security, use a hardware wallet (Ledger, Trezor)")
    recommendations.push("Never enter your seed phrase on any website")
    recommendations.push("Always verify transaction details on hardware wallet screen")

    return {
      detected: false, // 无法直接检测，需要用户确认
      recommendations,
    }
  }

  // 验证签名是否来自硬件钱包
  analyzeSignatureOrigin(signatureTime: number): {
    likelyHardwareWallet: boolean
    confidence: number
  } {
    // 硬件钱包签名通常需要3-15秒（用户确认）
    // 软件钱包签名几乎是瞬时的

    if (signatureTime > 3000 && signatureTime < 30000) {
      return {
        likelyHardwareWallet: true,
        confidence: 0.7,
      }
    }

    return {
      likelyHardwareWallet: false,
      confidence: 0.5,
    }
  }
}

export const hardwareWalletDetector = new HardwareWalletDetector()

// ============ 综合安全评分 ============

export interface SecurityAuditResult {
  overallScore: number
  grade: "A" | "B" | "C" | "D" | "F"
  categories: {
    name: string
    score: number
    status: "PASS" | "WARN" | "FAIL"
    details: string[]
  }[]
  criticalIssues: string[]
  recommendations: string[]
  timestamp: number
}

export async function performFullSecurityAudit(params: {
  userAddress: string
  operation: "deposit" | "payment" | "withdrawal"
  amount: number
  recipientAddress?: string
}): Promise<SecurityAuditResult> {
  const categories: SecurityAuditResult["categories"] = []
  const criticalIssues: string[] = []
  const recommendations: string[] = []

  // 1. 基础安全检查
  const addressCheck = validateAddressStrict(params.userAddress)
  categories.push({
    name: "Address Validation",
    score: addressCheck.valid ? 100 : 0,
    status: addressCheck.valid ? "PASS" : "FAIL",
    details: addressCheck.valid ? ["Address format valid"] : [addressCheck.reason || "Invalid address"],
  })
  if (!addressCheck.valid) criticalIssues.push(addressCheck.reason || "Invalid address")

  // 2. 网络安全检查
  const networkCheck = networkSecurityGuard.verifyCurrentDomain()
  categories.push({
    name: "Network Security",
    score: networkCheck.isValid ? 100 : 50,
    status: networkCheck.isValid ? "PASS" : "WARN",
    details: networkCheck.isValid ? ["Secure connection"] : networkCheck.warnings,
  })
  recommendations.push(...networkCheck.warnings)

  // 3. 浏览器扩展检查
  const extensionCheck = extensionGuard.detectSuspiciousExtensionBehavior()
  categories.push({
    name: "Browser Extension Safety",
    score: extensionCheck.detected ? 30 : 100,
    status: extensionCheck.detected ? "FAIL" : "PASS",
    details: extensionCheck.detected ? extensionCheck.warnings : ["No suspicious extensions detected"],
  })
  if (extensionCheck.detected) criticalIssues.push(...extensionCheck.warnings)

  // 4. 供应链安全检查
  const supplyChainCheck = supplyChainGuard.detectSupplyChainAttack()
  categories.push({
    name: "Supply Chain Security",
    score: supplyChainCheck.detected ? 40 : 100,
    status: supplyChainCheck.detected ? "WARN" : "PASS",
    details: supplyChainCheck.detected ? supplyChainCheck.suspiciousScripts : ["No supply chain issues detected"],
  })
  recommendations.push(...supplyChainCheck.warnings)

  // 5. WebRTC隐私检查
  const webrtcCheck = await webRTCGuard.detectIPLeak()
  categories.push({
    name: "WebRTC Privacy",
    score: webrtcCheck.leakRisk ? 60 : 100,
    status: webrtcCheck.leakRisk ? "WARN" : "PASS",
    details: webrtcCheck.leakRisk
      ? [`Potential IP leak: ${webrtcCheck.localIPs.length} local IPs, public IP: ${webrtcCheck.publicIP || "none"}`]
      : ["No WebRTC leak detected"],
  })
  if (webrtcCheck.leakRisk) {
    recommendations.push(...webRTCGuard.getProtectionRecommendations())
  }

  // 6. 量子安全评估
  const quantumCheck = quantumResistance.assessQuantumRisk()
  categories.push({
    name: "Quantum Resistance",
    score: quantumCheck.riskLevel === "SAFE" ? 100 : quantumCheck.riskLevel === "MONITOR" ? 80 : 50,
    status: quantumCheck.riskLevel === "SAFE" ? "PASS" : "WARN",
    details: [`Risk level: ${quantumCheck.riskLevel}, Time to risk: ${quantumCheck.estimatedTimeToRisk}`],
  })
  recommendations.push(...quantumCheck.recommendations)

  // 7. AI行为分析风险
  const aiCheck = aiAntiAnalysis.detectIdentifiablePatterns()
  categories.push({
    name: "AI Anti-Analysis",
    score: aiCheck.riskLevel === "LOW" ? 100 : aiCheck.riskLevel === "MEDIUM" ? 70 : 40,
    status: aiCheck.riskLevel === "LOW" ? "PASS" : aiCheck.riskLevel === "MEDIUM" ? "WARN" : "FAIL",
    details: aiCheck.hasPattern ? aiCheck.recommendations : ["No identifiable patterns"],
  })
  recommendations.push(...aiCheck.recommendations)

  // 8. 钓鱼检测（如果有接收地址）
  if (params.recipientAddress) {
    const phishingCheck = phishingGuard.detectPhishingAttempt({
      type: params.operation,
      targetAddress: params.recipientAddress,
      amount: params.amount,
    })
    categories.push({
      name: "Phishing Detection",
      score: phishingCheck.isPhishing ? 0 : 100,
      status: phishingCheck.isPhishing ? "FAIL" : "PASS",
      details: phishingCheck.isPhishing ? phishingCheck.warnings : ["No phishing indicators"],
    })
    if (phishingCheck.isPhishing) criticalIssues.push(...phishingCheck.warnings)
  }

  // 9. 硬件钱包建议
  const hwCheck = await hardwareWalletDetector.detectHardwareWallet()
  if (!hwCheck.detected && params.amount > 100) {
    recommendations.push(...hwCheck.recommendations)
  }

  // 计算总分
  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length

  // 确定等级
  let grade: SecurityAuditResult["grade"] = "A"
  if (totalScore < 90) grade = "B"
  if (totalScore < 80) grade = "C"
  if (totalScore < 70) grade = "D"
  if (totalScore < 60 || criticalIssues.length > 0) grade = "F"

  // 记录安全审计
  logSecurityEvent({
    type: criticalIssues.length > 0 ? "ALERT" : "INFO",
    category: "SECURITY_AUDIT",
    message: `Security audit completed: Grade ${grade}, Score ${totalScore.toFixed(1)}`,
    metadata: { categories: categories.map((c) => c.name), criticalCount: criticalIssues.length },
  })

  return {
    overallScore: Math.round(totalScore),
    grade,
    categories,
    criticalIssues,
    recommendations: [...new Set(recommendations)], // 去重
    timestamp: Date.now(),
  }
}

// ============ 安全检查点 ============

export async function securityCheckpoint(
  operation: "deposit" | "payment" | "withdrawal",
  params: {
    userAddress: string
    amount: number
    recipientAddress?: string
  },
): Promise<{
  allowed: boolean
  securityScore: number
  blockers: string[]
  warnings: string[]
}> {
  const audit = await performFullSecurityAudit({
    ...params,
    operation,
  })

  // 确定是否允许操作
  const allowed = audit.criticalIssues.length === 0 && audit.overallScore >= 60

  return {
    allowed,
    securityScore: audit.overallScore,
    blockers: audit.criticalIssues,
    warnings: audit.recommendations,
  }
}
