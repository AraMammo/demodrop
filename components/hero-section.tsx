"use client"

import { Button } from "@/components/ui/button"

export function HeroSection() {
  const scrollToGenerator = () => {
    const generator = document.getElementById("generator")
    generator?.scrollIntoView({ behavior: "smooth" })
  }

  const scrollToHowItWorks = () => {
    const howItWorks = document.getElementById("how-it-works")
    howItWorks?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
            Demo Videos That Actually Explain Your Product
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Drop a URL. Get a professional demo video in minutes. No creative briefs, no revision cycles, no agency
            fees.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-base" onClick={scrollToGenerator}>
              Start Free Video
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-base bg-transparent"
              onClick={scrollToHowItWorks}
            >
              See How It Works
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Used by 2,400+ product teams. Average generation time: 4 minutes.
          </p>
        </div>
      </div>
    </section>
  )
}
