"use client"

import type { FloatingPoint } from "@/lib/fpp-types"
import { useFPP } from "@/lib/fpp-context"
import { Button } from "@/components/ui/button"
import { calculateGravityWeight } from "@/lib/fpp-crypto"
import { globalCommitmentTree } from "@/lib/fpp-merkle"

interface PointDetailModalProps {
  point: FloatingPoint
  onClose: () => void
}

export function PointDetailModal({ point, onClose }: PointDetailModalProps) {
  const { state, togglePointSelection } = useFPP()
  const { selectedPointIds, userPoints } = state
  const isSelected = selectedPointIds.includes(point.id)
  const isOwned = userPoints.some((p) => p.id === point.id)

  const createdDate = new Date(point.createdAt)
  const ageInDays = Math.floor((Date.now() - point.createdAt) / (1000 * 60 * 60 * 24))
  const ageInHours = Math.floor((Date.now() - point.createdAt) / (1000 * 60 * 60))

  const realGravityWeight = calculateGravityWeight({ mass: point.mass, createdAt: point.createdAt })

  const merkleProof = globalCommitmentTree.getProof(point.commitment)
  const merkleRoot = globalCommitmentTree.getRoot()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-white/[0.08] bg-black/95 backdrop-blur-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.06]">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-violet-500/20 blur-3xl" />

          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-[9px] text-white/35 font-mono tracking-[0.2em]">FLOATING POINT</span>
              <h2 className="text-lg font-semibold text-white mt-1">Point Details</h2>
              {isOwned && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono">
                  YOU OWN THIS
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Point ID */}
          <div className="space-y-2">
            <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">POINT ID</span>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="font-mono text-sm text-violet-400 flex-1 truncate">{point.id}</span>
              <button
                onClick={() => navigator.clipboard.writeText(point.id)}
                className="p-1.5 rounded hover:bg-white/[0.05] text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Commitment Hash */}
          <div className="space-y-2">
            <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">PEDERSEN COMMITMENT</span>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="font-mono text-xs text-white/60 break-all">{point.commitment}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">MERKLE PROOF</span>
              {merkleProof && (
                <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-mono">
                  VERIFIED
                </span>
              )}
            </div>
            <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono">Merkle Root:</span>
                <span className="font-mono text-[10px] text-violet-400">
                  {merkleRoot ? `${merkleRoot.slice(0, 8)}...${merkleRoot.slice(-6)}` : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono">Proof Path:</span>
                <span className="font-mono text-[10px] text-white/60">
                  {merkleProof ? `${merkleProof.path.length} nodes` : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono">Inclusion:</span>
                <span className={`font-mono text-[10px] ${merkleProof ? "text-green-400" : "text-red-400"}`}>
                  {merkleProof ? "Confirmed in tree" : "Not found"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] text-white/35 font-mono tracking-[0.15em] block">VALUE</span>
              <span className="text-2xl font-semibold text-white mt-1 block">${point.value}</span>
              <span className="text-[10px] text-white/30 font-mono">USD</span>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] text-white/35 font-mono tracking-[0.15em] block">MASS</span>
              <span className="text-2xl font-semibold text-violet-400 mt-1 block">{point.mass.toFixed(2)}</span>
              <span className="text-[10px] text-white/30 font-mono">kg (simulated)</span>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] text-white/35 font-mono tracking-[0.15em] block">AGE</span>
              <span className="text-2xl font-semibold text-white mt-1 block">
                {ageInDays > 0 ? ageInDays : ageInHours}
              </span>
              <span className="text-[10px] text-white/30 font-mono">{ageInDays > 0 ? "Days" : "Hours"}</span>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[9px] text-white/35 font-mono tracking-[0.15em] block">STATUS</span>
              <span
                className={`text-2xl font-semibold mt-1 block ${point.isSpent ? "text-red-400" : "text-emerald-400"}`}
              >
                {point.isSpent ? "Spent" : "Active"}
              </span>
              <span className="text-[10px] text-white/30 font-mono">{isOwned ? "Owned" : "Pool"}</span>
            </div>
          </div>

          {/* Gravity Weight Visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">GRAVITY WEIGHT</span>
              <span className="text-xs text-violet-400 font-mono">{realGravityWeight.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400"
                style={{ width: `${Math.min(100, (realGravityWeight / 50) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-white/30 font-mono">
              Weight = mass × √(age + 1) × 10 | Higher weight = higher selection probability
            </p>
          </div>

          {/* Created Date */}
          <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
            <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">CREATED</span>
            <span className="text-sm text-white/60 font-mono">
              {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white h-11"
          >
            Close
          </Button>
          {!point.isSpent && (
            <Button
              onClick={() => {
                togglePointSelection(point.id)
                onClose()
              }}
              className={`flex-1 h-11 ${
                isSelected
                  ? "bg-white/10 text-violet-400 border border-violet-500/30 hover:bg-violet-500/20"
                  : "bg-violet-600 hover:bg-violet-500 text-white border-0"
              }`}
            >
              {isSelected ? "Deselect Point" : "Select for Payment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
