import type { Metadata } from "next";
import { WHY_CONTENT } from "@/lib/staticContent";

export const metadata: Metadata = {
  title: "The Why — Popper Tulimond",
  description:
    "Popper Tulimond is a men's clothing brand for the man who refuses to live as a copy of everyone else — built on a code of sacrifice, quiet strength, and living for the only two judges who matter: the boy you were and the man you'll become. Not for everyone.",
  alternates: { canonical: "https://www.poppertulimond.com/why" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "The Why — Popper Tulimond",
    description:
      "You don't owe the crowd your life. You owe it to two people — the boy who believed in what you could become, and the old man who'll remember how close you got.",
    url: "https://www.poppertulimond.com/why",
    siteName: "Popper Tulimond",
    type: "article",
  },
};

export default function WhyPage() {
  const { title, paragraphs } = WHY_CONTENT;
  const body = paragraphs.slice(0, -2);
  const closing = paragraphs.slice(-2);

  return (
    <main className="min-h-screen bg-obsidian text-parchment flex justify-center px-6 py-24 sm:py-32">
      <article className="w-full max-w-[42rem]">
        <h1
          className="text-center italic mb-16 text-parchment"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(3rem, 8vw, 5rem)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>

        <div
          className="space-y-7"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(1.15rem, 2.2vw, 1.4rem)",
            lineHeight: 1.75,
            color: "rgba(242, 237, 228, 0.9)",
          }}
        >
          {body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div
          className="mt-14 pt-10 text-center space-y-3"
          style={{
            borderTop: "1px solid rgba(196, 164, 86, 0.25)",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1.25rem, 2.6vw, 1.6rem)",
            color: "var(--color-gold)",
          }}
        >
          {closing.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
