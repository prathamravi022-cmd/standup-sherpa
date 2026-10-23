import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-content">
        <span className="not-found-code">Error 404</span>
        <h1 id="not-found-title">This page isn&apos;t on the standup.</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className="not-found-link">
          <ArrowLeft aria-hidden="true" />
          Back to briefing
        </Link>
      </div>
    </section>
  )
}
