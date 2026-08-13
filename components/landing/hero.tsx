"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/*
 * Each slide pairs a headline with its own supporting line and image, so the
 * three rotate together as one coherent message rather than a headline swapping
 * over fixed copy. The tallest headline/subheading reserve the vertical space
 * (via invisible sizers) so surrounding content never jumps as slides fade.
 */
type Slide = {
  headline: string
  subheading: string
  image: string
  alt: string
}

const SLIDES: Slide[] = [
  {
    headline: "Say thank you in a way that actually feels like you.",
    subheading:
      "Every note sounds like something you'd actually say — never a template. Speak it, type it, or let Thankful draft from your own words, then make it yours.",
    image: "/landing/hero-voice.png",
    alt: "A printed thank-you card reading 'With gratitude — Thank you' above a warm handwritten note",
  },
  {
    headline: "You felt the gratitude. We'll help you say it.",
    subheading:
      "You already know how grateful you are. Thankful turns that feeling into the right words, so the thank-you you meant to send finally makes it onto the page.",
    image: "/landing/hero-writing.png",
    alt: "A hand writing a heartfelt note with a fountain pen on a cream thank-you card",
  },
  {
    headline: "Never lose track of who gave what — or how to thank them.",
    subheading:
      "Thankful remembers every gift, who gave it, and the little detail that made it special — so nothing slips through the cracks, whether it's five notes or fifty.",
    image: "/landing/hero-tracked.png",
    alt: "Several finished cream thank-you cards and addressed envelopes fanned out in a row",
  },
]

const INTERVAL_MS = 5000

// The longest lines, used as invisible sizers to lock in a stable height.
const TALLEST_HEADLINE = SLIDES.reduce((a, b) =>
  a.headline.length >= b.headline.length ? a : b,
).headline
const TALLEST_SUBHEADING = SLIDES.reduce((a, b) =>
  a.subheading.length >= b.subheading.length ? a : b,
).subheading

export function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = useCallback((next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [paused])

  return (
    <section className="relative overflow-hidden">
      <div
        className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-28"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Thank-you notes, on your terms
          </span>

          {/* Rotating headline */}
          <div className="relative" aria-live="polite">
            <h1
              aria-hidden="true"
              className="invisible max-w-xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              {TALLEST_HEADLINE}
            </h1>
            {SLIDES.map((slide, i) => (
              <h1
                key={slide.headline}
                aria-hidden={i === index ? undefined : "true"}
                className={`absolute inset-0 max-w-xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-balance transition-opacity duration-700 ease-in-out sm:text-5xl lg:text-6xl ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              >
                {slide.headline}
              </h1>
            ))}
          </div>

          {/* Rotating subheading */}
          <div className="relative max-w-xl">
            <p
              aria-hidden="true"
              className="invisible text-lg leading-relaxed"
            >
              {TALLEST_SUBHEADING}
            </p>
            {SLIDES.map((slide, i) => (
              <p
                key={slide.subheading}
                aria-hidden={i === index ? undefined : "true"}
                className={`absolute inset-0 text-lg leading-relaxed text-muted-foreground text-pretty transition-opacity duration-700 ease-in-out ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              >
                {slide.subheading}
              </p>
            ))}
          </div>

          {/* Dot controls */}
          <div className="flex items-center gap-2.5">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.headline}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show message ${i + 1}: ${slide.headline}`}
                aria-pressed={i === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-6 bg-primary"
                    : "w-2 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Get started free
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/how-to" />}
            >
              See how it works
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            You stay in control — record, upload, or type; let it draft or write
            every word yourself. No pressure, no lock-in.
          </p>
        </div>

        {/* Rotating image */}
        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-3xl border shadow-xl shadow-primary/5">
            {SLIDES.map((slide, i) => (
              <Image
                key={slide.image}
                src={slide.image || "/placeholder.svg"}
                alt={i === index ? slide.alt : ""}
                aria-hidden={i === index ? undefined : "true"}
                width={1024}
                height={1024}
                priority={i === 0}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
          <div className="absolute -bottom-5 -left-4 hidden max-w-[15rem] rotate-[-4deg] rounded-2xl border bg-card p-4 shadow-lg sm:block">
            <p className="font-hand text-2xl leading-tight text-foreground">
              &ldquo;Dear Aunt Marie, the vase is perfect for the front
              window&hellip;&rdquo;
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your words, your voice.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
