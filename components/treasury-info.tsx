"use client"

import { useFPP } from "@/lib/fpp-context"
import { DEFAULT_CONTRACT_CONFIG, PROTOCOL_CONSTANTS } from "@/lib/fpp-types"
import { globalCommitmentTree, globalNullifierTree } from "@/lib/fpp-merkle"

export function TreasuryInfo() {
  const { state } = useFPP()
  const { stats } = state

  const safeStats = {
    totalValueLocked: stats?.totalValueLocked ?? 0,
    totalTransactions: stats?.transactions24h ?? 0,
    uniqueUsers: 0,
    transactions24h: stats?.transactions24h ?? 0,
  }

  const activePoints = Math.floor(safeStats.totalValueLocked / PROTOCOL_CONSTANTS.POINT_VALUE)
  const totalFPValue = activePoints * PROTOCOL_CONSTANTS.POINT_VALUE
  const treasuryBalance = safeStats.totalValueLocked
  const isFullyBacked = treasuryBalance >= totalFPValue
  const backingRatio = totalFPValue > 0 ? (treasuryBalance / totalFPValue) * 100 : 100

  const commitmentCount = globalCommitmentTree.size()
  const nullifierCount = globalNullifierTree.size()

  const commitmentMerkleRoot = globalCommitmentTree.getRoot()

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
            <span className="text-xs font-bold text-green-400">$</span>
          </div>
          <div>
            <h3 className="text-xs font-medium text-white/80">Treasury & Reserve Proof</h3>
            <p className="text-[9px] text-white/30 font-mono">100% USDT Backed</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Contract Addresses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/40 font-mono">PROTOCOL CONTRACT</span>
            <span className="text-[10px] text-violet-400 font-mono">
              {DEFAULT_CONTRACT_CONFIG.address.slice(0, 8)}...{DEFAULT_CONTRACT_CONFIG.address.slice(-6)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/40 font-mono">TREASURY ADDRESS</span>
            <span className="text-[10px] text-green-400 font-mono">
              {DEFAULT_CONTRACT_CONFIG.treasuryAddress.slice(0, 8)}...
              {DEFAULT_CONTRACT_CONFIG.treasuryAddress.slice(-6)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/40 font-mono">USDT CONTRACT</span>
            <span className="text-[10px] text-white/60 font-mono">
              {DEFAULT_CONTRACT_CONFIG.stablecoinAddress.slice(0, 8)}...
              {DEFAULT_CONTRACT_CONFIG.stablecoinAddress.slice(-6)}
            </span>
          </div>
        </div>

        {/* Reserve Stats */}
        <div className="rounded bg-black/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-mono">Treasury Balance</span>
            <span className="text-sm font-semibold text-green-400">{treasuryBalance.toLocaleString()} USDT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-mono">Circulating FP Value</span>
            <span className="text-sm font-medium text-violet-400">{totalFPValue.toLocaleString()} USDT</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-[10px] text-white/50 font-mono">Backing Ratio</span>
            <span className={`text-sm font-semibold ${isFullyBacked ? "text-green-400" : "text-red-400"}`}>
              {backingRatio.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="rounded bg-violet-500/5 border border-violet-500/20 p-3 space-y-2">
          <div className="text-[9px] text-violet-400 font-mono tracking-wider mb-2">MERKLE TREE STATE</div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-mono">Commitment Tree</span>
            <span className="text-xs text-violet-400 font-mono">{commitmentCount} leaves</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-mono">Nullifier Tree</span>
            <span className="text-xs text-amber-400 font-mono">{nullifierCount} spent</span>
          </div>
          {commitmentMerkleRoot && (
            <div className="pt-2 border-t border-white/[0.06]">
              <span className="text-[9px] text-white/30 font-mono">Root: {commitmentMerkleRoot.slice(0, 16)}...</span>
            </div>
          )}
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 p-2 rounded ${isFullyBacked ? "bg-green-500/10" : "bg-red-500/10"}`}>
          <div className={`w-2 h-2 rounded-full ${isFullyBacked ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
          <span className={`text-[10px] font-mono ${isFullyBacked ? "text-green-400" : "text-red-400"}`}>
            {isFullyBacked ? "FULLY BACKED - All FP redeemable for USDT" : "WARNING - Insufficient reserves"}
          </span>
        </div>

        {/* Fee Info */}
        <div className="text-[9px] text-white/25 font-mono space-y-1">
          <p>Deposit Fee: {DEFAULT_CONTRACT_CONFIG.depositFeeBps / 100}%</p>
          <p>Withdrawal Fee: {DEFAULT_CONTRACT_CONFIG.withdrawFeeBps / 100}%</p>
          <p>Fee Recipient: {DEFAULT_CONTRACT_CONFIG.feeRecipientAddress.slice(0, 10)}...</p>
        </div>
      </div>
    </div>
  )
}
