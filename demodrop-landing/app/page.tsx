import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { HowItWorks } from "@/components/how-it-works"
import { StylePresets } from "@/components/style-presets"
import { VideoGenerator } from "@/components/video-generator"
import { Pricing } from "@/components/pricing"
import { SocialProof } from "@/components/social-proof"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <HowItWorks />
        <StylePresets />
        <VideoGenerator />
        <Pricing />
        <SocialProof />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
