"use client"

import { useFPP } from "@/lib/fpp-context"

const DEFAULT_STATS = {
  totalValueLocked: 0,
  activePoints: 0,
  transactions24h: 0,
  privacyScore: 0,
}

export function ProtocolStats() {
  const { state } = useFPP()
  const { stats, availablePoints, userPoints } = state

  const safeStats = stats ?? DEFAULT_STATS
  const safeAvailablePoints = availablePoints ?? []
  const safeUserPoints = userPoints ?? []

  return (
    <div className="space-y-3">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Value Locked"
          value={`$${(safeStats.totalValueLocked ?? 0).toLocaleString()}`}
          change="+12.5%"
          positive
        />
        <StatCard
          label="Active Floating Points"
          value={(safeAvailablePoints.length ?? 0).toLocaleString()}
          subValue={safeUserPoints.length > 0 ? `${safeUserPoints.length} yours` : undefined}
          change="+2.3%"
          positive
        />
        <StatCard
          label="24h Transactions"
          value={(safeStats.transactions24h ?? 0).toLocaleString()}
          change="+8.1%"
          positive
        />
        <StatCard label="Privacy Score" value={`${safeStats.privacyScore ?? 0}%`} indicator="shield" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Points" value={(safeStats.activePoints ?? 0).toLocaleString()} subValue="in protocol" />
        <StatCard
          label="Your Balance"
          value={safeUserPoints.reduce((sum, p) => sum + (p?.value ?? 0), 0).toLocaleString()}
          subValue="FP tokens"
        />
        <StatCard
          label="Total Transactions"
          value={(safeStats.transactions24h ?? 0).toLocaleString()}
          subValue="last 24h"
        />
        <StatCard label="Avg Ring Size" value="8" subValue="members per tx" indicator="ring" />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  subValue,
  change,
  positive,
  indicator,
}: {
  label: string
  value: string
  subValue?: string
  change?: string
  positive?: boolean
  indicator?: string
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-4 hover:bg-white/[0.03] hover:border-violet-500/20 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-white/35 font-mono tracking-[0.12em] uppercase">{label}</span>
        {change && (
          <span className={`text-[10px] font-mono ${positive ? "text-emerald-400/80" : "text-red-400/80"}`}>
            {change}
          </span>
        )}
        {indicator === "shield" && (
          <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        {indicator === "ring" && (
          <div className="w-4 h-4 rounded-full border border-violet-400/50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          </div>
        )}
      </div>
      <div className="mt-2 text-xl font-semibold text-white group-hover:text-violet-100 transition-colors">{value}</div>
      {subValue && <div className="mt-1 text-[10px] text-emerald-400/70 font-mono">{subValue}</div>}
    </div>
  )
}

function MerkleCard({
  label,
  hash,
  color,
}: {
  label: string
  hash: string | null
  color: "violet" | "amber"
}) {
  const colorClasses = {
    violet: {
      border: "border-violet-500/20",
      bg: "bg-violet-500/5",
      text: "text-violet-400",
      dot: "bg-violet-400",
    },
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      text: "text-amber-400",
      dot: "bg-amber-400",
    },
  }

  const colors = colorClasses[color]

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} p-4 hover:bg-white/[0.03] transition-all duration-300 group`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-white/35 font-mono tracking-[0.12em] uppercase">{label}</span>
        <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
      </div>
      <div className="mt-2">
        {hash ? (
          <div className={`font-mono text-[10px] ${colors.text} truncate`} title={hash}>
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </div>
        ) : (
          <div className="text-[10px] text-white/30 font-mono">Initializing...</div>
        )}
      </div>
      <div className="mt-1 text-[9px] text-white/20 font-mono">{hash ? "Verified on-chain" : "Pending"}</div>
    </div>
  )
}
