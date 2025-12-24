"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wallet,
  TrendingUp,
  Shield,
  DollarSign,
  Clock,
  CheckCircle,
  Copy,
  Coins,
  Lock,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import { getFPPClient, OWNER_ADDRESS } from "@/lib/evm/fpp-contract-client"

// ============================================================
// 唯一的Owner地址 - 只有这个地址可以访问
// ============================================================
export const OWNER_CONFIG = {
  primaryOwner: OWNER_ADDRESS,
  multiSigSigners: [OWNER_ADDRESS, OWNER_ADDRESS, OWNER_ADDRESS],
  requiredSignatures: 1,
}

// ============================================================

interface TreasuryStats {
  totalReserve: number
  protocolRevenue: number
  availableFees: number
  yieldEarned: number
  yieldDeployed: number
  reserveRatio: number
  fpTokenSupply: number
  fpTokenPrice: number
  ownerMinted: number
  ownerRemainingMint: number
  ownerUSDTBalance: number
  ownerFPBalance: number
}

export function OwnerDashboard() {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [txStatus, setTxStatus] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [network, setNetwork] = useState<"mainnet" | "sepolia">("sepolia")

  const [stats, setStats] = useState<TreasuryStats>({
    totalReserve: 0,
    protocolRevenue: 0,
    availableFees: 0,
    yieldEarned: 0,
    yieldDeployed: 0,
    reserveRatio: 100,
    fpTokenSupply: 0,
    fpTokenPrice: 10.0,
    ownerMinted: 0,
    ownerRemainingMint: 10000000,
    ownerUSDTBalance: 0,
    ownerFPBalance: 0,
  })

  const [feeWithdrawAmount, setFeeWithdrawAmount] = useState("")
  const [feeRecipient, setFeeRecipient] = useState(OWNER_CONFIG.primaryOwner)
  const [mintAmount, setMintAmount] = useState("")
  const [mintRecipient, setMintRecipient] = useState(OWNER_CONFIG.primaryOwner)

  const client = getFPPClient(network)

  const refreshStats = async () => {
    if (!connectedAddress) return
    setIsRefreshing(true)

    try {
      const [protocolStats, treasuryStats, ownerUSDT, ownerFP] = await Promise.all([
        client.getProtocolStats().catch(() => null),
        client.getTreasuryStats().catch(() => null),
        client.getUSDTBalance(connectedAddress as `0x${string}`).catch(() => "0"),
        client.getFPTokenBalance(connectedAddress as `0x${string}`).catch(() => "0"),
      ])

      setStats((prev) => ({
        ...prev,
        totalReserve: treasuryStats ? Number.parseFloat(treasuryStats.reserve) : prev.totalReserve,
        protocolRevenue: treasuryStats ? Number.parseFloat(treasuryStats.revenue) : prev.protocolRevenue,
        availableFees: treasuryStats ? Number.parseFloat(treasuryStats.revenue) : prev.availableFees,
        yieldEarned: treasuryStats ? Number.parseFloat(treasuryStats.yieldEarned) : prev.yieldEarned,
        yieldDeployed: treasuryStats ? Number.parseFloat(treasuryStats.yieldDeployed) : prev.yieldDeployed,
        reserveRatio: treasuryStats ? treasuryStats.reserveRatio : prev.reserveRatio,
        ownerUSDTBalance: Number.parseFloat(ownerUSDT),
        ownerFPBalance: Number.parseFloat(ownerFP),
      }))
    } catch (error) {
      console.error("Failed to refresh stats:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts && accounts.length > 0) {
            const address = (accounts as string[])[0].toLowerCase()
            if (address === OWNER_CONFIG.primaryOwner.toLowerCase()) {
              setConnectedAddress((accounts as string[])[0])
            }
          }
        } catch (error) {
          console.error("Failed to check connection:", error)
        }
      }
    }
    checkConnection()
  }, [])

  useEffect(() => {
    if (connectedAddress) {
      refreshStats()
    }
  }, [connectedAddress])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[]
        if (accs.length === 0) {
          setConnectedAddress(null)
        } else if (accs[0].toLowerCase() === OWNER_CONFIG.primaryOwner.toLowerCase()) {
          setConnectedAddress(accs[0])
        } else {
          setConnectedAddress(null)
          window.location.href = "/"
        }
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      return () => window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
    }
  }, [])

  const connectWallet = async () => {
    setIsLoading(true)
    try {
      const address = await client.connectWallet()
      if (address.toLowerCase() === OWNER_CONFIG.primaryOwner.toLowerCase()) {
        setConnectedAddress(address)
      } else {
        alert("This wallet is not authorized. Only the owner can access this dashboard.")
        window.location.href = "/"
      }
    } catch (error) {
      console.error("Failed to connect:", error)
      alert("Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setTxStatus("Address copied!")
    setTimeout(() => setTxStatus(null), 2000)
  }

  const withdrawFees = async () => {
    if (!feeWithdrawAmount || !connectedAddress) return
    setIsLoading(true)
    setTxStatus("Initiating fee withdrawal...")
    setTxHash(null)

    try {
      const hash = await client.withdrawTreasuryRevenue(feeRecipient as `0x${string}`, feeWithdrawAmount)
      setTxHash(hash)
      setTxStatus("Transaction submitted, waiting for confirmation...")

      await client.waitForTransaction(hash)
      setTxStatus(`Successfully withdrawn ${feeWithdrawAmount} USDT!`)

      setFeeWithdrawAmount("")
      await refreshStats()
    } catch (error) {
      console.error("Failed:", error)
      setTxStatus("Withdrawal failed: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const ownerMintTokens = async () => {
    if (!mintAmount || !connectedAddress) return
    setIsLoading(true)
    setTxStatus("Initiating token mint...")
    setTxHash(null)

    try {
      const hash = await client.ownerMintTokens(mintRecipient as `0x${string}`, mintAmount)
      setTxHash(hash)
      setTxStatus("Transaction submitted, waiting for confirmation...")

      await client.waitForTransaction(hash)
      setTxStatus(`Successfully minted ${mintAmount} FP tokens!`)

      setMintAmount("")
      await refreshStats()
    } catch (error) {
      console.error("Failed:", error)
      setTxStatus("Mint failed: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const viewOnExplorer = (hash: string) => {
    const baseUrl = network === "mainnet" ? "https://etherscan.io/tx/" : "https://sepolia.etherscan.io/tx/"
    window.open(baseUrl + hash, "_blank")
  }

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="bg-gray-900/50 border-violet-500/20 w-96">
          <CardHeader>
            <CardTitle className="text-violet-400 text-center">Owner Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-sm text-center">Connect your owner wallet to access the dashboard.</p>
            <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={connectWallet} disabled={isLoading}>
              {isLoading ? "Connecting..." : "Connect Owner Wallet"}
            </Button>
            <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
              <p className="text-xs text-violet-300">Authorized Owner Address:</p>
              <p className="text-xs font-mono text-violet-400 mt-1 break-all">{OWNER_CONFIG.primaryOwner}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={network === "sepolia" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setNetwork("sepolia")}
              >
                Sepolia
              </Button>
              <Button
                variant={network === "mainnet" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setNetwork("mainnet")}
              >
                Mainnet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-violet-400">FPP Owner Dashboard</h1>
            <p className="text-gray-400 text-sm">Protocol Management & Treasury Control</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStats}
              disabled={isRefreshing}
              className="border-violet-500/30 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              {network === "mainnet" ? "Mainnet" : "Sepolia Testnet"}
            </Badge>
            <Badge variant="outline" className="border-green-500 text-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Owner: {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
            </Badge>
          </div>
        </div>

        {/* Transaction Status */}
        {txStatus && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
            <p className="text-sm text-blue-400">{txStatus}</p>
            {txHash && (
              <Button variant="ghost" size="sm" onClick={() => viewOnExplorer(txHash)}>
                <ExternalLink className="w-4 h-4 mr-1" />
                View TX
              </Button>
            )}
          </div>
        )}

        {/* Contract Addresses */}
        <Card className="bg-gray-900/50 border-violet-500/20">
          <CardHeader>
            <CardTitle className="text-violet-400 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Contract Addresses (Save These!)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(client.getAddresses()).map(([name, address]) => (
                <div key={name} className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase">{name}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-violet-300 font-mono truncate">{address}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => copyAddress(address)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Owner Balances */}
        <Card className="bg-gray-900/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-400 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Your Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black/50 rounded-lg">
                <p className="text-xs text-gray-500">USDT Balance</p>
                <p className="text-2xl font-bold text-green-400">${stats.ownerUSDTBalance.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-black/50 rounded-lg">
                <p className="text-xs text-gray-500">FP Token Balance</p>
                <p className="text-2xl font-bold text-violet-400">{stats.ownerFPBalance.toLocaleString()} FP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gray-900/50 border-violet-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Reserve</p>
                  <p className="text-xl font-bold text-white">${stats.totalReserve.toLocaleString()}</p>
                </div>
                <Wallet className="w-6 h-6 text-violet-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Available Fees</p>
                  <p className="text-xl font-bold text-green-400">${stats.availableFees.toLocaleString()}</p>
                </div>
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Yield Earned</p>
                  <p className="text-xl font-bold text-blue-400">${stats.yieldEarned.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">FP Supply</p>
                  <p className="text-xl font-bold text-yellow-400">{stats.fpTokenSupply.toLocaleString()}</p>
                </div>
                <Coins className="w-6 h-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Mint Remaining</p>
                  <p className="text-xl font-bold text-purple-400">{stats.ownerRemainingMint.toLocaleString()}</p>
                </div>
                <Lock className="w-6 h-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="fees" className="space-y-4">
          <TabsList className="bg-gray-900/50 border border-violet-500/20">
            <TabsTrigger value="fees">Withdraw Fees</TabsTrigger>
            <TabsTrigger value="mint">Mint Tokens</TabsTrigger>
            <TabsTrigger value="yield">Yield Strategy</TabsTrigger>
            <TabsTrigger value="deploy">Deployment Info</TabsTrigger>
          </TabsList>

          <TabsContent value="fees">
            <Card className="bg-gray-900/50 border-violet-500/20">
              <CardHeader>
                <CardTitle className="text-violet-400 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Withdraw Protocol Fees to Your Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center p-4 bg-black/50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Total Collected</p>
                    <p className="text-xl font-bold text-green-400">${stats.protocolRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Available</p>
                    <p className="text-xl font-bold text-white">${stats.availableFees.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fee Rate</p>
                    <p className="text-xl font-bold text-white">0.1%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Recipient (Your Wallet)</label>
                    <Input
                      value={feeRecipient}
                      onChange={(e) => setFeeRecipient(e.target.value)}
                      className="bg-black/50 border-violet-500/30 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Amount (USDT)</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={feeWithdrawAmount}
                        onChange={(e) => setFeeWithdrawAmount(e.target.value)}
                        className="bg-black/50 border-violet-500/30 flex-1"
                        max={stats.availableFees}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFeeWithdrawAmount(stats.availableFees.toString())}
                        className="border-violet-500/30"
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={withdrawFees}
                    disabled={isLoading || !feeWithdrawAmount || Number(feeWithdrawAmount) > stats.availableFees}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isLoading ? "Processing..." : `Withdraw ${feeWithdrawAmount || "0"} USDT`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mint">
            <Card className="bg-gray-900/50 border-violet-500/20">
              <CardHeader>
                <CardTitle className="text-violet-400 flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Mint FP Tokens (Owner Only)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center p-4 bg-black/50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Already Minted</p>
                    <p className="text-xl font-bold text-yellow-400">{stats.ownerMinted.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remaining Quota</p>
                    <p className="text-xl font-bold text-white">{stats.ownerRemainingMint.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max Allocation</p>
                    <p className="text-xl font-bold text-white">10,000,000</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Recipient</label>
                    <Input
                      value={mintRecipient}
                      onChange={(e) => setMintRecipient(e.target.value)}
                      className="bg-black/50 border-violet-500/30 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Amount (FP)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount to mint"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      className="bg-black/50 border-violet-500/30"
                      max={stats.ownerRemainingMint}
                    />
                  </div>
                  <Button
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    onClick={ownerMintTokens}
                    disabled={isLoading || !mintAmount || Number(mintAmount) > stats.ownerRemainingMint}
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    {isLoading ? "Minting..." : `Mint ${mintAmount || "0"} FP Tokens`}
                  </Button>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Owner mint is limited to 10M tokens total (10% of max supply)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yield">
            <Card className="bg-gray-900/50 border-violet-500/20">
              <CardHeader>
                <CardTitle className="text-violet-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Yield Strategy Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center p-4 bg-black/50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Deployed to Yield</p>
                    <p className="text-xl font-bold text-blue-400">${stats.yieldDeployed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Yield Earned</p>
                    <p className="text-xl font-bold text-green-400">${stats.yieldEarned.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reserve Ratio</p>
                    <p className="text-xl font-bold text-white">{stats.reserveRatio}%</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Yield Strategy Info</h4>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>- Maximum 50% of reserve can be deployed to yield</li>
                    <li>- 48-hour timelock on strategy changes</li>
                    <li>- Multi-sig approval required</li>
                    <li>- Emergency withdrawal available when paused</li>
                  </ul>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Yield strategy changes require 48-hour timelock + multi-sig
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deploy">
            <Card className="bg-gray-900/50 border-violet-500/20">
              <CardHeader>
                <CardTitle className="text-violet-400 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Deployment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-black/50 rounded-lg space-y-4">
                  <h4 className="text-sm font-medium text-white">Deployment Steps:</h4>
                  <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                    <li>Deploy FPToken.sol (owner = your address)</li>
                    <li>Deploy TreasuryManager.sol (owner = your address)</li>
                    <li>Deploy FloatingPointProtocol.sol (connect USDT, Treasury)</li>
                    <li>Call FPToken.setMinter(FPP address)</li>
                    <li>Call TreasuryManager.setFPPContract(FPP address)</li>
                    <li>Verify all contracts on Etherscan</li>
                  </ol>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-green-400 mb-2">Your Permissions:</h4>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li>✓ Withdraw protocol fees to your wallet</li>
                    <li>✓ Mint up to 10M FP tokens from reserve</li>
                    <li>✓ Pause/unpause contracts in emergency</li>
                    <li>✓ Update yield strategy (with timelock)</li>
                    <li>✓ Transfer ownership to new address</li>
                  </ul>
                </div>

                <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-violet-400 mb-2">Important Addresses:</h4>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Owner:</span>
                      <span className="text-violet-300">{OWNER_CONFIG.primaryOwner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Network:</span>
                      <span className="text-violet-300">
                        {network === "mainnet" ? "Ethereum Mainnet" : "Sepolia Testnet"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
