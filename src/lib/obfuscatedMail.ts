/** Assemble a mailto target without a scrape-friendly address in static HTML. */
export function openFeedbackMail(): void {
  const parts = ["hello", "zipofile", "com"];
  const subject = encodeURIComponent("ZipoFile Feedback");
  window.location.href = `mailto:${parts[0]}\u0040${parts[1]}.${parts[2]}?subject=${subject}`;
}
