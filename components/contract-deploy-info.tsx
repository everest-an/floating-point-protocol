"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FPP_CONTRACT_ADDRESSES, SUPPORTED_CHAINS } from "@/lib/contract-abi"

export function ContractDeployInfo() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-black">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white/90">Smart Contract</h3>
            <p className="text-[10px] text-white/40 font-mono">FloatingPointProtocol.sol</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06]">
          {/* Network Addresses */}
          <div className="pt-4 space-y-3">
            <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">CONTRACT ADDRESSES</span>
            <div className="space-y-2">
              {SUPPORTED_CHAINS.map((chain) => (
                <div key={chain.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                  <div>
                    <span className="text-xs text-white/70">{chain.name}</span>
                    <span className="text-[10px] text-white/30 font-mono ml-2">({chain.symbol})</span>
                  </div>
                  <span className="text-[10px] text-violet-400/70 font-mono">
                    {FPP_CONTRACT_ADDRESSES[chain.id]?.slice(0, 10)}...
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Functions */}
          <div className="space-y-3">
            <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">CORE FUNCTIONS</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "generatePoints", desc: "Create new points" },
                { name: "privacyPayment", desc: "Anonymous transfer" },
                { name: "requestWithdrawal", desc: "Start withdrawal" },
                { name: "completeWithdrawal", desc: "Finish withdrawal" },
              ].map((fn) => (
                <div key={fn.name} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-violet-400 font-mono">{fn.name}()</span>
                  <p className="text-[9px] text-white/30 mt-0.5">{fn.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <span className="text-[9px] text-white/35 font-mono tracking-[0.15em]">PROTOCOL FEATURES</span>
            <div className="space-y-1.5 text-[10px] text-white/50 font-mono">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>Gravity-weighted random selection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>ZK-SNARK proof verification</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>Ring signature anonymity (k=5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>24-hour time-locked withdrawals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>Pedersen commitment scheme</span>
              </div>
            </div>
          </div>

          {/* Deploy Button */}
          <Button
            className="w-full bg-violet-600 hover:bg-violet-500 text-white border-0 h-10 mt-2"
            onClick={() => window.open("https://remix.ethereum.org", "_blank")}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in Remix IDE
          </Button>
        </div>
      )}
    </div>
  )
}
