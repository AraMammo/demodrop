const faqs = [
  {
    question: "How accurate is the AI?",
    answer:
      "It analyzes your website structure, copy, and visual hierarchy. If your website clearly explains your product, the video will too. If your site is vague, the output will be vague. Input quality = output quality.",
  },
  {
    question: "Can I edit the video?",
    answer:
      "Yes. Full timeline editor. Change voiceover, swap scenes, adjust pacing. Or regenerate with new instructions.",
  },
  {
    question: "What if my product is complex?",
    answer: "Add custom instructions. Link to product docs. The system prioritizes clarity over creativity.",
  },
  {
    question: "Do you store my content?",
    answer:
      "We cache images and copy for 30 days to speed up regeneration. Then it's deleted. We don't train models on your data.",
  },
  {
    question: "Why not just hire a video editor?",
    answer:
      "You should—for flagship content. Use DemoDrop for everything else: feature updates, A/B tests, social clips, sales enablement.",
  },
]

export function FAQ() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-foreground mb-12">Common Questions</h2>
        <div className="space-y-8">
          {faqs.map((faq, index) => (
            <div key={index} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{faq.question}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
