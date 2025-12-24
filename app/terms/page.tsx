import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white/90 mb-4">Terms of Service</h1>
          <p className="text-white/50">Last updated: January 2025</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">1. Acceptance of Terms</h2>
            <p className="text-white/60 leading-relaxed">
              By accessing or using the Floating Point Protocol (&quot;FPP&quot;, &quot;Protocol&quot;, &quot;we&quot;,
              &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do
              not use the Protocol.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">2. Description of Service</h2>
            <p className="text-white/60 leading-relaxed mb-4">
              FPP is a decentralized privacy-preserving payment protocol built on the Ethereum blockchain. The Protocol
              allows users to:
            </p>
            <ul className="list-disc list-inside text-white/60 space-y-2">
              <li>Deposit USDT to mint Floating Points (FP)</li>
              <li>Transfer FP privately using zero-knowledge proofs and ring signatures</li>
              <li>Redeem FP for USDT (subject to a 24-hour timelock)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">3. Eligibility</h2>
            <p className="text-white/60 leading-relaxed">
              You must be at least 18 years old and legally capable of entering into binding contracts to use the
              Protocol. By using FPP, you represent and warrant that you meet these requirements and are not prohibited
              from using the Protocol under the laws of your jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">4. Risks</h2>
            <p className="text-white/60 leading-relaxed mb-4">You acknowledge and accept the following risks:</p>
            <ul className="list-disc list-inside text-white/60 space-y-2">
              <li>Smart contract vulnerabilities may result in loss of funds</li>
              <li>Cryptocurrency values are volatile</li>
              <li>Private key loss results in permanent loss of access to funds</li>
              <li>Regulatory changes may affect the Protocol&apos;s availability</li>
              <li>Network congestion may delay transactions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">5. Prohibited Uses</h2>
            <p className="text-white/60 leading-relaxed mb-4">You agree not to use the Protocol for:</p>
            <ul className="list-disc list-inside text-white/60 space-y-2">
              <li>Money laundering or terrorist financing</li>
              <li>Circumventing sanctions or export controls</li>
              <li>Any illegal activity under applicable law</li>
              <li>Attempting to exploit or attack the Protocol</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">6. Disclaimer of Warranties</h2>
            <p className="text-white/60 leading-relaxed">
              THE PROTOCOL IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE
              UNINTERRUPTED ACCESS, ERROR-FREE OPERATION, OR THAT THE PROTOCOL WILL MEET YOUR REQUIREMENTS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">7. Limitation of Liability</h2>
            <p className="text-white/60 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white/80 mb-4">8. Contact</h2>
            <p className="text-white/60 leading-relaxed">
              For questions about these Terms, please contact us at legal@fpp.protocol
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
