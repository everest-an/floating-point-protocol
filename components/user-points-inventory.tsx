"use client"

import { useState } from "react"
import { useFPP } from "@/lib/fpp-context"
import type { FloatingPoint } from "@/lib/fpp-types"

export function UserPointsInventory() {
  const { state, togglePointSelection, setActivePointDetail } = useFPP()
  const { userPoints, selectedPointIds } = state
  const [sortBy, setSortBy] = useState<"date" | "mass" | "gravity">("date")

  const sortedPoints = [...userPoints].sort((a, b) => {
    if (sortBy === "date") return b.createdAt - a.createdAt
    if (sortBy === "mass") return b.mass - a.mass
    return b.gravityWeight - a.gravityWeight
  })

  const totalValue = userPoints.length * 10
  const selectedValue = selectedPointIds.filter((id) => userPoints.some((p) => p.id === id)).length * 10

  if (userPoints.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-white/[0.06] overflow-hidden bg-black">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <h2 className="font-medium text-sm text-white/90">Your Points</h2>
          <p className="text-[9px] text-white/25 mt-0.5 font-mono tracking-[0.15em]">INVENTORY</p>
        </div>
        <div className="p-8 text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div
              className="absolute inset-2 rounded-full border border-dashed border-violet-500/30 animate-spin"
              style={{ animationDuration: "8s" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/30" />
            </div>
          </div>
          <p className="mt-4 text-white/40 text-sm">No points yet</p>
          <p className="text-[10px] text-white/20 mt-1 font-mono">Deposit ETH to generate floating points</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5 rounded-lg border border-white/[0.06] overflow-hidden bg-black">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="font-medium text-sm text-white/90">Your Points</h2>
          <p className="text-[9px] text-white/25 mt-0.5 font-mono tracking-[0.15em]">
            {userPoints.length} POINTS | ${totalValue} VALUE
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedValue > 0 && (
            <span className="px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
              ${selectedValue} SELECTED
            </span>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "mass" | "gravity")}
            className="px-2 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-white/50 text-[10px] font-mono cursor-pointer hover:border-violet-500/30 focus:outline-none focus:border-violet-500/50"
          >
            <option value="date">Newest</option>
            <option value="mass">Mass</option>
            <option value="gravity">Gravity</option>
          </select>
        </div>
      </div>

      {/* Points Grid */}
      <div className="p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto">
        {sortedPoints.map((point) => (
          <PointChip
            key={point.id}
            point={point}
            isSelected={selectedPointIds.includes(point.id)}
            onSelect={() => togglePointSelection(point.id)}
            onDetail={() => setActivePointDetail(point)}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
        <button
          onClick={() => {
            userPoints.forEach((p) => {
              if (!selectedPointIds.includes(p.id)) {
                togglePointSelection(p.id)
              }
            })
          }}
          className="text-[10px] text-violet-400 font-mono hover:text-violet-300 transition-colors"
        >
          Select All
        </button>
        <button
          onClick={() => {
            userPoints.forEach((p) => {
              if (selectedPointIds.includes(p.id)) {
                togglePointSelection(p.id)
              }
            })
          }}
          className="text-[10px] text-white/40 font-mono hover:text-white/60 transition-colors"
        >
          Clear Selection
        </button>
      </div>
    </div>
  )
}

function PointChip({
  point,
  isSelected,
  onSelect,
  onDetail,
}: {
  point: FloatingPoint
  isSelected: boolean
  onSelect: () => void
  onDetail: () => void
}) {
  return (
    <button
      onClick={onSelect}
      onDoubleClick={onDetail}
      className={`relative aspect-square rounded-lg border transition-all group ${
        isSelected
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-white/[0.06] bg-white/[0.02] hover:border-violet-500/30 hover:bg-violet-500/5"
      }`}
    >
      {/* Point visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`rounded-full transition-all ${
            isSelected ? "w-3 h-3 bg-emerald-400 shadow-lg shadow-emerald-500/30" : "w-2 h-2 bg-violet-400/80"
          }`}
        />
      </div>

      {/* Mass indicator */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-violet-500/40"
        style={{ width: `${Math.min(80, point.mass * 40)}%` }}
      />

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1">
          <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Hover tooltip */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/90 border border-white/10 text-[8px] font-mono text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        ${point.value} | m={point.mass.toFixed(1)}
      </div>
    </button>
  )
}
