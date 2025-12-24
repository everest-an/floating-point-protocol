"use client"

import { useState } from "react"
import { PaymentPanel } from "./payment-panel"
import { DepositPanel } from "./deposit-panel"
import { WithdrawPanel } from "./withdraw-panel"
import { TreasuryInfo } from "./treasury-info"

export function SidePanel() {
  const [activeTab, setActiveTab] = useState<"send" | "deposit" | "withdraw">("deposit")

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/[0.06] overflow-hidden bg-black">
        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 px-3 py-3 text-[9px] font-mono tracking-[0.12em] transition-all ${
              activeTab === "deposit"
                ? "text-green-400 bg-green-500/5 border-b border-green-500"
                : "text-white/35 hover:text-white/50"
            }`}
          >
            BUY FP
          </button>
          <button
            onClick={() => setActiveTab("send")}
            className={`flex-1 px-3 py-3 text-[9px] font-mono tracking-[0.12em] transition-all ${
              activeTab === "send"
                ? "text-violet-400 bg-violet-500/5 border-b border-violet-500"
                : "text-white/35 hover:text-white/50"
            }`}
          >
            SEND
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 px-3 py-3 text-[9px] font-mono tracking-[0.12em] transition-all ${
              activeTab === "withdraw"
                ? "text-amber-400 bg-amber-500/5 border-b border-amber-500"
                : "text-white/35 hover:text-white/50"
            }`}
          >
            REDEEM
          </button>
        </div>

        {activeTab === "deposit" && <DepositPanel />}
        {activeTab === "send" && <PaymentPanel />}
        {activeTab === "withdraw" && <WithdrawPanel />}
      </div>

      <TreasuryInfo />
    </div>
  )
}
