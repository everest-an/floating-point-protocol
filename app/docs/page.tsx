import Link from "next/link"
import { ArrowLeft, Code, Database, Lock, Zap } from "lucide-react"

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">API Documentation</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">API Documentation</h1>
          <p className="text-white/50">Complete reference for integrating with Floating Point Protocol</p>
        </div>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400" />
            Quick Start
          </h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-white/60 mb-4">Install the FPP SDK:</p>
            <div className="rounded bg-black/50 p-4 font-mono text-sm text-violet-400">npm install @fpp/sdk</div>
            <p className="text-white/60 mt-6 mb-4">Initialize the client:</p>
            <div className="rounded bg-black/50 p-4 font-mono text-sm text-white/70 overflow-x-auto">
              <pre>{`import { FPPClient } from '@fpp/sdk'

const client = new FPPClient({
  network: 'ethereum',
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY'
})`}</pre>
            </div>
          </div>
        </section>

        {/* Core Methods */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6 flex items-center gap-2">
            <Code className="w-5 h-5 text-violet-400" />
            Core Methods
          </h2>
          <div className="space-y-4">
            {[
              {
                name: "deposit(amount)",
                desc: "Deposit USDT to mint Floating Points",
                returns: "Promise<FloatingPoint[]>",
              },
              {
                name: "transfer(points, recipient)",
                desc: "Private transfer using ZK proofs",
                returns: "Promise<TxReceipt>",
              },
              { name: "withdraw(points)", desc: "Burn points and redeem USDT", returns: "Promise<TxReceipt>" },
              { name: "getBalance()", desc: "Get user's Floating Point balance", returns: "Promise<FloatingPoint[]>" },
              { name: "generateProof(points)", desc: "Generate ZK proof for transaction", returns: "Promise<ZKProof>" },
            ].map((method, i) => (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-violet-400 font-mono text-sm">{method.name}</code>
                  <span className="text-[10px] text-white/30 font-mono">{method.returns}</span>
                </div>
                <p className="text-white/50 text-sm">{method.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Smart Contract */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white/80 mb-6 flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            Smart Contract Interface
          </h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="rounded bg-black/50 p-4 font-mono text-sm text-white/70 overflow-x-auto">
              <pre>{`interface IFloatingPointProtocol {
    function deposit(uint256 amount, bytes32 commitment) external;
    function privacyPayment(
        bytes32[] calldata inputNullifiers,
        bytes32[] calldata outputCommitments,
        bytes calldata zkProof,
        bytes calldata ringSignature
    ) external;
    function requestWithdrawal(bytes32 nullifier, bytes calldata proof) external;
    function completeWithdrawal(uint256 withdrawalId) external;
}`}</pre>
            </div>
          </div>
        </section>

        {/* Security */}
        <section>
          <h2 className="text-xl font-semibold text-white/80 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-400" />
            Security Considerations
          </h2>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
            <ul className="space-y-3 text-white/60 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1">•</span>
                Never expose private keys or nullifier secrets client-side
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1">•</span>
                Always verify ZK proofs before broadcasting transactions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1">•</span>
                Use secure random number generation for commitments
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400 mt-1">•</span>
                Ring size should be at least 8 for adequate anonymity
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
