// FPP DDoS和机器人攻击防护模块
import { keccak256, encodePacked, bytesToHex } from "./fpp-hash"
import { getSecureRandom, secureLog, SecurityLogLevel } from "./fpp-security"

// ============ DDoS防护配置 ============

const DDOS_CONFIG = {
  // 速率限制
  REQUESTS_PER_SECOND: 10,
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_HOUR: 1000,

  // 熔断器配置
  CIRCUIT_BREAKER_THRESHOLD: 50, // 错误次数阈值
  CIRCUIT_BREAKER_TIMEOUT: 60000, // 熔断时间（毫秒）

  // 滑动窗口
  SLIDING_WINDOW_SIZE: 60, // 秒

  // 黑名单配置
  BLACKLIST_DURATION: 3600000, // 1小时
  MAX_BLACKLIST_SIZE: 10000,

  // 令牌桶配置
  TOKEN_BUCKET_CAPACITY: 100,
  TOKEN_REFILL_RATE: 10, // 每秒
}

// ============ 令牌桶限流器 ============

interface TokenBucket {
  tokens: number
  lastRefill: number
  capacity: number
  refillRate: number
}

class TokenBucketLimiter {
  private buckets: Map<string, TokenBucket> = new Map()

  private getBucket(key: string): TokenBucket {
    let bucket = this.buckets.get(key)
    if (!bucket) {
      bucket = {
        tokens: DDOS_CONFIG.TOKEN_BUCKET_CAPACITY,
        lastRefill: Date.now(),
        capacity: DDOS_CONFIG.TOKEN_BUCKET_CAPACITY,
        refillRate: DDOS_CONFIG.TOKEN_REFILL_RATE,
      }
      this.buckets.set(key, bucket)
    }
    return bucket
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now()
    const timePassed = (now - bucket.lastRefill) / 1000
    const tokensToAdd = Math.floor(timePassed * bucket.refillRate)

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd)
      bucket.lastRefill = now
    }
  }

  tryConsume(key: string, tokens = 1): { allowed: boolean; remainingTokens: number; retryAfter?: number } {
    const bucket = this.getBucket(key)
    this.refillBucket(bucket)

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens
      return { allowed: true, remainingTokens: bucket.tokens }
    }

    const tokensNeeded = tokens - bucket.tokens
    const retryAfter = Math.ceil(tokensNeeded / bucket.refillRate) * 1000

    return { allowed: false, remainingTokens: bucket.tokens, retryAfter }
  }

  // 清理过期桶
  cleanup(): void {
    const now = Date.now()
    const expiry = 3600000 // 1小时未使用的桶

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > expiry) {
        this.buckets.delete(key)
      }
    }
  }
}

export const tokenBucketLimiter = new TokenBucketLimiter()

// ============ 滑动窗口限流器 ============

interface SlidingWindowEntry {
  timestamps: number[]
  lastCleanup: number
}

class SlidingWindowLimiter {
  private windows: Map<string, SlidingWindowEntry> = new Map()

  private getWindow(key: string): SlidingWindowEntry {
    let window = this.windows.get(key)
    if (!window) {
      window = { timestamps: [], lastCleanup: Date.now() }
      this.windows.set(key, window)
    }
    return window
  }

  private cleanupWindow(window: SlidingWindowEntry): void {
    const now = Date.now()
    const cutoff = now - DDOS_CONFIG.SLIDING_WINDOW_SIZE * 1000
    window.timestamps = window.timestamps.filter((t) => t > cutoff)
    window.lastCleanup = now
  }

  checkLimit(key: string, maxRequests: number): { allowed: boolean; count: number; resetIn: number } {
    const window = this.getWindow(key)
    const now = Date.now()

    // 清理过期记录
    if (now - window.lastCleanup > 1000) {
      this.cleanupWindow(window)
    }

    const count = window.timestamps.length

    if (count >= maxRequests) {
      const oldestTimestamp = window.timestamps[0] || now
      const resetIn = oldestTimestamp + DDOS_CONFIG.SLIDING_WINDOW_SIZE * 1000 - now
      return { allowed: false, count, resetIn: Math.max(0, resetIn) }
    }

    window.timestamps.push(now)
    return { allowed: true, count: count + 1, resetIn: DDOS_CONFIG.SLIDING_WINDOW_SIZE * 1000 }
  }
}

