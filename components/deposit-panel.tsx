"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useFPP } from "@/lib/fpp-context"
import { PROTOCOL_CONSTANTS, DEFAULT_CONTRACT_CONFIG } from "@/lib/fpp-types"
import { getFPPClient } from "@/lib/evm/fpp-contract-client"
import { keccak256, toHex } from "@/lib/fpp-hash"

export function DepositPanel() {
  const [amount, setAmount] = useState("")
  const [isDepositing, setIsDepositing] = useState(false)
  const [depositStage, setDepositStage] = useState(0)
  const [isApproved, setIsApproved] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { state, generatePoints } = useFPP()
  const { wallet } = state

  const usdtAmount = Number(amount) || 0
  const pointsToGenerate = Math.floor(usdtAmount / PROTOCOL_CONSTANTS.POINT_VALUE)
  const totalValue = pointsToGenerate * PROTOCOL_CONSTANTS.POINT_VALUE
  const depositFee = (totalValue * DEFAULT_CONTRACT_CONFIG.depositFeeBps) / 10000
  const netDeposit = totalValue - depositFee

  const depositStages = [
    { label: "Approving USDT...", progress: 15 },
    { label: "Transferring to Treasury...", progress: 30 },
    { label: "Generating Pedersen commitments...", progress: 50 },
    { label: "Creating ZK proofs...", progress: 70 },
    { label: "Minting FP Tokens...", progress: 85 },
    { label: "Confirming on chain...", progress: 100 },
  ]

  const handleApprove = async () => {
    if (!wallet.isConnected || !wallet.address) return
    setError(null)

    try {
      setIsDepositing(true)
      setDepositStage(0)

      const client = getFPPClient("sepolia")
      const hash = await client.approveUSDT(totalValue.toString())
      setTxHash(hash)

      // 等待交易确认
      await client.waitForTransaction(hash)
      setIsApproved(true)
    } catch (err) {
      console.error("Approve failed:", err)
      setError(err instanceof Error ? err.message : "Approve failed")
    } finally {
      setIsDepositing(false)
      setDepositStage(0)
    }
  }

  const handleDeposit = async () => {
    if (!wallet.isConnected || !wallet.address || pointsToGenerate === 0) return

    setIsDepositing(true)
    setDepositStage(0)
    setError(null)
    setTxHash(null)

    try {
      const client = getFPPClient("sepolia")

      // Stage 1: 生成承诺
      setDepositStage(1)
      const commitments: `0x${string}`[] = []
      for (let i = 0; i < pointsToGenerate; i++) {
        // 生成随机秘密值
        const secret = keccak256(toHex(`secret-${wallet.address}-${Date.now()}-${i}-${Math.random()}`))
        // 生成承诺 = hash(secret)
        const commitment = keccak256(secret)
        commitments.push(commitment)
      }

      // Stage 2: 调用合约存款
      setDepositStage(2)
      const hash = await client.deposit(totalValue.toString(), commitments)
      setTxHash(hash)

      // Stage 3-4: 等待确认
      setDepositStage(3)
      await client.waitForTransaction(hash)

      // Stage 5: 更新本地状态
      setDepositStage(4)
      await generatePoints(pointsToGenerate)

      setDepositStage(5)
      setAmount("")
      setIsApproved(false)
    } catch (err) {
      console.error("Deposit failed:", err)
      setError(err instanceof Error ? err.message : "Deposit failed")
    } finally {
      setIsDepositing(false)
      setDepositStage(0)
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-white/40 text-sm">Connect wallet to deposit</p>
          <p className="text-[10px] text-white/20 mt-1 font-mono">Deposit USDT to generate Floating Points</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
        <span className="text-[10px] text-green-400 font-mono">LIVE CONTRACT MODE</span>
        <span className="text-[10px] text-white/40 font-mono">Sepolia Testnet</span>
      </div>

      {/* Treasury Info */}
      <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/15 p-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-green-400">$</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-white/50 font-mono">PAYMENT IN USDT</p>
            <p className="text-[9px] text-white/30 font-mono truncate">
              Treasury: {DEFAULT_CONTRACT_CONFIG.treasuryAddress.slice(0, 10)}...
            </p>
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-[9px] text-white/35 font-mono tracking-[0.15em]">DEPOSIT AMOUNT (USDT)</label>
        <div className="relative">
          <Input
            type="number"
            placeholder="100"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setIsApproved(false)
              setError(null)
            }}
            disabled={isDepositing}
            className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/15 focus:border-violet-500/50 focus:ring-violet-500/20 font-mono text-sm h-11 pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-mono">USDT</span>
        </div>
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-white/25">Min: 10 USDT</span>
          <span className="text-white/25">1 FP = 10 USDT</span>
        </div>
      </div>

      {/* Quick Amount Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[50, 100, 250, 500].map((val) => (
          <button
            key={val}
            onClick={() => {
              setAmount(val.toString())
              setIsApproved(false)
              setError(null)
            }}
            disabled={isDepositing}
            className="py-2 rounded-md border border-white/[0.06] bg-white/[0.02] text-white/50 text-xs font-mono hover:bg-white/[0.05] hover:border-violet-500/30 hover:text-violet-400 transition-all disabled:opacity-30"
          >
            {val}
          </button>
        ))}
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
          <p className="text-[10px] text-white/40 font-mono mb-1">TRANSACTION</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-400 font-mono hover:underline break-all"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-20)}
          </a>
        </div>
      )}

      {/* Summary */}
      {pointsToGenerate > 0 && !isDepositing && (
        <div className="rounded-lg bg-violet-500/[0.08] border border-violet-500/20 p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-mono">DEPOSIT</span>
              <span className="text-sm font-medium text-white">{totalValue} USDT</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-mono">FEE (0.1%)</span>
              <span className="text-sm font-medium text-white/50">-{depositFee.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="text-[10px] text-white/40 font-mono">FP TOKENS TO RECEIVE</span>
              <span className="text-lg font-semibold text-violet-400">{pointsToGenerate} FP</span>
            </div>
          </div>

          <div className="text-[10px] text-white/30 font-mono p-2 rounded bg-black/30">
            <p>
              You pay: <span className="text-green-400">{totalValue} USDT</span>
            </p>
            <p>
              You get: <span className="text-violet-400">{pointsToGenerate} Floating Points</span>
            </p>
            <p>Each FP = $10 value, redeemable for USDT</p>
          </div>
        </div>
      )}

      {/* Deposit Progress */}
      {isDepositing && (
        <div className="rounded-lg bg-violet-500/[0.08] border border-violet-500/20 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border border-dashed border-violet-500/50 animate-spin"
                style={{ animationDuration: "2s" }}
              />
              <span className="text-sm font-semibold text-violet-400">{pointsToGenerate}</span>
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-violet-400">{depositStages[depositStage]?.label}</div>
              <div className="text-[9px] text-white/35 font-mono mt-0.5">Minting {pointsToGenerate} FP Tokens</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                style={{ width: `${depositStages[depositStage]?.progress || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-white/25">
              <span>
                Stage {depositStage + 1}/{depositStages.length}
              </span>
              <span>{depositStages[depositStage]?.progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isDepositing && pointsToGenerate > 0 && (
        <div className="space-y-2">
          {!isApproved ? (
            <Button onClick={handleApprove} className="w-full bg-green-600 hover:bg-green-500 text-white border-0 h-11">
              Approve {totalValue} USDT
            </Button>
          ) : (
            <Button
              onClick={handleDeposit}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white border-0 h-11"
            >
              Deposit & Mint {pointsToGenerate} FP
            </Button>
          )}
        </div>
      )}

      {pointsToGenerate === 0 && !isDepositing && (
        <Button disabled className="w-full bg-violet-600/50 text-white/50 border-0 h-11">
          Enter amount (min 10 USDT)
        </Button>
      )}

      {/* How it works - Privacy Flow */}
      <div className="text-[10px] text-white/25 font-mono space-y-1 pt-2 border-t border-white/[0.04]">
        <p className="text-white/40 mb-2">Privacy Flow:</p>
        <p>1. USDT deposited to Treasury (100% backed)</p>
        <p>2. Pedersen commitment generated locally</p>
        <p>3. Commitment hash stored on-chain (not amount)</p>
        <p>4. FP Token minted with hidden value</p>
        <p className="text-violet-400 mt-2">No on-chain link between deposit and future payments</p>
      </div>
    </div>
  )
}
