"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useFPP } from "@/lib/fpp-context"
import { OWNER_ADDRESS } from "@/lib/evm/fpp-contract-client"

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false)
  const { state, connectWallet, disconnectWallet, setWallet } = useFPP()
  const { wallet } = state
  const [isOwner, setIsOwner] = useState(false)

  // 监听账户变化
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accts = accounts as string[]
        if (accts.length === 0) {
          disconnectWallet()
        } else if (wallet.isConnected && accts[0] !== wallet.address) {
          // 账户切换 - just update the address
          setWallet({ address: accts[0] })
        }
      }

      const handleChainChanged = () => {
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum?.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [wallet.isConnected, wallet.address, disconnectWallet, setWallet])

  useEffect(() => {
    if (wallet.address && wallet.isConnected) {
      setIsOwner(wallet.address.toLowerCase() === OWNER_ADDRESS.toLowerCase())
    } else {
      setIsOwner(false)
    }
  }, [wallet.address, wallet.isConnected])

  const handleConnect = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet")
      return
    }

    setIsConnecting(true)
    try {
      await connectWallet()
      console.log("[v0] Wallet connected")
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      alert("Failed to connect wallet. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    setIsOwner(false)
  }

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 rounded-md border border-violet-500/30 bg-violet-500/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-violet-400">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            {isOwner && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                OWNER
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-white/40 hover:text-white/70 hover:bg-white/5 text-xs"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="px-4 py-2 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-400 font-medium text-xs hover:bg-violet-500/20 hover:border-violet-500/60 transition-all disabled:opacity-50"
    >
      {isConnecting ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Connecting...
        </span>
      ) : (
        "Connect Wallet"
      )}
    </Button>
  )
}
