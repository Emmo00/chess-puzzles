"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"

interface CtaBlockProps {
  title: string
  subtitle: string
  accentColor: string
  icon: ReactNode
  ribbonText?: string
  href?: string
  onClick?: () => void
}

export default function CTABlock({ title, subtitle, accentColor, icon, ribbonText, href = "#", onClick }: CtaBlockProps) {
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
      className={`relative gap-4 w-full h-28 overflow-hidden border-4 border-black ${accentColor} px-3 py-2 font-black text-sm uppercase tracking-wider text-black transition-all duration-200 flex flex-col items-center justify-center cursor-pointer text-center`}
      style={{
        boxShadow: isHovered
          ? "6px 6px 0px rgba(0, 0, 0, 0.3), 0px 0px 16px rgba(0, 0, 0, 0.4)"
          : "4px 4px 0px rgba(0, 0, 0, 0.2)",
        transform: isHovered ? "translate(-2px, -2px) scale(1.05) rotate(1deg)" : "translate(0, 0)",
        display: "flex",
      }}
    >
      {ribbonText ? (
        <span className="pointer-events-none absolute -right-10 top-4 w-36 rotate-45 border-y-2 border-black bg-black px-2 py-0.5 text-center text-[15px] font-black normal-case tracking-wide text-yellow-300">
          {ribbonText}
        </span>
      ) : null}
      <span className="text-xl flex items-center justify-center">{icon}</span>
      <div className="flex flex-col items-center gap-0.5 leading-tight">
        <span className="text-xs font-black">{title}</span>
        <span className="text-[10px] font-bold opacity-75 text-center">{subtitle}</span>
      </div>
    </span>
  )

  return (
    <div
      className="h-full animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{
        animation: `slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
      }}
    >
      {onClick ? (
        <button onClick={onClick} className="w-full h-full">{buttonContent}</button>
      ) : href && href !== "#" ? (
        <Link href={href} className="block h-full">
          {buttonContent}
        </Link>
      ) : (
        <button className="w-full h-full">{buttonContent}</button>
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
