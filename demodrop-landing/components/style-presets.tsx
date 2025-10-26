import { Card } from "@/components/ui/card"

const presets = [
  {
    title: "Enterprise SaaS",
    description:
      "Calm pacing. Data-driven visuals. Authoritative voiceover. Built for buyers who need proof, not hype.",
  },
  {
    title: "Startup Energy",
    description: "Fast cuts. Bold text overlays. Conversational tone. Made for founders who hate corporate speak.",
  },
  {
    title: "Product Demo",
    description: "Feature-focused. Screen recordings with callouts. Clear problem → solution flow. Zero fluff.",
  },
  {
    title: "Brand Story",
    description:
      "Human-first. Testimonial integration. Emotion without manipulation. For teams who've earned trust and want to show it.",
  },
]

export function StylePresets() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">Style Presets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset) => (
            <Card key={preset.title} className="p-6 bg-card border border-border hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-foreground mb-3">{preset.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{preset.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
