// ============ SCSVS 检查类别 ============

export enum SCSVSCategory {
  ARCHITECTURE = "V1: Architecture, Design and Threat Modelling",
  ACCESS_CONTROL = "V2: Access Control",
  BLOCKCHAIN_DATA = "V3: Blockchain Data",
  COMMUNICATIONS = "V4: Communications",
  ARITHMETIC = "V5: Arithmetic",
  MALICIOUS_INPUT = "V6: Malicious Input Handling",
  GAS_LIMITATIONS = "V7: Gas Usage & Limitations",
  BUSINESS_LOGIC = "V8: Business Logic",
  DENIAL_OF_SERVICE = "V9: Denial of Service",
  TOKEN = "V10: Token",
  CODE_CLARITY = "V11: Code Clarity",
  TEST_COVERAGE = "V12: Test Coverage",
  KNOWN_ATTACKS = "V13: Known Attacks",
  DEFI = "V14: Decentralized Finance",
}

export enum Severity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFORMATIONAL = "INFO",
}

export interface AuditFinding {
  id: string
  category: SCSVSCategory
  severity: Severity
  title: string
  description: string
  location: string
  recommendation: string
  status: "OPEN" | "FIXED" | "ACKNOWLEDGED" | "WONT_FIX"
  cwe?: string // Common Weakness Enumeration
  cvss?: number // Common Vulnerability Scoring System
}

// ============ 自动化安全检查 ============

export class SCSVSAuditor {
  private findings: AuditFinding[] = []

  // V1: 架构和设计检查
  checkArchitecture(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 检查是否有升级机制
    if (contractCode.includes("delegatecall") || contractCode.includes("proxy")) {
      findings.push({
        id: "V1-01",
        category: SCSVSCategory.ARCHITECTURE,
        severity: Severity.MEDIUM,
        title: "Upgradeable Contract Pattern Detected",
        description: "Contract uses proxy/delegatecall pattern which introduces upgrade risks",
        location: "contract",
        recommendation: "Implement proper access controls and timelock for upgrades",
        status: "OPEN",
        cwe: "CWE-284",
      })
    }

    // 检查是否有多签保护
    if (!contractCode.includes("multiSig") && !contractCode.includes("requiredSignatures")) {
      findings.push({
        id: "V1-02",
        category: SCSVSCategory.ARCHITECTURE,
        severity: Severity.HIGH,
        title: "No Multi-Signature Protection",
        description: "Critical functions lack multi-signature protection",
        location: "admin functions",
        recommendation: "Implement multi-sig for all critical administrative functions",
        status: "OPEN",
        cwe: "CWE-284",
      })
    }

    return findings
  }

  // V2: 访问控制检查
  checkAccessControl(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 检查public/external函数
    const publicFunctions = contractCode.match(/function\s+\w+\s*$$[^)]*$$\s*(external|public)/g) || []

    for (const func of publicFunctions) {
      // 检查是否有访问控制修饰器
      if (!func.includes("onlyOwner") && !func.includes("require") && !func.includes("modifier")) {
        findings.push({
          id: "V2-01",
          category: SCSVSCategory.ACCESS_CONTROL,
          severity: Severity.MEDIUM,
          title: "Unrestricted Public Function",
          description: `Function may lack proper access control: ${func.slice(0, 50)}...`,
          location: func.slice(0, 30),
          recommendation: "Add appropriate access control modifiers",
          status: "OPEN",
          cwe: "CWE-284",
        })
      }
    }

    // 检查tx.origin使用
    if (contractCode.includes("tx.origin")) {
      findings.push({
        id: "V2-02",
        category: SCSVSCategory.ACCESS_CONTROL,
        severity: Severity.HIGH,
        title: "tx.origin Usage",
        description: "Contract uses tx.origin for authorization which can be exploited in phishing attacks",
        location: "authorization checks",
        recommendation: "Use msg.sender instead of tx.origin",
        status: "OPEN",
        cwe: "CWE-287",
        cvss: 7.5,
      })
    }