export const slidingWindowLimiter = new SlidingWindowLimiter()

// ============ 熔断器 ============

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

interface CircuitBreaker {
  state: CircuitState
  failures: number
  lastFailure: number
  lastStateChange: number
  successCount: number
}

class CircuitBreakerManager {
  private circuits: Map<string, CircuitBreaker> = new Map()

  private getCircuit(key: string): CircuitBreaker {
    let circuit = this.circuits.get(key)
    if (!circuit) {
      circuit = {
        state: "CLOSED",
        failures: 0,
        lastFailure: 0,
        lastStateChange: Date.now(),
        successCount: 0,
      }
      this.circuits.set(key, circuit)
    }
    return circuit
  }

  canExecute(key: string): { allowed: boolean; state: CircuitState; retryAfter?: number } {
    const circuit = this.getCircuit(key)
    const now = Date.now()

    switch (circuit.state) {
      case "CLOSED":
        return { allowed: true, state: circuit.state }

      case "OPEN":
        // 检查是否应该进入半开状态
        if (now - circuit.lastStateChange > DDOS_CONFIG.CIRCUIT_BREAKER_TIMEOUT) {
          circuit.state = "HALF_OPEN"
          circuit.lastStateChange = now
          circuit.successCount = 0
          return { allowed: true, state: circuit.state }
        }
        return {
          allowed: false,
          state: circuit.state,
          retryAfter: DDOS_CONFIG.CIRCUIT_BREAKER_TIMEOUT - (now - circuit.lastStateChange),
        }

      case "HALF_OPEN":
        // 半开状态下允许有限请求
        return { allowed: circuit.successCount < 3, state: circuit.state }

      default:
        return { allowed: true, state: "CLOSED" }
    }
  }

  recordSuccess(key: string): void {
    const circuit = this.getCircuit(key)

    if (circuit.state === "HALF_OPEN") {
      circuit.successCount++
      if (circuit.successCount >= 3) {
        // 恢复到关闭状态
        circuit.state = "CLOSED"
        circuit.failures = 0
        circuit.lastStateChange = Date.now()
        secureLog(SecurityLogLevel.INFO, `Circuit breaker closed for ${key}`)
      }
    } else if (circuit.state === "CLOSED") {
      // 减少失败计数
      circuit.failures = Math.max(0, circuit.failures - 1)
    }
  }

  recordFailure(key: string): void {
    const circuit = this.getCircuit(key)
    circuit.failures++
    circuit.lastFailure = Date.now()

    if (circuit.state === "HALF_OPEN") {
      // 半开状态下失败，重新打开
      circuit.state = "OPEN"
      circuit.lastStateChange = Date.now()
      secureLog(SecurityLogLevel.WARN, `Circuit breaker re-opened for ${key}`)
    } else if (circuit.state === "CLOSED" && circuit.failures >= DDOS_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
      // 超过阈值，打开熔断器
      circuit.state = "OPEN"
      circuit.lastStateChange = Date.now()
      secureLog(SecurityLogLevel.WARN, `Circuit breaker opened for ${key}`, { failures: circuit.failures })
    }
  }
}

export const circuitBreaker = new CircuitBreakerManager()

// ============ IP/用户黑名单 ============

interface BlacklistEntry {
  reason: string
  timestamp: number
  expiry: number
  violations: number
}

class Blacklist {
  private entries: Map<string, BlacklistEntry> = new Map()

