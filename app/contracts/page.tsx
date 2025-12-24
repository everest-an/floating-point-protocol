import Link from "next/link"
import { ArrowLeft, FileCode, Copy, ExternalLink } from "lucide-react"

export default function ContractsPage() {
  const contracts = [
    {
      name: "FloatingPointProtocol",
      address: "0x1234...5678",
      network: "Ethereum Mainnet",
      verified: true,
    },
    {
      name: "FPPVerifier",
      address: "0x8765...4321",
      network: "Ethereum Mainnet",
      verified: true,
    },
    {
      name: "Treasury",
      address: "0xabcd...efgh",
      network: "Ethereum Mainnet",
      verified: true,
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">Smart Contracts</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">Smart Contracts</h1>
          <p className="text-white/50">Deployed and verified contracts on Ethereum Mainnet</p>
        </div>

        <div className="space-y-4">
          {contracts.map((contract, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-violet-400" />
                  <h3 className="font-medium text-white/80">{contract.name}</h3>
                </div>
                {contract.verified && (
                  <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">Verified</span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm text-white/60 font-mono">{contract.address}</code>
                <button className="p-1 hover:bg-white/10 rounded transition-colors">
                  <Copy className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{contract.network}</span>
                <a
                  href={`https://etherscan.io/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                >
                  View on Etherscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Source Code */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6">Source Code</h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-white/60 mb-4">All smart contract source code is open-source and available on GitHub.</p>
            <a
              href="https://github.com/fpp-protocol/contracts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm"
            >
              View on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
