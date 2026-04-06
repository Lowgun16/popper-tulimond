"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const, delay },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 1.4, ease: "easeOut" as const, delay },
  }),
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-obsidian">

      {/* Brand pattern background */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 2.5, ease: "easeOut" }}
      >
        <Image
          src="/brand-pattern.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          aria-hidden="true"
        />
      </motion.div>

      {/* Gradient vignette over pattern */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-obsidian/60 via-transparent to-obsidian/90" />

      {/* ── Navigation ── */}
      <motion.nav
        className="relative z-20 flex items-center justify-between px-8 md:px-16 pt-10"
        custom={0.2}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <Image
          src="/assets/branding/logo-horizontal.png"
          alt="Popper Tulimond"
          width={280}
          height={80}
          className="object-contain"
          priority
        />

        <ul className="hidden md:flex items-center gap-10">
          {["Collection", "Lookbook", "About", "Contact"].map((item) => (
            <li key={item}>
              <a
                href="#"
                className="type-eyebrow hover:text-gold-light transition-colors duration-300"
                style={{ color: "var(--color-parchment)" }}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </motion.nav>

      {/* ── Hero Content ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6 py-24">

        {/* Eyebrow */}
        <motion.p
          className="type-eyebrow mb-8 tracking-[0.3em]"
          custom={0.5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          New Collection — 2025
        </motion.p>

        {/* Gold divider */}
        <motion.div
          className="divider-gold mx-auto mb-10"
          custom={0.65}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        />

        {/* Display headline */}
        <motion.h1
          className="type-display text-gold-gradient max-w-4xl"
          custom={0.8}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          Dressed in Power.
        </motion.h1>

        {/* Sub-headline */}
        <motion.h2
          className="type-heading mt-6 max-w-xl"
          style={{ color: "var(--color-gold)", letterSpacing: "0.18em" }}
          custom={1.0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          Popper Tulimond
        </motion.h2>

        {/* Body copy */}
        <motion.p
          className="type-body mt-6 max-w-md opacity-70"
          custom={1.15}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          Heritage craft. Unapologetic presence. Each piece is a declaration —
          worn by those who require no introduction.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4 mt-12"
          custom={1.3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <a
            href="#"
            className="type-eyebrow px-10 py-4 border border-gold text-gold hover:bg-gold hover:text-obsidian transition-all duration-500 tracking-[0.25em]"
          >
            Shop Collection
          </a>
          <a
            href="#"
            className="type-eyebrow px-10 py-4 border border-parchment/30 text-parchment/60 hover:border-parchment/60 hover:text-parchment transition-all duration-500 tracking-[0.25em]"
          >
            Our Story
          </a>
        </motion.div>

        {/* Emblem seal */}
        <motion.div
          className="mt-20 opacity-20 hover:opacity-40 transition-opacity duration-700"
          custom={1.6}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <Image
            src="/assets/branding/logo-emblem.png"
            alt="PT Seal"
            width={90}
            height={90}
            className="object-contain"
          />
        </motion.div>

      </div>

      {/* ── Scroll indicator ── */}
      <motion.div
        className="relative z-20 flex flex-col items-center pb-10 gap-2"
        custom={2.0}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <span className="type-caption" style={{ color: "var(--color-gold)", opacity: 0.5 }}>
          Scroll
        </span>
        <motion.div
          className="w-px h-10 bg-gold/40"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>

    </section>
  );
}