    return findings
  }

  // V5: 算术检查
  checkArithmetic(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 检查unchecked块
    if (contractCode.includes("unchecked")) {
      findings.push({
        id: "V5-01",
        category: SCSVSCategory.ARITHMETIC,
        severity: Severity.LOW,
        title: "Unchecked Arithmetic",
        description: "Contract uses unchecked arithmetic which may cause overflow/underflow",
        location: "unchecked blocks",
        recommendation: "Ensure unchecked blocks are used only where overflow is impossible",
        status: "OPEN",
        cwe: "CWE-190",
      })
    }

    // 检查除法前是否有零检查
    const divisions = contractCode.match(/\/\s*\w+/g) || []
    if (divisions.length > 0 && !contractCode.includes("require") && !contractCode.includes("if")) {
      findings.push({
        id: "V5-02",
        category: SCSVSCategory.ARITHMETIC,
        severity: Severity.MEDIUM,
        title: "Potential Division by Zero",
        description: "Division operations may not check for zero divisor",
        location: "arithmetic operations",
        recommendation: "Add zero checks before division operations",
        status: "OPEN",
        cwe: "CWE-369",
      })
    }

    return findings
  }

  // V6: 恶意输入检查
  checkMaliciousInput(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 检查数组长度限制
    if (contractCode.includes("calldata") && !contractCode.includes("length")) {
      findings.push({
        id: "V6-01",
        category: SCSVSCategory.MALICIOUS_INPUT,
        severity: Severity.MEDIUM,
        title: "Unbounded Array Input",
        description: "Array inputs may not have length limits",
        location: "function parameters",
        recommendation: "Add maximum length checks for all array inputs",
        status: "OPEN",
        cwe: "CWE-400",
      })
    }

    // 检查地址验证
    if (contractCode.includes("address") && !contractCode.includes("!= address(0)")) {
      findings.push({
        id: "V6-02",
        category: SCSVSCategory.MALICIOUS_INPUT,
        severity: Severity.MEDIUM,
        title: "Missing Zero Address Check",
        description: "Address inputs may not check for zero address",
        location: "address parameters",
        recommendation: "Add zero address validation for all address inputs",
        status: "OPEN",
        cwe: "CWE-20",
      })
    }

    return findings
  }

  // V7: Gas使用检查
  checkGasUsage(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 检查循环中的storage读写
    const loops = contractCode.match(/for\s*$$[^)]+$$\s*\{[^}]+\}/g) || []
    for (const loop of loops) {
      if (loop.includes("storage") || loop.includes("mapping")) {
        findings.push({
          id: "V7-01",
          category: SCSVSCategory.GAS_LIMITATIONS,
          severity: Severity.LOW,
          title: "Storage Access in Loop",
          description: "Loop contains storage reads/writes which is gas expensive",
          location: loop.slice(0, 50),
          recommendation: "Cache storage values in memory before loop",
          status: "OPEN",
        })
      }
    }

    // 检查大循环
    if (contractCode.includes("for") && !contractCode.includes("MAX_")) {
      findings.push({
        id: "V7-02",
        category: SCSVSCategory.GAS_LIMITATIONS,
        severity: Severity.MEDIUM,
        title: "Unbounded Loop",
        description: "Loops may not have upper bounds, risking gas exhaustion",
        location: "loop structures",
        recommendation: "Add maximum iteration limits to all loops",
        status: "OPEN",
        cwe: "CWE-400",
      })
    }

    return findings
  }

  // V8: 业务逻辑检查
  checkBusinessLogic(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 检查重入防护
    if (!contractCode.includes("nonReentrant") && !contractCode.includes("ReentrancyGuard")) {
      findings.push({
        id: "V8-01",
        category: SCSVSCategory.BUSINESS_LOGIC,
        severity: Severity.HIGH,
        title: "Missing Reentrancy Protection",
        description: "Contract may be vulnerable to reentrancy attacks",
        location: "external calls",
        recommendation: "Use OpenZeppelin ReentrancyGuard",
        status: "OPEN",
        cwe: "CWE-841",
        cvss: 8.0,
      })
    }

    // 检查CEI模式
    if (contractCode.includes("transfer") || contractCode.includes("call")) {
      const externalCalls = contractCode.match(/\.(transfer|call|send)\(/g) || []
      if (externalCalls.length > 0) {
        findings.push({
          id: "V8-02",
          category: SCSVSCategory.BUSINESS_LOGIC,
          severity: Severity.INFORMATIONAL,
          title: "External Calls Present",
          description: "Contract makes external calls - verify CEI pattern is followed",
          location: "external calls",
          recommendation: "Ensure Checks-Effects-Interactions pattern is used",
          status: "OPEN",
        })
      }
    }

    return findings
  }

  // V13: 已知攻击检查
  checkKnownAttacks(contractCode: string): AuditFinding[] {
    const findings: AuditFinding[] = []

    // 闪电贷攻击
    if (contractCode.includes("balanceOf") && !contractCode.includes("flashLoan")) {
      findings.push({
        id: "V13-01",
        category: SCSVSCategory.KNOWN_ATTACKS,
        severity: Severity.MEDIUM,
        title: "Potential Flash Loan Vulnerability",
        description: "Contract may be vulnerable to flash loan attacks",
        location: "balance checks",
        recommendation: "Implement flash loan protection (same-block detection)",
        status: "OPEN",
        cvss: 6.5,
      })
    }

    // 时间戳依赖
    if (contractCode.includes("block.timestamp")) {
      findings.push({
        id: "V13-02",
        category: SCSVSCategory.KNOWN_ATTACKS,
        severity: Severity.LOW,
        title: "Timestamp Dependency",
        description: "Contract relies on block.timestamp which can be manipulated by miners",
        location: "timestamp usage",
        recommendation: "Do not use timestamps for critical logic or randomness",
        status: "OPEN",
        cwe: "CWE-330",
      })
    }

    // 前端运行
    if (contractCode.includes("commit") || contractCode.includes("reveal")) {
      findings.push({
        id: "V13-03",
        category: SCSVSCategory.KNOWN_ATTACKS,
        severity: Severity.INFORMATIONAL,
        title: "Commit-Reveal Pattern",
        description: "Contract implements commit-reveal pattern",
        location: "commit/reveal functions",
        recommendation: "Ensure commit phase cannot be front-run",
        status: "OPEN",
      })
    }

    return findings
  }

  // 执行完整审计
  performFullAudit(contractCode: string): {
    findings: AuditFinding[]
    summary: {
      critical: number
      high: number
      medium: number
      low: number
      info: number
      total: number
    }
    score: number
    grade: "A" | "B" | "C" | "D" | "F"
  } {
    this.findings = []

    // 运行所有检查
    this.findings.push(...this.checkArchitecture(contractCode))
    this.findings.push(...this.checkAccessControl(contractCode))
    this.findings.push(...this.checkArithmetic(contractCode))
    this.findings.push(...this.checkMaliciousInput(contractCode))
    this.findings.push(...this.checkGasUsage(contractCode))
    this.findings.push(...this.checkBusinessLogic(contractCode))
    this.findings.push(...this.checkKnownAttacks(contractCode))

    // 统计
    const summary = {
      critical: this.findings.filter((f) => f.severity === Severity.CRITICAL).length,
      high: this.findings.filter((f) => f.severity === Severity.HIGH).length,
      medium: this.findings.filter((f) => f.severity === Severity.MEDIUM).length,
      low: this.findings.filter((f) => f.severity === Severity.LOW).length,
      info: this.findings.filter((f) => f.severity === Severity.INFORMATIONAL).length,
      total: this.findings.length,
    }

    // 计算分数 (100 - 加权扣分)
    const score = Math.max(
      0,
      100 - summary.critical * 25 - summary.high * 15 - summary.medium * 8 - summary.low * 3 - summary.info * 1,
    )

    // 确定等级
    let grade: "A" | "B" | "C" | "D" | "F" = "A"
    if (score < 90) grade = "B"
    if (score < 80) grade = "C"
    if (score < 70) grade = "D"
    if (score < 60 || summary.critical > 0) grade = "F"

    return {
      findings: this.findings,
      summary,
      score,
      grade,
    }
  }

  // 生成审计报告
  generateReport(): string {
    const audit = this.performFullAudit("")

    let report = `
# SCSVS Security Audit Report
## Floating Point Protocol

### Executive Summary
- **Audit Score**: ${audit.score}/100
- **Grade**: ${audit.grade}
- **Total Findings**: ${audit.summary.total}
  - Critical: ${audit.summary.critical}
  - High: ${audit.summary.high}
  - Medium: ${audit.summary.medium}
  - Low: ${audit.summary.low}
  - Informational: ${audit.summary.info}

### Findings

`

    for (const finding of audit.findings) {
      report += `
#### ${finding.id}: ${finding.title}
- **Severity**: ${finding.severity}
- **Category**: ${finding.category}
- **Status**: ${finding.status}
- **Description**: ${finding.description}
- **Location**: ${finding.location}
- **Recommendation**: ${finding.recommendation}
${finding.cwe ? `- **CWE**: ${finding.cwe}` : ""}
${finding.cvss ? `- **CVSS**: ${finding.cvss}` : ""}

---
`
    }

    return report
  }
}

