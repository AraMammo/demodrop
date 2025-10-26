const testimonials = [
  {
    quote: "Reduced demo video production from 3 weeks to 8 minutes",
    attribution: "SaaS Founder, Toronto",
  },
  {
    quote: "Stopped paying $4K per video. Now we test 10 variations monthly.",
    attribution: "Marketing Lead, SF",
  },
  {
    quote: "First AI tool that actually got our tone right.",
    attribution: "Technical PM, Austin",
  },
]

export function SocialProof() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">Real Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="border-l-4 border-foreground pl-6">
              <blockquote className="text-lg font-medium text-foreground mb-3">{testimonial.quote}</blockquote>
              <cite className="text-sm text-muted-foreground not-italic">— {testimonial.attribution}</cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
