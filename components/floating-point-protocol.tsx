"use client"

import { useCallback } from "react"
import { ParticleField } from "./particle-field"
import { ProtocolStats } from "./protocol-stats"
import { SidePanel } from "./side-panel"
import { TransactionHistory } from "./transaction-history"
import { WalletConnect } from "./wallet-connect"
import { PointDetailModal } from "./point-detail-modal"
import { UserPointsInventory } from "./user-points-inventory"
import { useFPP } from "@/lib/fpp-context"
import Link from "next/link"
import { FileText, BookOpen, HelpCircle, Shield, Github, MessageCircle, Headphones, Coins, Code } from "lucide-react"

export function FloatingPointProtocol() {
  const { state, togglePointSelection, setActivePointDetail } = useFPP()
  const { wallet, selectedPointIds, activePointDetail, availablePoints } = state

  const handlePointSelect = useCallback(
    (pointId: string) => {
      togglePointSelection(pointId)
    },
    [togglePointSelection],
  )

  const handlePointDetail = useCallback(
    (pointId: string) => {
      const point = availablePoints.find((p) => p.id === pointId)
      if (point) {
        setActivePointDetail(point)
      }
    },
    [availablePoints, setActivePointDetail],
  )

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full border border-white/50" />
              <div
                className="absolute inset-[5px] rounded-full border border-dashed border-violet-400/40"
                style={{ animation: "spin 12s linear infinite" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-medium tracking-tight text-white/90">Floating Point Protocol</h1>
              <p className="text-[8px] text-white/20 font-mono tracking-[0.25em]">PRIVACY-FIRST PAYMENTS</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-2.5 py-1.5 rounded border border-white/[0.04] bg-white/[0.02]">
              <span className="text-[8px] text-white/20 font-mono">NETWORK</span>
              <span className="ml-1.5 text-[10px] font-medium text-violet-400">Ethereum</span>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-5">
        {/* Stats Bar */}
        <ProtocolStats />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
          {/* Particle Visualization */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-white/[0.04] overflow-hidden bg-black">
              <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-sm text-white/85">Floating Random Points</h2>
                  <p className="text-[8px] text-white/20 mt-0.5 font-mono tracking-[0.2em]">
                    CLICK TO SELECT · DOUBLE-CLICK FOR DETAILS
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded border border-violet-500/25 bg-violet-500/10 text-violet-400 text-[9px] font-mono">
                    {selectedPointIds.length} SELECTED
                  </span>
                  <span className="px-2 py-1 rounded border border-white/[0.04] bg-white/[0.02] text-white/40 text-[9px] font-mono">
                    ${selectedPointIds.length * 10}
                  </span>
                </div>
              </div>
              <ParticleField
                onPointSelect={handlePointSelect}
                onPointDetail={handlePointDetail}
                selectedPoints={selectedPointIds}
                isProcessing={state.isProcessing}
              />
            </div>

            {/* User's Points Inventory */}
            {wallet.isConnected && <UserPointsInventory />}
          </div>

          {/* Side Panel */}
          <SidePanel />
        </div>

        {/* Transaction History */}
        <TransactionHistory />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Navigation Links */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Documentation */}
            <div>
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">Documentation</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/whitepaper"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Whitepaper
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guide"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    User Guide
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <Code className="w-4 h-4" />
                    API Docs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Protocol */}
            <div>
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">Protocol</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/tokenomics"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <Coins className="w-4 h-4" />
                    Tokenomics
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contracts"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Smart Contracts
                  </Link>
                </li>
                <li>
                  <Link
                    href="/security"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Security Audit
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">Support</h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/help"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <Headphones className="w-4 h-4" />
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">Community</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-violet-400 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Discord
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/terms" className="text-sm text-white/40 hover:text-violet-400 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-white/40 hover:text-violet-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border border-white/30" />
                <div className="absolute inset-[4px] rounded-full border border-dashed border-violet-400/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
              </div>
              <div>
                <p className="text-xs text-white/50">Floating Point Protocol</p>
                <p className="text-[10px] text-white/20">Privacy-First Blockchain Payments</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-[10px] text-white/20">Smart Contract: Ethereum Mainnet</span>
              <span className="text-[10px] text-white/20">USDT Collateralized</span>
              <span className="text-[10px] text-violet-400/60">100% Reserve Backed</span>
            </div>

            <p className="text-[10px] text-white/20">&copy; 2025 FPP. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Point Detail Modal */}
      {activePointDetail && <PointDetailModal point={activePointDetail} onClose={() => setActivePointDetail(null)} />}
    </div>
  )
}