  add(key: string, reason: string, durationMs: number = DDOS_CONFIG.BLACKLIST_DURATION): void {
    const existing = this.entries.get(key)
    const violations = existing ? existing.violations + 1 : 1

    // 累进惩罚：每次违规增加封禁时间
    const adjustedDuration = durationMs * Math.min(violations, 10)

    this.entries.set(key, {
      reason,
      timestamp: Date.now(),
      expiry: Date.now() + adjustedDuration,
      violations,
    })

    secureLog(SecurityLogLevel.WARN, `Blacklisted: ${key}`, { reason, violations, duration: adjustedDuration })

    // 限制黑名单大小
    if (this.entries.size > DDOS_CONFIG.MAX_BLACKLIST_SIZE) {
      this.cleanup()
    }
  }

  isBlacklisted(key: string): { blacklisted: boolean; reason?: string; remainingTime?: number } {
    const entry = this.entries.get(key)
    if (!entry) return { blacklisted: false }

    const now = Date.now()
    if (now > entry.expiry) {
      this.entries.delete(key)
      return { blacklisted: false }
    }

    return {
      blacklisted: true,
      reason: entry.reason,
      remainingTime: entry.expiry - now,
    }
  }

  remove(key: string): void {
    this.entries.delete(key)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.entries) {
      if (now > entry.expiry) {
        this.entries.delete(key)
      }
    }
  }
}

export const blacklist = new Blacklist()

// ============ 机器人检测 ============

interface BotDetectionResult {
  isBot: boolean
  confidence: number
  indicators: string[]
  challenge?: {
    type: "captcha" | "pow" | "behavior"
    data: string
  }
}

class BotDetector {
  private interactionHistory: Map<
    string,
    {
      mouseMovements: number
      clicks: number
      keystrokes: number
      scrolls: number
      lastInteraction: number
      startTime: number
    }
  > = new Map()

  // 开始跟踪用户行为
  startTracking(sessionId: string): void {
    this.interactionHistory.set(sessionId, {
      mouseMovements: 0,
      clicks: 0,
      keystrokes: 0,
      scrolls: 0,
      lastInteraction: Date.now(),
      startTime: Date.now(),
    })
  }

  // 记录交互
  recordInteraction(sessionId: string, type: "mouse" | "click" | "key" | "scroll"): void {
    const history = this.interactionHistory.get(sessionId)
    if (!history) return

    history.lastInteraction = Date.now()
    switch (type) {
      case "mouse":
        history.mouseMovements++
        break
      case "click":
        history.clicks++
        break
      case "key":
        history.keystrokes++
        break
      case "scroll":
        history.scrolls++
        break
    }
  }

  // 检测是否为机器人
  detect(
    sessionId: string,
    additionalSignals?: {
      userAgent?: string
      screenResolution?: string
      timezone?: string
      language?: string
      cookiesEnabled?: boolean
      webdriver?: boolean
    },
  ): BotDetectionResult {
    const indicators: string[] = []
    let botScore = 0

    const history = this.interactionHistory.get(sessionId)

    // 行为分析
    if (history) {
      const sessionDuration = Date.now() - history.startTime

      // 检查是否有足够的交互
      if (sessionDuration > 30000 && history.mouseMovements < 5) {
        indicators.push("No mouse movement detected")
        botScore += 20
      }

      // 检查交互模式
      if (history.clicks > 0 && history.mouseMovements === 0) {
        indicators.push("Clicks without mouse movement")
        botScore += 30
      }

      // 检查交互频率
      const interactionsPerSecond =
        (history.mouseMovements + history.clicks + history.keystrokes) / Math.max(1, sessionDuration / 1000)

      if (interactionsPerSecond > 50) {
        indicators.push("Unnaturally high interaction rate")
        botScore += 25
      }

      if (interactionsPerSecond === 0 && sessionDuration > 10000) {
        indicators.push("No interactions detected")
        botScore += 15
      }
    } else {
      indicators.push("No session history")
      botScore += 10
    }

    // 检查额外信号
    if (additionalSignals) {
      // WebDriver检测
      if (additionalSignals.webdriver) {
        indicators.push("WebDriver detected")
        botScore += 50
      }

      // 可疑User-Agent
      if (additionalSignals.userAgent) {
        const suspiciousAgents = [
          "headless",
          "phantom",
          "selenium",
          "puppeteer",
          "playwright",
          "bot",
          "crawler",
          "spider",
          "scraper",
        ]
        const ua = additionalSignals.userAgent.toLowerCase()
        for (const agent of suspiciousAgents) {
          if (ua.includes(agent)) {
            indicators.push(`Suspicious user agent: ${agent}`)
            botScore += 40
            break
          }
        }
      }

      // 检查Cookie
      if (additionalSignals.cookiesEnabled === false) {
        indicators.push("Cookies disabled")
        botScore += 10
      }
    }

    // 确定结果
    const isBot = botScore >= 50
    const confidence = Math.min(100, botScore) / 100

    // 如果可疑，生成挑战
    let challenge: BotDetectionResult["challenge"]
    if (botScore >= 30) {
      challenge = this.generateChallenge(botScore)
    }

    return { isBot, confidence, indicators, challenge }
  }

