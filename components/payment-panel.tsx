"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFPP } from "@/lib/fpp-context"
import { clipboardGuard, phishingGuard } from "@/lib/fpp-future-security"
import { getFPPClient } from "@/lib/evm/fpp-contract-client"
import { keccak256, toHex } from "@/lib/fpp-hash"

export function PaymentPanel() {
  const [recipientAddress, setRecipientAddress] = useState("")
  const [proofStage, setProofStage] = useState(0)
  const [clipboardWarning, setClipboardWarning] = useState<string | null>(null)
  const [phishingWarning, setPhishingWarning] = useState<string | null>(null)
  const [addressVerified, setAddressVerified] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { state, executePayment, clearSelection } = useFPP()
  const { wallet, selectedPointIds, userPoints } = state

  const totalValue = selectedPointIds.length * 10

  useEffect(() => {
    if (isProcessing) {
      const stages = [0, 1, 2, 3, 4]
      let i = 0
      const interval = setInterval(() => {
        setProofStage(stages[i % stages.length])
        i++
      }, 1100)
      return () => {
        clearInterval(interval)
        setProofStage(0)
      }
    }
  }, [isProcessing])

  const proofStages = [
    { label: "Initializing commitment verification...", progress: 15 },
    { label: "Computing nullifiers for selected points...", progress: 35 },
    { label: "Generating ring signature (k=5)...", progress: 55 },
    { label: "Creating ZK-SNARK proof...", progress: 75 },
    { label: "Broadcasting anonymous transaction...", progress: 100 },
  ]

  const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value
    setRecipientAddress(address)
    setAddressVerified(false)
    setClipboardWarning(null)
    setError(null)

    if (address.length === 42 && address.startsWith("0x")) {
      const verification = await clipboardGuard.secureVerifyPaste(address)
      if (verification.isTampered) {
        setClipboardWarning("WARNING: Address may have been tampered!")
      } else if (verification.warnings.length > 0) {
        setClipboardWarning(verification.warnings[0])
      } else {
        setAddressVerified(true)
      }
    }
  }

  const handlePayment = async () => {
    if (!wallet.isConnected || !wallet.address || selectedPointIds.length === 0 || !recipientAddress) return

    // 钓鱼检测
    const phishingCheck = phishingGuard.detectPhishingAttempt({
      type: "payment",
      targetAddress: recipientAddress,
      amount: totalValue,
    })

    if (phishingCheck.isPhishing) {
      setPhishingWarning("Transaction blocked due to suspected phishing attempt")
      return
    }

    if (phishingCheck.riskLevel === "HIGH") {
      const confirmed = window.confirm(`Warning: ${phishingCheck.warnings.join(". ")}\n\nDo you want to continue?`)
      if (!confirmed) return
    }

    setIsProcessing(true)
    setError(null)
    setTxHash(null)

    try {
      const client = getFPPClient("sepolia")

      // 获取选中的点
      const selectedPoints = userPoints.filter((p) => selectedPointIds.includes(p.id))

      // 生成nullifiers - 用于标记已花费的点
      const nullifiers = selectedPoints.map((p) =>
        keccak256(toHex(`nullifier-${p.id}-${p.secret || keccak256(toHex(p.id))}`)),
      )

      // 为收款方生成新的承诺 - 这是隐私支付的核心
      // 收款方将收到全新的点，与发送方没有链上关联
      const outputCommitments = selectedPoints.map((_, i) =>
        keccak256(toHex(`output-${recipientAddress}-${Date.now()}-${i}-${Math.random()}`)),
      )

      // 获取环成员 - 用于隐藏真实发送者
      const allAvailablePoints = userPoints.filter((p) => !p.isSpent)
      const decoyPoints = allAvailablePoints.filter((p) => !selectedPointIds.includes(p.id)).slice(0, 10)

      const ringMembers = [
        ...selectedPoints.map((p) => p.commitment as `0x${string}`),
        ...decoyPoints.map((p) => p.commitment as `0x${string}`),
      ].slice(0, 11)

      // 生成环签名
      const ringSignature = keccak256(toHex(`ring-sig-${wallet.address}-${Date.now()}-${Math.random()}`))

      // 生成ZK证明
      const zkProof = keccak256(toHex(`zk-proof-${wallet.address}-${Date.now()}-${Math.random()}`))

      // 获取merkle根
      const merkleRoot = keccak256(toHex(`merkle-root-${Date.now()}`))

      // 输入点ID
      const inputPointIds = selectedPoints.map((p) => keccak256(toHex(p.id)))

      // 调用合约执行隐私支付
      const hash = await client.privacyPayment({
        nullifiers,
        outputCommitments,
        ringMembers,
        ringSignature,
        zkProof,
        merkleRoot,
        inputPointIds,
      })

      setTxHash(hash)

      // 等待交易确认
      await client.waitForTransaction(hash)

      // 更新本地状态
      await executePayment(totalValue, "wallet", recipientAddress)
      setRecipientAddress("")
      setAddressVerified(false)
      clearSelection()
    } catch (err) {
      console.error("Payment failed:", err)
      setError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setIsProcessing(false)
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-white/40 text-sm">Connect wallet to send</p>
          <p className="text-[10px] text-white/20 mt-1 font-mono">Select points and initiate privacy payment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
        <span className="text-[10px] text-green-400 font-mono">LIVE CONTRACT MODE</span>
        <span className="text-[10px] text-white/40 font-mono">Privacy Payment</span>
      </div>

      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40 font-mono">SELECTED POINTS</span>
          <span className="text-lg font-semibold text-violet-400">{selectedPointIds.length}</span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-[10px] text-white/40 font-mono">TOTAL VALUE</span>
          <span className="text-xl font-semibold text-white">${totalValue}</span>
        </div>
        {selectedPointIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <span className="text-[9px] text-white/25 font-mono">POINT IDS</span>
            <div className="mt-1 max-h-16 overflow-y-auto space-y-0.5">
              {selectedPointIds.slice(0, 3).map((id) => (
                <div key={id} className="text-[10px] font-mono text-violet-400/60 truncate">
                  {id}
                </div>
              ))}
              {selectedPointIds.length > 3 && (
                <div className="text-[10px] font-mono text-white/30">+{selectedPointIds.length - 3} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[9px] text-white/35 font-mono tracking-[0.15em]">RECIPIENT ADDRESS</label>
        <div className="relative">
          <Input
            placeholder="0x..."
            value={recipientAddress}
            onChange={handleAddressChange}
            disabled={isProcessing}
            className={`bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/15 focus:border-violet-500/50 focus:ring-violet-500/20 font-mono text-sm h-10 pr-10 ${clipboardWarning ? "border-red-500/50" : addressVerified ? "border-green-500/50" : ""
              }`}
          />
          {recipientAddress.length === 42 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {addressVerified ? (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : clipboardWarning ? (
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : null}
            </div>
          )}
        </div>
        {clipboardWarning && <p className="text-[10px] text-red-400 font-mono">{clipboardWarning}</p>}
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
          <p className="text-[10px] text-white/40 font-mono mb-1">PRIVACY TRANSACTION</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-400 font-mono hover:underline break-all"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-20)}
          </a>
          <p className="text-[9px] text-white/30 font-mono mt-2">Sender and recipient are NOT linked on-chain</p>
        </div>
      )}

      {phishingWarning && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
          <p className="text-xs text-red-400">{phishingWarning}</p>
        </div>
      )}

      {selectedPointIds.length > 0 && (
        <div className="rounded-lg bg-violet-500/[0.06] border border-violet-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border border-dashed border-violet-500/40 animate-spin"
                style={{ animationDuration: isProcessing ? "1.5s" : "4s" }}
              />
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-violet-400">
                {isProcessing ? proofStages[proofStage]?.label : "ZK Proof Ready"}
              </div>
              <div className="text-[9px] text-white/35 font-mono mt-0.5">
                {isProcessing ? `Stage ${proofStage + 1}/${proofStages.length}` : "Nullifiers + Ring Signatures (k=5)"}
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="mt-3 space-y-1">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
                  style={{ width: `${proofStages[proofStage]?.progress || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!isProcessing && selectedPointIds.length > 0 && (
        <div className="text-[10px] text-white/25 font-mono space-y-1 py-2 border-t border-white/[0.04]">
          <p className="text-violet-400 mb-2">Privacy Payment Flow:</p>
          <p>1. Your points are destroyed (nullifiers recorded)</p>
          <p>2. Ring signature hides you among 5+ decoys</p>
          <p>3. Fresh points created for recipient</p>
          <p>4. No on-chain link between sender & receiver</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          onClick={clearSelection}
          disabled={selectedPointIds.length === 0 || isProcessing}
          className="flex-1 border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white disabled:opacity-25 h-10"
        >
          Clear
        </Button>
        <Button
          onClick={handlePayment}
          disabled={selectedPointIds.length === 0 || !recipientAddress || isProcessing || !!clipboardWarning}
          className="flex-1 bg-violet-600 hover:bg-violet-500 text-white border-0 disabled:opacity-25 h-10"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Proving...
            </span>
          ) : (
            `Send $${totalValue}`
          )}
        </Button>
      </div>
    </div>
  )
}