export const scsvAuditor = new SCSVSAuditor()

// ============ 实时安全监控 ============

export interface SecurityMetrics {
  transactionsPerHour: number
  uniqueUsersPerHour: number
  averageGasUsed: number
  failedTransactionRate: number
  suspiciousActivityCount: number
  lastSecurityIncident?: {
    timestamp: number
    type: string
    severity: Severity
  }
}

export class SecurityMonitor {
  private metrics: SecurityMetrics = {
    transactionsPerHour: 0,
    uniqueUsersPerHour: 0,
    averageGasUsed: 0,
    failedTransactionRate: 0,
    suspiciousActivityCount: 0,
  }

  private transactionLog: { timestamp: number; user: string; gasUsed: number; success: boolean }[] = []

  recordTransaction(user: string, gasUsed: number, success: boolean): void {
    const now = Date.now()
    this.transactionLog.push({ timestamp: now, user, gasUsed, success })

    // 清理1小时前的记录
    const oneHourAgo = now - 3600000
    this.transactionLog = this.transactionLog.filter((tx) => tx.timestamp > oneHourAgo)

    this.updateMetrics()
  }

  private updateMetrics(): void {
    const txs = this.transactionLog
    this.metrics.transactionsPerHour = txs.length
    this.metrics.uniqueUsersPerHour = new Set(txs.map((tx) => tx.user)).size
    this.metrics.averageGasUsed = txs.length > 0 ? txs.reduce((sum, tx) => sum + tx.gasUsed, 0) / txs.length : 0
    this.metrics.failedTransactionRate = txs.length > 0 ? txs.filter((tx) => !tx.success).length / txs.length : 0
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics }
  }

  detectAnomalies(): string[] {
    const anomalies: string[] = []

    if (this.metrics.failedTransactionRate > 0.1) {
      anomalies.push("High failed transaction rate detected")
    }

    if (this.metrics.transactionsPerHour > 1000) {
      anomalies.push("Unusually high transaction volume")
    }

    if (this.metrics.averageGasUsed > 500000) {
      anomalies.push("High average gas usage")
    }

    return anomalies
  }
}

export const securityMonitor = new SecurityMonitor()