  // 生成人机验证挑战
  private generateChallenge(botScore: number): BotDetectionResult["challenge"] {
    if (botScore >= 70) {
      // 高风险：需要CAPTCHA
      return {
        type: "captcha",
        data: bytesToHex(getSecureRandom().slice(0, 16)),
      }
    } else if (botScore >= 50) {
      // 中等风险：工作量证明
      const difficulty = Math.floor(botScore / 10)
      return {
        type: "pow",
        data: JSON.stringify({
          challenge: bytesToHex(getSecureRandom().slice(0, 32)),
          difficulty,
          algorithm: "sha256",
        }),
      }
    } else {
      // 低风险：行为验证
      return {
        type: "behavior",
        data: "move-mouse-to-button",
      }
    }
  }

  // 验证工作量证明
  verifyPOW(challenge: string, solution: string, difficulty: number): boolean {
    const hash = keccak256(encodePacked(["string", "string"], [challenge, solution]))
    const leadingZeros = difficulty
    const prefix = "0".repeat(leadingZeros)
    return hash.slice(2, 2 + leadingZeros) === prefix
  }
}

export const botDetector = new BotDetector()

// ============ 会话安全 ============

interface SecureSession {
  id: string
  createdAt: number
  lastActivity: number
  fingerprint: string
  ipHash: string
  rotationCount: number
}

class SessionManager {
  private sessions: Map<string, SecureSession> = new Map()
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30分钟
  private readonly MAX_SESSION_AGE = 24 * 60 * 60 * 1000 // 24小时
  private readonly ROTATION_INTERVAL = 15 * 60 * 1000 // 15分钟轮换

  createSession(fingerprint: string, ipHash: string): SecureSession {
    const session: SecureSession = {
      id: bytesToHex(getSecureRandom()),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      fingerprint,
      ipHash,
      rotationCount: 0,
    }
    this.sessions.set(session.id, session)
    return session
  }

