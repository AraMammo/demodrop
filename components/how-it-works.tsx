import { Card } from "@/components/ui/card"

const steps = [
  {
    number: "1",
    title: "Input",
    description:
      "Paste your website URL, add Instagram handles, or write custom instructions. The system crawls your content, extracts visuals, and maps your value proposition.",
  },
  {
    number: "2",
    title: "Analysis",
    description:
      "AI identifies key features, user benefits, and visual hierarchy. Matches your brand tone—whether that's enterprise-formal or founder-casual.",
  },
  {
    number: "3",
    title: "Generation",
    description:
      "Sora creates motion sequences. Voiceover synthesizes from your actual website copy. Transitions match your industry standards.",
  },
  {
    number: "4",
    title: "Delivery",
    description:
      "HD video ready to embed, download, or push directly to social platforms. Full edit access if you want to tweak timing or messaging.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">How It Actually Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <Card key={step.number} className="p-8 bg-card border border-border hover:shadow-md transition-shadow">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background font-bold text-lg">
                {step.number}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
