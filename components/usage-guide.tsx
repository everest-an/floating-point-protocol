"use client"
import {
  Shield,
  Lock,
  Eye,
  ArrowRight,
  Check,
  Coins,
  Database,
  Scale,
  DollarSign,
  Wallet,
  Clock,
  RefreshCcw,
} from "lucide-react"
import { DEFAULT_CONTRACT_CONFIG, PROTOCOL_CONSTANTS } from "@/lib/fpp-types"

export function UsageGuide() {
  // const [expandedSection, setExpandedSection] = useState<string | null>("purchase")

  // const toggleSection = (section: string) => {
  //   setExpandedSection(expandedSection === section ? null : section)
  // }

  return (
    <footer className="border-t border-white/[0.04] bg-black mt-8">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-semibold text-white/90 tracking-tight">Usage Guide</h2>
          <p className="text-sm text-white/40 mt-2 max-w-2xl mx-auto">
            Floating Point Protocol enables privacy-preserving payments on Ethereum using zero-knowledge proofs and ring
            signatures. Each Floating Point (FP) represents{" "}
            <span className="text-green-400">${PROTOCOL_CONSTANTS.POINT_VALUE} USDT</span> of value, 100% backed by USDT
            reserves.
          </p>
        </div>

        {/* Quick Summary Box */}
        <div className="max-w-4xl mx-auto mb-8 p-6 rounded-lg border border-violet-500/20 bg-violet-500/[0.03]">
          <h3 className="text-sm font-medium text-violet-400 mb-4">Quick Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded bg-black/30">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-white/80">Buy FP</span>
              </div>
              <p className="text-[10px] text-white/40">Pay USDT → Get FP Tokens</p>
              <p className="text-[10px] text-green-400 mt-1">10 USDT = 1 FP</p>
            </div>
            <div className="p-3 rounded bg-black/30">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-medium text-white/80">Send Privately</span>
              </div>
              <p className="text-[10px] text-white/40">Transfer FP with full privacy</p>
              <p className="text-[10px] text-violet-400 mt-1">ZK Proofs + Ring Signatures</p>
            </div>
            <div className="p-3 rounded bg-black/30">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCcw className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-white/80">Redeem</span>
              </div>
              <p className="text-[10px] text-white/40">Burn FP → Get USDT back</p>
              <p className="text-[10px] text-amber-400 mt-1">24h timelock for security</p>
            </div>
          </div>
        </div>

        {/* All Guide Sections - Always Visible */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Section 1: Purchase Flow */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.01]">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/85">1. Purchase Flow (Buy FP with USDT)</h3>
                  <p className="text-[10px] text-white/30">How to acquire Floating Points</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              {/* Step by step */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  {
                    step: "01",
                    title: "Connect Wallet",
                    desc: "Connect MetaMask or WalletConnect",
                    icon: Wallet,
                  },
                  {
                    step: "02",
                    title: "Approve USDT",
                    desc: "Approve USDT spending to protocol",
                    icon: Check,
                  },
                  {
                    step: "03",
                    title: "Deposit USDT",
                    desc: "USDT sent to Treasury address",
                    icon: DollarSign,
                  },
                  {
                    step: "04",
                    title: "Generate Commitment",
                    desc: "Client creates Pedersen commitment",
                    icon: Lock,
                  },
                  {
                    step: "05",
                    title: "Receive FP",
                    desc: "FP Tokens minted to your wallet",
                    icon: Coins,
                  },
                ].map((item, i) => (
                  <div key={i} className="relative">
                    <div className="p-3 rounded border border-white/[0.04] bg-white/[0.01] h-full">
                      <item.icon className="w-4 h-4 text-green-400 mb-2" />
                      <span className="text-[9px] font-mono text-green-400">{item.step}</span>
                      <h4 className="text-[11px] font-medium text-white/80 mt-1">{item.title}</h4>
                      <p className="text-[9px] text-white/40 mt-1">{item.desc}</p>
                    </div>
                    {i < 4 && (
                      <ArrowRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/10 z-10" />
                    )}
                  </div>
                ))}
              </div>

              {/* Example */}
              <div className="mt-4 p-4 rounded border border-green-500/20 bg-green-500/[0.03]">
                <p className="text-[11px] text-white/60 mb-3">
                  <span className="text-green-400 font-medium">Example:</span> Purchasing 10 FP Tokens
                </p>
                <div className="space-y-2 text-[10px] font-mono">
                  <div className="flex justify-between p-2 rounded bg-black/30">
                    <span className="text-white/40">You Pay</span>
                    <span className="text-green-400">100 USDT</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-black/30">
                    <span className="text-white/40">Protocol Fee (0.1%)</span>
                    <span className="text-white/50">-0.10 USDT</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-black/30">
                    <span className="text-white/40">Net to Treasury</span>
                    <span className="text-white/60">99.90 USDT</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                    <span className="text-white/60">You Receive</span>
                    <span className="text-green-400 font-semibold">10 FP Tokens</span>
                  </div>
                </div>
              </div>

              {/* Contract Info */}
              <div className="p-3 rounded bg-black/50 border border-white/[0.04]">
                <p className="text-[9px] text-white/30 font-mono">
                  Treasury Address: <span className="text-green-400">{DEFAULT_CONTRACT_CONFIG.treasuryAddress}</span>
                </p>
                <p className="text-[9px] text-white/30 font-mono mt-1">
                  USDT Contract: <span className="text-white/50">{DEFAULT_CONTRACT_CONFIG.stablecoinAddress}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Transaction Flow */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.01]">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/85">2. Transaction Flow (Private Payments)</h3>
                  <p className="text-[10px] text-white/30">How to send FP privately to another address</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="space-y-3">
                {[
                  {
                    phase: "Selection",
                    title: "Gravity-Weighted Random Selection",
                    desc: "Points are selected using a gravity-weighted algorithm. Older points have higher selection probability.",
                    formula: "weight = mass × √(age + 1) × GRAVITY_CONSTANT",
                  },
                  {
                    phase: "Nullifier",
                    title: "Generate Nullifier",
                    desc: "A unique nullifier prevents double-spending without revealing which point you own.",
                    formula: "nullifier = hash(pointId || secret)",
                  },
                  {
                    phase: "ZK Proof",
                    title: "Zero-Knowledge Proof",
                    desc: "Prove you know the secret, nullifier is correct, and values balance - without revealing anything.",
                    formula: "proof = zkSNARK.prove(inputs, outputs, nullifiers, secret)",
                  },
                  {
                    phase: "Ring Sign",
                    title: "Ring Signature",
                    desc: "Sign with decoy public keys. Verifiers confirm one member signed but can't identify who.",
                    formula: "σ = RingSign(msg, sk, {pk₁...pkₙ})",
                  },
                  {
                    phase: "Broadcast",
                    title: "Submit to Blockchain",
                    desc: "Contract verifies proofs, marks nullifiers as spent, mints new FP to recipient.",
                    formula: "tx = {nullifiers, newCommitments, zkProof, ringSig}",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-mono text-violet-400">
                        {i + 1}
                      </div>
                      {i < 4 && <div className="w-px h-full bg-white/[0.06] mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <span className="text-[9px] font-mono text-violet-400 uppercase tracking-wider">
                        {item.phase}
                      </span>
                      <h4 className="text-xs font-medium text-white/80 mt-1">{item.title}</h4>
                      <p className="text-[10px] text-white/40 mt-1">{item.desc}</p>
                      <code className="block mt-2 px-2 py-1.5 rounded bg-black/50 border border-white/[0.04] text-[9px] font-mono text-violet-300/70">
                        {item.formula}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Redemption Flow */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.01]">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <RefreshCcw className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/85">3. Redemption Flow (Get USDT Back)</h3>
                  <p className="text-[10px] text-white/30">How to convert FP back to USDT</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  {
                    step: "01",
                    title: "Select FP",
                    desc: "Choose which FP tokens to redeem",
                    icon: Coins,
                  },
                  {
                    step: "02",
                    title: "Request Withdrawal",
                    desc: "FP burned, request submitted",
                    icon: ArrowRight,
                  },
                  {
                    step: "03",
                    title: "Wait 24 Hours",
                    desc: "Security timelock period",
                    icon: Clock,
                  },
                  {
                    step: "04",
                    title: "Claim USDT",
                    desc: "Call completeWithdrawal()",
                    icon: DollarSign,
                  },
                ].map((item, i) => (
                  <div key={i} className="relative">
                    <div className="p-3 rounded border border-white/[0.04] bg-white/[0.01] h-full">
                      <item.icon className="w-4 h-4 text-amber-400 mb-2" />
                      <span className="text-[9px] font-mono text-amber-400">{item.step}</span>
                      <h4 className="text-[11px] font-medium text-white/80 mt-1">{item.title}</h4>
                      <p className="text-[9px] text-white/40 mt-1">{item.desc}</p>
                    </div>
                    {i < 3 && (
                      <ArrowRight className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/10 z-10" />
                    )}
                  </div>
                ))}
              </div>

              {/* Example */}
              <div className="mt-4 p-4 rounded border border-amber-500/20 bg-amber-500/[0.03]">
                <p className="text-[11px] text-white/60 mb-3">
                  <span className="text-amber-400 font-medium">Example:</span> Redeeming 10 FP Tokens
                </p>
                <div className="space-y-2 text-[10px] font-mono">
                  <div className="flex justify-between p-2 rounded bg-black/30">
                    <span className="text-white/40">You Burn</span>
                    <span className="text-violet-400">10 FP Tokens</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-black/30">
                    <span className="text-white/40">Gross Value</span>
                    <span className="text-white/60">100 USDT</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-black/30">
                    <span className="text-white/40">Protocol Fee (0.1%)</span>
                    <span className="text-white/50">-0.10 USDT</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <span className="text-white/60">You Receive (after 24h)</span>
                    <span className="text-green-400 font-semibold">99.90 USDT</span>
                  </div>
                </div>
              </div>

              {/* Timelock explanation */}
              <div className="p-3 rounded bg-amber-500/[0.05] border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-amber-400 font-medium">Why 24-Hour Timelock?</p>
                    <p className="text-[9px] text-white/40 mt-1">
                      The timelock prevents flash loan attacks and gives users time to cancel if their wallet is
                      compromised. You can cancel during this period to restore your FP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Privacy Guarantees */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.01]">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/85">4. Privacy Guarantees</h3>
                  <p className="text-[10px] text-white/30">How your identity remains hidden</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Sender Anonymity",
                    desc: "Ring signatures mix your tx with decoys. Observer sees N possible senders.",
                    detail: "Ring size: 11 (1 real + 10 decoys)",
                    icon: Shield,
                  },
                  {
                    title: "Receiver Anonymity",
                    desc: "Stealth addresses generate one-time keys. No link between recipient addresses.",
                    detail: "New address per transaction",
                    icon: Eye,
                  },
                  {
                    title: "Amount Hidden",
                    desc: "Pedersen commitments hide values. Only parties involved know amounts.",
                    detail: "C = vG + rH (hiding + binding)",
                    icon: Lock,
                  },
                  {
                    title: "Unlinkability",
                    desc: "No connection between deposits and withdrawals. Full transaction graph privacy.",
                    detail: "Zero on-chain correlation",
                    icon: Shield,
                  },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded border border-white/[0.04] bg-white/[0.01]">
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon className="w-4 h-4 text-violet-400" />
                      <h4 className="text-xs font-medium text-white/80">{item.title}</h4>
                    </div>
                    <p className="text-[10px] text-white/40">{item.desc}</p>
                    <p className="text-[9px] text-violet-400/70 font-mono mt-2">{item.detail}</p>
                  </div>
                ))}
              </div>

              {/* What's visible vs hidden */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded border border-green-500/20 bg-green-500/[0.03]">
                  <h4 className="text-xs font-medium text-green-400 mb-3">What Observers See</h4>
                  <ul className="space-y-2 text-[10px] text-white/50">
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-400" />
                      <span>A transaction occurred</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-400" />
                      <span>N possible senders (ring members)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-400" />
                      <span>Cryptographic proofs are valid</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-400" />
                      <span>No double-spending occurred</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded border border-red-500/20 bg-red-500/[0.03]">
                  <h4 className="text-xs font-medium text-red-400 mb-3">What Remains Hidden</h4>
                  <ul className="space-y-2 text-[10px] text-white/50">
                    <li className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Actual sender identity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Actual receiver identity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Transaction amount</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-red-400" />
                      <span>Link between deposit/withdrawal</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Security Measures */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.01]">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/85">5. Security Measures</h3>
                  <p className="text-[10px] text-white/30">How your funds are protected</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-3">
                {[
                  {
                    title: "Double-Spend Prevention",
                    desc: "Nullifiers are stored on-chain. Each FP can only be spent once. Attempting to reuse triggers rejection.",
                  },
                  {
                    title: "24-Hour Withdrawal Timelock",
                    desc: "All withdrawals require 24h waiting period. Allows cancellation if wallet is compromised.",
                  },
                  {
                    title: "Emergency Pause",
                    desc: "Protocol can be paused by governance in case of critical vulnerabilities. Funds remain safe.",
                  },
                  {
                    title: "On-Chain Verification",
                    desc: "All ZK proofs and ring signatures verified by smart contract. Invalid proofs rejected.",
                  },
                  {
                    title: "Client-Side Key Storage",
                    desc: "Private keys never leave your device. Protocol never has access to your secrets.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded border border-white/[0.04] bg-white/[0.01]">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-medium text-white/80">{item.title}</h4>
                      <p className="text-[9px] text-white/40 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 6: Tokenomics */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-white/[0.01]">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-medium text-white/85">6. Tokenomics & Value Stability</h3>
                  <p className="text-[10px] text-white/30">How FP maintains its $10 value</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              {/* 100% Backed */}
              <div className="p-4 rounded border border-green-500/20 bg-green-500/[0.03]">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-green-400" />
                  <h4 className="text-sm font-medium text-green-400">100% USDT Collateralized</h4>
                </div>
                <div className="space-y-2 text-[11px] text-white/50">
                  <p>Every FP Token is backed 1:1 by USDT held in the Treasury smart contract.</p>
                  <p>
                    This is verifiable on-chain at any time by calling{" "}
                    <code className="text-green-400">getReserveProof()</code>.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-black/30">
                    <p className="text-[9px] text-white/30 font-mono">INVARIANT</p>
                    <p className="text-xs text-green-400 font-mono mt-1">Treasury ≥ FP × $10</p>
                  </div>
                  <div className="p-3 rounded bg-black/30">
                    <p className="text-[9px] text-white/30 font-mono">BACKING RATIO</p>
                    <p className="text-xs text-green-400 font-mono mt-1">100% (Always)</p>
                  </div>
                </div>
              </div>

              {/* Value Stability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded border border-white/[0.04] bg-white/[0.01]">
                  <h4 className="text-xs font-medium text-white/80 mb-2">Fixed Denomination</h4>
                  <p className="text-[10px] text-white/40">
                    Each FP = exactly $10. No price fluctuation. No oracle manipulation risk.
                  </p>
                </div>
                <div className="p-4 rounded border border-white/[0.04] bg-white/[0.01]">
                  <h4 className="text-xs font-medium text-white/80 mb-2">No Inflation</h4>
                  <p className="text-[10px] text-white/40">
                    FP only minted when USDT deposited. Total supply = Total USDT in Treasury / 10.
                  </p>
                </div>
              </div>

              {/* Fee Structure */}
              <div className="p-4 rounded bg-black/30">
                <h4 className="text-xs font-medium text-white/60 mb-3">Protocol Fee Structure</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-violet-400">0.1%</p>
                    <p className="text-[9px] text-white/30 font-mono">DEPOSIT FEE</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-400">0%</p>
                    <p className="text-[9px] text-white/30 font-mono">TRANSFER FEE</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-amber-400">0.1%</p>
                    <p className="text-[9px] text-white/30 font-mono">WITHDRAW FEE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-white/20 font-mono">
            FLOATING POINT PROTOCOL v1.0 · PRIVACY-PRESERVING PAYMENTS ON ETHEREUM
          </p>
          <p className="text-[9px] text-white/15 font-mono mt-2">
            Contract: {DEFAULT_CONTRACT_CONFIG.address} · Chain ID: {DEFAULT_CONTRACT_CONFIG.chainId}
          </p>
        </div>
      </div>
    </footer>
  )
}