  validateSession(
    sessionId: string,
    fingerprint: string,
    ipHash: string,
  ): {
    valid: boolean
    reason?: string
    newSession?: SecureSession
  } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { valid: false, reason: "Session not found" }
    }

    const now = Date.now()

    // 检查超时
    if (now - session.lastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId)
      return { valid: false, reason: "Session expired" }
    }

    // 检查最大年龄
    if (now - session.createdAt > this.MAX_SESSION_AGE) {
      this.sessions.delete(sessionId)
      return { valid: false, reason: "Session too old" }
    }

    // 验证指纹（防止会话劫持）
    if (session.fingerprint !== fingerprint) {
      secureLog(SecurityLogLevel.WARN, "Session fingerprint mismatch", {
        sessionId: sessionId.slice(0, 8) + "...",
      })
      this.sessions.delete(sessionId)
      return { valid: false, reason: "Session hijacking detected" }
    }

    // 验证IP（允许一定变化，但不能完全不同）
    if (session.ipHash !== ipHash) {
      secureLog(SecurityLogLevel.WARN, "Session IP changed", {
        sessionId: sessionId.slice(0, 8) + "...",
      })
      // 不直接拒绝，但标记为可疑
    }

    // 更新活动时间
    session.lastActivity = now

    // 检查是否需要轮换
    if (now - session.createdAt > this.ROTATION_INTERVAL * (session.rotationCount + 1)) {
      const newSession = this.rotateSession(session, fingerprint, ipHash)
      return { valid: true, newSession }
    }

    return { valid: true }
  }

  private rotateSession(oldSession: SecureSession, fingerprint: string, ipHash: string): SecureSession {
    this.sessions.delete(oldSession.id)

    const newSession: SecureSession = {
      id: bytesToHex(getSecureRandom()),
      createdAt: oldSession.createdAt,
      lastActivity: Date.now(),
      fingerprint,
      ipHash,
      rotationCount: oldSession.rotationCount + 1,
    }

    this.sessions.set(newSession.id, newSession)
    secureLog(SecurityLogLevel.INFO, "Session rotated", { rotationCount: newSession.rotationCount })

    return newSession
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  // 生成设备指纹
  generateFingerprint(): string {
    const components: string[] = []

    if (typeof window !== "undefined") {
      components.push(navigator.userAgent)
      components.push(navigator.language)
      components.push(screen.width + "x" + screen.height)
      components.push(screen.colorDepth.toString())
      components.push(new Date().getTimezoneOffset().toString())
      components.push(navigator.hardwareConcurrency?.toString() || "unknown")
    }

    return keccak256(encodePacked(["string"], [components.join("|")]))
  }

  // 哈希IP地址
  hashIP(ip: string): string {
    return keccak256(encodePacked(["string"], [ip]))
  }
}

export const sessionManager = new SessionManager()

// ============ 点击劫持防护 ============

class ClickjackingGuard {
  private initialized = false

