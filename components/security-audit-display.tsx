"use client"

import { useState, useEffect } from "react"
import { Shield, AlertTriangle, CheckCircle, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { performFullSecurityAudit, type SecurityAuditResult } from "@/lib/fpp-comprehensive-security"

interface SecurityAuditDisplayProps {
  userAddress?: string
  operation: "deposit" | "payment" | "withdrawal"
  amount: number
  recipientAddress?: string
  onAuditComplete?: (result: SecurityAuditResult) => void
}

export function SecurityAuditDisplay({
  userAddress,
  operation,
  amount,
  recipientAddress,
  onAuditComplete,
}: SecurityAuditDisplayProps) {
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const runAudit = async () => {
    if (!userAddress) return

    setIsLoading(true)
    try {
      const result = await performFullSecurityAudit({
        userAddress,
        operation,
        amount,
        recipientAddress,
      })
      setAuditResult(result)
      onAuditComplete?.(result)
    } catch (error) {
      console.error("Security audit failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userAddress && amount > 0) {
      runAudit()
    }
  }, [userAddress, operation, amount, recipientAddress])

  if (!auditResult) {
    return (
      <div className="border border-violet-500/20 rounded-lg p-4 bg-black/50">
        <div className="flex items-center gap-2 text-violet-300">
          <Shield className="w-4 h-4 animate-pulse" />
          <span className="text-sm">{isLoading ? "Running security audit..." : "Security audit pending"}</span>
        </div>
      </div>
    )
  }

  const gradeColors: Record<string, string> = {
    A: "text-green-400 border-green-500/50 bg-green-500/10",
    B: "text-blue-400 border-blue-500/50 bg-blue-500/10",
    C: "text-yellow-400 border-yellow-500/50 bg-yellow-500/10",
    D: "text-orange-400 border-orange-500/50 bg-orange-500/10",
    F: "text-red-400 border-red-500/50 bg-red-500/10",
  }

  const StatusIcon = ({ status }: { status: "PASS" | "WARN" | "FAIL" }) => {
    if (status === "PASS") return <CheckCircle className="w-4 h-4 text-green-400" />
    if (status === "WARN") return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    return <XCircle className="w-4 h-4 text-red-400" />
  }

  return (
    <div
      className={`border rounded-lg p-4 bg-black/50 ${gradeColors[auditResult.grade].split(" ").slice(1).join(" ")}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 ${gradeColors[auditResult.grade].split(" ")[0]}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${gradeColors[auditResult.grade].split(" ")[0]}`}>
                {auditResult.grade}
              </span>
              <span className="text-sm text-violet-300">Security Score: {auditResult.overallScore}/100</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-violet-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Critical Issues */}
      {auditResult.criticalIssues.length > 0 && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
          <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
            <XCircle className="w-4 h-4" />
            Critical Issues ({auditResult.criticalIssues.length})
          </div>
          <ul className="text-sm text-red-300 space-y-1">
            {auditResult.criticalIssues.map((issue, i) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <>
          {/* Category Scores */}
          <div className="space-y-2 mb-4">
            {auditResult.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <StatusIcon status={cat.status} />
                  <span className="text-violet-300">{cat.name}</span>
                </div>
                <span
                  className={`font-mono ${
                    cat.score >= 80 ? "text-green-400" : cat.score >= 60 ? "text-yellow-400" : "text-red-400"
                  }`}
                >
                  {cat.score}%
                </span>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {auditResult.recommendations.length > 0 && (
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded">
              <div className="flex items-center gap-2 text-violet-400 font-medium mb-2">
                <Info className="w-4 h-4" />
                Recommendations
              </div>
              <ul className="text-sm text-violet-300/80 space-y-1">
                {auditResult.recommendations.slice(0, 5).map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}
                {auditResult.recommendations.length > 5 && (
                  <li className="text-violet-400">+ {auditResult.recommendations.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Refresh Button */}
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={runAudit} disabled={isLoading} className="text-violet-400 text-xs">
          {isLoading ? "Auditing..." : "Re-run Audit"}
        </Button>
      </div>
    </div>
  )
}
