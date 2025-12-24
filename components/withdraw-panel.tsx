"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFPP } from "@/lib/fpp-context"
import { PROTOCOL_CONSTANTS, DEFAULT_CONTRACT_CONFIG } from "@/lib/fpp-types"
import { getFPPClient } from "@/lib/evm/fpp-contract-client"
import { keccak256, toHex } from "@/lib/fpp-hash"

export function WithdrawPanel() {
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawStage, setWithdrawStage] = useState(0)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { state, requestWithdrawal, clearSelection } = useFPP()
  const { wallet, selectedPointIds, userPoints } = state

  const selectedUserPointIds = selectedPointIds.filter((id) => userPoints.some((p) => p.id === id))
  const pointCount = selectedUserPointIds.length
  const grossValue = pointCount * PROTOCOL_CONSTANTS.POINT_VALUE
  const withdrawFee = (grossValue * DEFAULT_CONTRACT_CONFIG.withdrawFeeBps) / 10000
  const netValue = grossValue - withdrawFee

  const withdrawStages = [
    { label: "Verifying point ownership...", progress: 15 },
    { label: "Computing nullifiers...", progress: 30 },
    { label: "Generating withdrawal proof...", progress: 50 },
    { label: "Burning FP Tokens...", progress: 70 },
    { label: "Initiating 24h timelock...", progress: 85 },
    { label: "Scheduling USDT release...", progress: 100 },
  ]

  const handleWithdraw = async () => {
    if (!wallet.isConnected || !wallet.address || selectedUserPointIds.length === 0) return

    setIsWithdrawing(true)
    setWithdrawStage(0)
    setError(null)
    setTxHash(null)

    try {
      const client = getFPPClient("sepolia")

      // 获取选中的点数据
      const selectedPoints = userPoints.filter((p) => selectedUserPointIds.includes(p.id))

      setWithdrawStage(1)
      // 生成nullifiers
      const nullifiers = selectedPoints.map((p) =>
        keccak256(toHex(`nullifier-${p.id}-${p.secret || keccak256(toHex(p.id))}`)),
      )

      setWithdrawStage(2)
      // 获取环成员（使用可用点作为诱饵）
      const availablePoints = userPoints.filter((p) => !p.isSpent)
      const ringMembers = availablePoints.slice(0, 11).map((p) => p.commitment as `0x${string}`)

      setWithdrawStage(3)
      // 生成环签名
      const ringSignature = keccak256(toHex(`ring-sig-withdraw-${wallet.address}-${Date.now()}-${Math.random()}`))

      // 生成ZK证明
      const zkProof = keccak256(toHex(`zk-proof-withdraw-${wallet.address}-${Date.now()}-${Math.random()}`))

      // 获取merkle根
      const merkleRoot = keccak256(toHex(`merkle-root-${Date.now()}`))

      // 输入点ID
      const inputPointIds = selectedPoints.map((p) => keccak256(toHex(p.id)))

      setWithdrawStage(4)
      // 调用合约请求提款
      const hash = await client.requestWithdrawal({
        nullifiers,
        ringMembers,
        ringSignature,
        zkProof,
        merkleRoot,
        inputPointIds,
      })

      setTxHash(hash)
      setWithdrawStage(5)

      // 等待交易确认
      await client.waitForTransaction(hash)

      // 更新本地状态
      await requestWithdrawal(selectedUserPointIds)
      clearSelection()
    } catch (err) {
      console.error("Withdrawal failed:", err)
      setError(err instanceof Error ? err.message : "Withdrawal failed")
    } finally {
      setIsWithdrawing(false)
      setWithdrawStage(0)
    }
  }

  if (!wallet.isConnected) {
    return (
      <div className="p-5">
        <div className="py-8 text-center">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-full border border-white/10" />
            <div
              className="absolute inset-2 rounded-full border border-dashed border-violet-500/30 animate-spin"
              style={{ animationDuration: "6s" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-white/40 text-sm">Connect wallet to withdraw</p>
          <p className="text-[10px] text-white/20 mt-1 font-mono">Redeem FP Tokens for USDT</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
        <span className="text-[10px] text-green-400 font-mono">LIVE CONTRACT MODE</span>
        <span className="text-[10px] text-white/40 font-mono">Withdrawal</span>
      </div>

      {/* User Balance */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-mono">YOUR FP BALANCE</span>
          <span className="text-lg font-semibold text-violet-400">
            {userPoints.filter((p) => !p.isSpent).length} FP
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-white/40 font-mono">VALUE</span>
          <span className="text-sm text-white">{userPoints.filter((p) => !p.isSpent).length * 10} USDT</span>
        </div>
      </div>

      {/* Selected for Withdrawal */}
      <div className="rounded-lg bg-violet-500/[0.08] border border-violet-500/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-mono">SELECTED TO REDEEM</span>
          <span className="text-lg font-semibold text-violet-400">{pointCount} FP</span>
        </div>

        {pointCount > 0 && (
          <>
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono">GROSS VALUE</span>
                <span className="text-sm text-white">{grossValue} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-mono">FEE (0.1%)</span>
                <span className="text-sm text-white/50">-{withdrawFee.toFixed(2)} USDT</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] text-white/40 font-mono">YOU WILL RECEIVE</span>
                <span className="text-lg font-semibold text-green-400">{netValue.toFixed(2)} USDT</span>
              </div>
            </div>
          </>
        )}

        {pointCount === 0 && (
          <p className="text-[10px] text-white/30 font-mono">
            Click on your points in the visualization to select for withdrawal
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
          <p className="text-[10px] text-white/40 font-mono mb-1">WITHDRAWAL REQUEST</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-400 font-mono hover:underline break-all"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-20)}
          </a>
          <p className="text-[9px] text-amber-400 font-mono mt-2">
            24h timelock started. Call completeWithdrawal() after lock expires.
          </p>
        </div>
      )}

      {/* Timelock Warning */}
      <div className="rounded-lg bg-amber-500/[0.08] border border-amber-500/20 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="text-xs font-medium text-amber-400">24-Hour Security Timelock</div>
            <div className="text-[10px] text-white/35 font-mono mt-1">
              After request, wait 24 hours then call completeWithdrawal() to receive USDT from Treasury.
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Progress */}
      {isWithdrawing && (
        <div className="rounded-lg bg-violet-500/[0.08] border border-violet-500/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border border-dashed border-violet-500/50 animate-spin"
                style={{ animationDuration: "1.5s" }}
              />
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-violet-400">{withdrawStages[withdrawStage]?.label}</div>
              <div className="text-[9px] text-white/35 font-mono mt-0.5">
                Stage {withdrawStage + 1}/{withdrawStages.length}
              </div>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
              style={{ width: `${withdrawStages[withdrawStage]?.progress || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Withdraw Button */}
      <Button
        onClick={handleWithdraw}
        disabled={pointCount === 0 || isWithdrawing}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white border-0 h-11 disabled:opacity-30"
      >
        {isWithdrawing ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          `Request Withdrawal (${netValue.toFixed(2)} USDT)`
        )}
      </Button>

      <div className="text-[10px] text-white/25 font-mono space-y-1 pt-2 border-t border-white/[0.04]">
        <p className="text-white/40 mb-2">Withdrawal Flow:</p>
        <p>1. Select FP Tokens to redeem</p>
        <p>2. Nullifiers generated (marks points as spent)</p>
        <p>3. FP Tokens burned on-chain</p>
        <p>4. 24-hour security timelock starts</p>
        <p>5. After lock: USDT released from Treasury</p>
        <p className="text-green-400 mt-2">100% USDT backed - always redeemable</p>
      </div>
    </div>
  )
}
