import { Whitepaper } from "@/components/whitepaper"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/[0.04] sticky top-0 z-50 bg-black/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-violet-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to App</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-white/80">Whitepaper</h1>
        </div>
      </header>
      <Whitepaper />
    </div>
  )
}
