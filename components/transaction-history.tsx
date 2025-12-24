"use client"

import { useFPP } from "@/lib/fpp-context"

export function TransactionHistory() {
  const { state } = useFPP()
  const { transactions } = state

  return (
    <div className="mt-6 rounded-lg border border-white/[0.06] bg-black overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="font-medium text-sm text-white/90">Transaction History</h2>
          <p className="text-[9px] text-white/25 mt-0.5 font-mono tracking-[0.15em]">PRIVACY PAYMENTS WITH ZK PROOFS</p>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/[0.06] text-[10px] text-white/40 font-mono">
          {transactions.length} TXS
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="p-12 text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
            <div className="absolute inset-2 rounded-full border border-dashed border-violet-500/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
            </div>
          </div>
          <p className="mt-5 text-white/35 text-sm">No transactions yet</p>
          <p className="text-[10px] text-white/20 mt-1 font-mono">Select floating points to initiate payment</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
          {transactions.map((tx) => (
            <div key={tx.id} className="px-5 py-4 hover:bg-white/[0.015] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center relative ${
                      tx.status === "confirmed"
                        ? "bg-emerald-500/10"
                        : tx.status === "failed"
                          ? "bg-red-500/10"
                          : "bg-amber-500/10"
                    }`}
                  >
                    {tx.status === "confirmed" && (
                      <>
                        <div className="absolute inset-0 rounded-full border border-emerald-500/25" />
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                    {tx.status === "failed" && (
                      <>
                        <div className="absolute inset-0 rounded-full border border-red-500/25" />
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </>
                    )}
                    {!["confirmed", "failed"].includes(tx.status) && (
                      <svg
                        className="w-4 h-4 text-amber-400 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-white/85">
                      {tx.type === "deposit"
                        ? "Point Generation"
                        : tx.type === "withdrawal"
                          ? "Withdrawal"
                          : "Privacy Payment"}
                    </div>
                    <div className="text-[9px] text-white/25 font-mono mt-0.5">{tx.id}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-white">${tx.amount}</div>
                  <div className="text-[9px] text-white/25 font-mono mt-0.5">
                    {tx.pointIds.length} points | {new Date(tx.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Status & Proof Badge */}
              <div className="mt-3 flex items-center gap-3">
                {/* Transaction Type Badge */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                    tx.type === "deposit"
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : tx.type === "withdrawal"
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-violet-500/10 border border-violet-500/20"
                  }`}
                >
                  <span
                    className={`text-[9px] font-mono tracking-[0.1em] ${
                      tx.type === "deposit"
                        ? "text-emerald-400"
                        : tx.type === "withdrawal"
                          ? "text-amber-400"
                          : "text-violet-400"
                    }`}
                  >
                    {tx.type.toUpperCase()}
                  </span>
                </div>

                {/* ZK Verified Badge */}
                {tx.status === "confirmed" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
                    <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="text-[9px] text-violet-400 font-mono tracking-[0.1em]">ZK VERIFIED</span>
                  </div>
                )}

                {/* TX Hash */}
                {tx.txHash && (
                  <div className="text-[9px] text-white/15 font-mono truncate max-w-[150px]">TX: {tx.txHash}</div>
                )}
              </div>

              {/* Recipient if payment */}
              {tx.recipient && <div className="mt-2 text-[9px] text-white/20 font-mono">To: {tx.recipient}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
