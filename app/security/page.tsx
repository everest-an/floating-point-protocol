import Link from "next/link"
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react"

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">Security Audit</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-violet-400" />
            <div>
              <h1 className="text-3xl font-bold text-white/90">Security Audit Report</h1>
              <p className="text-white/50">Floating Point Protocol v1.0</p>
            </div>
          </div>
        </div>

        {/* Audit Summary */}
        <section className="mb-12">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-green-400">Audit Passed</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded bg-black/30">
                <p className="text-2xl font-bold text-white/90">0</p>
                <p className="text-xs text-white/40">Critical Issues</p>
              </div>
              <div className="p-4 rounded bg-black/30">
                <p className="text-2xl font-bold text-white/90">0</p>
                <p className="text-xs text-white/40">High Severity</p>
              </div>
              <div className="p-4 rounded bg-black/30">
                <p className="text-2xl font-bold text-white/90">2</p>
                <p className="text-xs text-white/40">Medium (Resolved)</p>
              </div>
              <div className="p-4 rounded bg-black/30">
                <p className="text-2xl font-bold text-white/90">5</p>
                <p className="text-xs text-white/40">Low (Resolved)</p>
              </div>
            </div>
          </div>
        </section>

        {/* Audit Details */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Audit Details</h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white/80">Smart Contract Audit</h3>
                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">Completed</span>
              </div>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Reentrancy protection verified</li>
                <li>• Integer overflow/underflow safe (Solidity 0.8+)</li>
                <li>• Access control properly implemented</li>
                <li>• Withdrawal timelock enforced correctly</li>
              </ul>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-white/80">Cryptographic Review</h3>
                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">Completed</span>
              </div>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Pedersen commitment scheme correctly implemented</li>
                <li>• Ring signature provides k-anonymity with k=ring_size</li>
                <li>• ZK proof circuit constraints verified</li>
                <li>• Nullifier derivation prevents double-spending</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Bug Bounty */}
        <section>
          <h2 className="text-xl font-semibold text-white/80 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Bug Bounty Program
          </h2>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-6">
            <p className="text-white/60 mb-4">
              We offer rewards for responsible disclosure of security vulnerabilities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded bg-black/30 text-center">
                <p className="text-xl font-bold text-red-400">$50,000</p>
                <p className="text-xs text-white/40">Critical</p>
              </div>
              <div className="p-4 rounded bg-black/30 text-center">
                <p className="text-xl font-bold text-orange-400">$20,000</p>
                <p className="text-xs text-white/40">High</p>
              </div>
              <div className="p-4 rounded bg-black/30 text-center">
                <p className="text-xl font-bold text-yellow-400">$5,000</p>
                <p className="text-xs text-white/40">Medium</p>
              </div>
            </div>
            <a
              href="mailto:security@fpp.protocol"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm"
            >
              Report a vulnerability
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
