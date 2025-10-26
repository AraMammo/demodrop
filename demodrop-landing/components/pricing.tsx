import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Free Trial",
    price: "$0",
    tagline: "Test the system",
    features: ["1 video with watermark", "Test if AI understands your product"],
    cta: "Start Free Trial",
    variant: "outline" as const,
    featured: false,
  },
  {
    name: "Pro",
    price: "$59/month",
    tagline: "For consistent content",
    features: ["Unlimited videos", "No watermark", "Priority processing", "Full edit access"],
    cta: "Upgrade to Pro",
    variant: "default" as const,
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    tagline: "Programmatic creation",
    features: ["API access", "White-label options", "Dedicated capacity", "Volume pricing"],
    cta: "Contact Sales",
    variant: "outline" as const,
    featured: false,
  },
]

export function Pricing() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">Transparent Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-8 bg-card ${plan.featured ? "border-2 border-foreground" : "border border-border"}`}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.tagline}</p>
                </div>
                <div>
                  <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                      <span className="text-base text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.variant} className="w-full h-12 text-base">
                  {plan.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
