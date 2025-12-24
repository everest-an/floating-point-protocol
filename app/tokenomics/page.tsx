import Link from "next/link"
import { ArrowLeft, Coins, TrendingUp, Lock, Shield } from "lucide-react"

export default function TokenomicsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">Tokenomics</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">Tokenomics</h1>
          <p className="text-white/50">Economic model and value stability mechanisms</p>
        </div>

        {/* Key Metrics */}
        <section className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <Coins className="w-8 h-8 text-violet-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white/90">$10</p>
              <p className="text-xs text-white/40">Fixed Value per FP</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white/90">100%</p>
              <p className="text-xs text-white/40">USDT Collateral</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white/90">0.1%</p>
              <p className="text-xs text-white/40">Protocol Fee</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white/90">24h</p>
              <p className="text-xs text-white/40">Withdrawal Lock</p>
            </div>
          </div>
        </section>

        {/* Value Stability */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Value Stability Mechanism</h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-white/80 mb-2">1. 100% USDT Collateralization</h3>
                <p className="text-sm text-white/50">
                  Every Floating Point is backed by exactly $10 USDT locked in the Treasury smart contract. This ensures
                  intrinsic value and eliminates depegging risk.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-white/80 mb-2">2. Fixed Denomination</h3>
                <p className="text-sm text-white/50">
                  Unlike variable-value tokens, each FP has a fixed $10 value. This simplifies accounting and prevents
                  price manipulation.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-white/80 mb-2">3. On-Chain Reserve Proof</h3>
                <p className="text-sm text-white/50">
                  Treasury balance is publicly verifiable on-chain. Total USDT in Treasury always equals (Total FP
                  Supply × $10).
                </p>
              </div>
              <div>
                <h3 className="font-medium text-white/80 mb-2">4. No Secondary Market Risk</h3>
                <p className="text-sm text-white/50">
                  FP tokens are not tradeable on exchanges. They can only be minted by depositing USDT and burned by
                  redeeming USDT, ensuring 1:1 value preservation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Token Flow */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Token Flow Lifecycle</h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {[
                { step: "1", label: "Deposit USDT", sub: "User sends USDT" },
                { step: "2", label: "Mint FP", sub: "Contract creates points" },
                { step: "3", label: "Private Transfer", sub: "ZK + Ring Signature" },
                { step: "4", label: "Burn FP", sub: "Request withdrawal" },
                { step: "5", label: "Redeem USDT", sub: "After 24h timelock" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full border border-violet-500/50 bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold mb-2">
                      {item.step}
                    </div>
                    <p className="text-sm text-white/80">{item.label}</p>
                    <p className="text-[10px] text-white/40">{item.sub}</p>
                  </div>
                  {i < 4 && <div className="hidden md:block text-white/20">→</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Fee Structure */}
        <section>
          <h2 className="text-xl font-semibold text-white/80 mb-6">Fee Structure</h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left p-4 text-white/60 font-medium">Action</th>
                  <th className="text-right p-4 text-white/60 font-medium">Fee</th>
                  <th className="text-right p-4 text-white/60 font-medium">Example</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/[0.04]">
                  <td className="p-4 text-white/80">Deposit (Mint FP)</td>
                  <td className="p-4 text-right text-violet-400">0.1%</td>
                  <td className="p-4 text-right text-white/50">$100 → 9.99 FP</td>
                </tr>
                <tr className="border-b border-white/[0.04]">
                  <td className="p-4 text-white/80">Private Transfer</td>
                  <td className="p-4 text-right text-green-400">Free</td>
                  <td className="p-4 text-right text-white/50">10 FP → 10 FP</td>
                </tr>
                <tr>
                  <td className="p-4 text-white/80">Withdraw (Burn FP)</td>
                  <td className="p-4 text-right text-violet-400">0.1%</td>
                  <td className="p-4 text-right text-white/50">10 FP → $99.90</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
