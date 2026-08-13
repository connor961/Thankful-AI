import Link from "next/link"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <Heart className="size-1/2 fill-current" aria-hidden="true" />
    </span>
  )
}

export function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <BrandMark className="size-9" />
      <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
        Thankful <span className="text-primary">AI</span>
      </span>
    </Link>
  )
}