  initialize(): void {
    if (this.initialized || typeof window === "undefined") return

    // Frame busting
    if (window.self !== window.top) {
      secureLog(SecurityLogLevel.CRITICAL, "Clickjacking attempt detected - page is framed")

      // 尝试跳出框架
      try {
        window.top!.location = window.self.location
      } catch {
        // 如果无法跳出，隐藏内容
        document.body.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <h1>Security Warning</h1>
            <p>This page cannot be displayed in a frame for security reasons.</p>
            <a href="${window.location.href}" target="_top">Click here to open in a new window</a>
          </div>
        `
      }
    }

    // 添加样式防护
    const style = document.createElement("style")
    style.textContent = `
      html { display: none !important; }
    `
    document.head.appendChild(style)

    // 如果不在框架中，显示内容
    if (window.self === window.top) {
      style.textContent = ""
    }

    this.initialized = true
  }

  // 检测可疑的覆盖层
  detectOverlays(): { detected: boolean; elements: Element[] } {
    const suspiciousElements: Element[] = []

    if (typeof document === "undefined") return { detected: false, elements: [] }

    const elements = document.querySelectorAll("*")

    for (const el of elements) {
      const style = window.getComputedStyle(el)

      // 检查透明覆盖层
      if (
        style.position === "fixed" &&
        Number.parseFloat(style.opacity) < 0.1 &&
        Number.parseInt(style.zIndex) > 1000
      ) {
        suspiciousElements.push(el)
      }

      // 检查负margin隐藏
      if (Number.parseInt(style.marginTop) < -1000 || Number.parseInt(style.marginLeft) < -1000) {
        suspiciousElements.push(el)
      }
    }

    return {
      detected: suspiciousElements.length > 0,
      elements: suspiciousElements,
    }
  }
}

export const clickjackingGuard = new ClickjackingGuard()

// ============ DNS重绑定防护 ============

class DNSRebindingGuard {
  private readonly ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    // 添加生产域名
  ]

  validateHost(): { valid: boolean; reason?: string } {
    if (typeof window === "undefined") return { valid: true }

    const host = window.location.hostname

    // 检查是否为允许的主机
    if (this.ALLOWED_HOSTS.includes(host)) {
      return { valid: true }
    }

    // 检查是否为私有IP（DNS重绑定攻击特征）
    const privateIPPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^0\./,
      /^169\.254\./,
    ]

    for (const pattern of privateIPPatterns) {
      if (pattern.test(host) && !this.ALLOWED_HOSTS.includes(host)) {
        secureLog(SecurityLogLevel.CRITICAL, "Possible DNS rebinding attack", { host })
        return { valid: false, reason: "DNS rebinding attack detected" }
      }
    }

    return { valid: true }
  }

  // 添加额外的请求头检查
  validateRequestHeaders(headers: Record<string, string>): boolean {
    const host = headers["host"]
    const origin = headers["origin"]

    if (origin && host) {
      try {
        const originHost = new URL(origin).hostname
        if (originHost !== host) {
          secureLog(SecurityLogLevel.WARN, "Host/Origin mismatch", { host, origin })
          return false
        }
      } catch {
        return false
      }
    }

    return true
  }
}

export const dnsRebindingGuard = new DNSRebindingGuard()

// ============ 综合DDoS防护检查 ============

export interface DDoSCheckResult {
  allowed: boolean
  reason?: string
  retryAfter?: number
  requiresChallenge?: boolean
  challengeType?: "captcha" | "pow" | "behavior"
}

export function performDDoSCheck(params: {
  identifier: string // IP或用户ID
  sessionId?: string
  fingerprint?: string
  operation: string
}): DDoSCheckResult {
  const { identifier, sessionId, operation } = params

  // 1. 检查黑名单
  const blacklistStatus = blacklist.isBlacklisted(identifier)
  if (blacklistStatus.blacklisted) {
    return {
      allowed: false,
      reason: `Blacklisted: ${blacklistStatus.reason}`,
      retryAfter: blacklistStatus.remainingTime,
    }
  }

  // 2. 检查熔断器
  const circuitStatus = circuitBreaker.canExecute(operation)
  if (!circuitStatus.allowed) {
    return {
      allowed: false,
      reason: "Service temporarily unavailable",
      retryAfter: circuitStatus.retryAfter,
    }
  }

  // 3. 检查令牌桶
  const tokenStatus = tokenBucketLimiter.tryConsume(identifier)
  if (!tokenStatus.allowed) {
    return {
      allowed: false,
      reason: "Rate limit exceeded",
      retryAfter: tokenStatus.retryAfter,
    }
  }

  // 4. 检查滑动窗口
  const windowStatus = slidingWindowLimiter.checkLimit(identifier, DDOS_CONFIG.REQUESTS_PER_MINUTE)
  if (!windowStatus.allowed) {
    return {
      allowed: false,
      reason: "Too many requests",
      retryAfter: windowStatus.resetIn,
    }
  }

  // 5. 机器人检测
  if (sessionId) {
    const botStatus = botDetector.detect(sessionId)
    if (botStatus.isBot) {
      blacklist.add(identifier, "Bot detected")
      return {
        allowed: false,
        reason: "Automated access detected",
        requiresChallenge: true,
        challengeType: botStatus.challenge?.type,
      }
    }

    if (botStatus.challenge) {
      return {
        allowed: true,
        requiresChallenge: true,
        challengeType: botStatus.challenge.type,
      }
    }
  }

  return { allowed: true }
}

// 记录请求结果
export function recordRequestResult(identifier: string, operation: string, success: boolean): void {
  if (success) {
    circuitBreaker.recordSuccess(operation)
  } else {
    circuitBreaker.recordFailure(operation)

    // 多次失败后加入黑名单
    const windowStatus = slidingWindowLimiter.checkLimit(`failures:${identifier}`, 10)
    if (!windowStatus.allowed) {
      blacklist.add(identifier, "Too many failures")
    }
  }
}

// 初始化安全防护
export function initializeSecurityGuards(): void {
  if (typeof window !== "undefined") {
    clickjackingGuard.initialize()

    // 验证DNS
    const dnsCheck = dnsRebindingGuard.validateHost()
    if (!dnsCheck.valid) {
      document.body.innerHTML = `<h1>Security Error: ${dnsCheck.reason}</h1>`
    }
  }
}
