"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface CtaBlockProps {
  title: string
  subtitle: string
  accentColor: string
  icon: string
  href?: string
}

export default function CTABlock({ title, subtitle, accentColor, icon, href = "#" }: CtaBlockProps) {
  const [mounted, setMounted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const buttonContent = (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full border-4 border-black ${accentColor} px-3 py-4 font-black text-xs uppercase tracking-wider text-black transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer`}
      style={{
        boxShadow: isHovered
          ? "6px 6px 0px rgba(0, 0, 0, 0.3), 0px 0px 16px rgba(0, 0, 0, 0.4)"
          : "4px 4px 0px rgba(0, 0, 0, 0.2)",
        transform: isHovered ? "translate(-2px, -2px) scale(1.05) rotate(1deg)" : "translate(0, 0)",
        display: "flex",
      }}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-black">{title}</span>
        <span className="text-[10px] font-bold opacity-75">{subtitle}</span>
      </div>
    </span>
  )

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{
        animation: `slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
      }}
    >
      {href && href !== "#" ? (
        <Link href={href} className="block">
          {buttonContent}
        </Link>
      ) : (
        <button className="w-full">{buttonContent}</button>
      )}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) rotate(-2deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
        }

        button:active span {
          animation: jitter 0.15s ease-in-out;
        }

        @keyframes jitter {
          0%, 100% {
            transform: translate(0, 0) scale(1.05) rotate(1deg);
          }
          25% {
            transform: translate(-2px, -2px) scale(1.05) rotate(-1deg);
          }
          50% {
            transform: translate(2px, 2px) scale(1.05) rotate(1deg);
          }
          75% {
            transform: translate(-2px, 2px) scale(1.05) rotate(-1deg);
          }
        }
      `}</style>
    </div>
  )
}
