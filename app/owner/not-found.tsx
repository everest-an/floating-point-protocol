import Link from "next/link"

export default function OwnerNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white/20 mb-4">404</h1>
        <p className="text-white/40 mb-8">Page not found</p>
        <Link
          href="/"
          className="px-4 py-2 rounded bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
