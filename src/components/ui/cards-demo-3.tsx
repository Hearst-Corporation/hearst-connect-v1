'use client'

import { cn } from '@/lib/utils'
import { CommandLineIcon } from '@heroicons/react/24/outline'
import { animate } from 'motion/react'
import { motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'

/** Primitives Aceternity `cards-demo-3` — tokens console (même matière que bento-grid). */

const SPARKLE_SPECS = [
  { top: '8%', left: '22%', duration: 4.2, delay: 0 },
  { top: '18%', left: '68%', duration: 5.1, delay: 0.3 },
  { top: '34%', left: '12%', duration: 4.8, delay: 0.6 },
  { top: '42%', left: '54%', duration: 5.4, delay: 0.2 },
  { top: '56%', left: '78%', duration: 4.5, delay: 0.9 },
  { top: '62%', left: '36%', duration: 5.8, delay: 0.4 },
  { top: '74%', left: '18%', duration: 4.1, delay: 0.7 },
  { top: '80%', left: '62%', duration: 5.2, delay: 0.1 },
  { top: '28%', left: '88%', duration: 4.6, delay: 0.5 },
  { top: '48%', left: '4%', duration: 5.6, delay: 0.8 },
  { top: '88%', left: '44%', duration: 4.3, delay: 0.2 },
  { top: '14%', left: '46%', duration: 5.0, delay: 0.6 },
] as const

export function CardDemo() {
  return (
    <Card>
      <CardSkeletonContainer>
        <Skeleton />
      </CardSkeletonContainer>
      <CardTitle>Damn good card</CardTitle>
      <CardDescription>
        A card that showcases a set of tools that you use to create your product.
      </CardDescription>
    </Card>
  )
}

const ICON_ORB_SEQUENCE = [
  ['.circle-1', { scale: [1, 1.1, 1], transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] }, { duration: 0.8 }],
  ['.circle-2', { scale: [1, 1.1, 1], transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] }, { duration: 0.8 }],
  ['.circle-3', { scale: [1, 1.1, 1], transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] }, { duration: 0.8 }],
  ['.circle-4', { scale: [1, 1.1, 1], transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] }, { duration: 0.8 }],
  ['.circle-5', { scale: [1, 1.1, 1], transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] }, { duration: 0.8 }],
] as const

function Skeleton() {
  useEffect(() => {
    void animate(ICON_ORB_SEQUENCE as Parameters<typeof animate>[0], {
      repeat: Infinity,
      repeatDelay: 1,
    })
  }, [])

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-8">
      <div className="flex shrink-0 flex-row items-center justify-center gap-2">
        <IconOrb className="circle-1 size-8">
          <ClaudeLogo className="size-4" />
        </IconOrb>
        <IconOrb className="circle-2 size-12">
          <CommandLineIcon className="size-6 text-white" aria-hidden />
        </IconOrb>
        <IconOrb className="circle-3">
          <OpenAILogo className="size-8 text-white" />
        </IconOrb>
        <IconOrb className="circle-4 size-12">
          <MetaIconOutline className="size-6" />
        </IconOrb>
        <IconOrb className="circle-5 size-8">
          <GeminiLogo className="size-4" />
        </IconOrb>
      </div>

      <div className="animate-move absolute top-20 z-40 m-auto h-40 w-px bg-linear-to-b from-transparent via-accent-400 to-transparent">
        <div className="absolute top-1/2 -left-10 h-32 w-10 -translate-y-1/2">
          <Sparkles />
        </div>
      </div>
    </div>
  )
}

function Sparkles() {
  return (
    <div className="absolute inset-0">
      {SPARKLE_SPECS.map((spec, index) => (
        <motion.span
          key={`sparkle-${index}`}
          animate={{ opacity: [0.2, 1, 0], scale: [1, 1.2, 0] }}
          transition={{
            duration: spec.duration,
            repeat: Infinity,
            ease: 'linear',
            delay: spec.delay,
          }}
          style={{ top: spec.top, left: spec.left }}
          className="absolute inline-block size-0.5 rounded-full bg-white"
        />
      ))}
    </div>
  )
}

export function Card({ className, children }: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <div
      className={cn(
        'group mx-auto w-full max-w-sm rounded-xl bg-console-card p-8 shadow-xs ring-1 ring-console-line backdrop-blur-xl backdrop-saturate-150',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <h3 className={cn('py-2 text-lg font-semibold text-white', className)}>{children}</h3>
}

export function CardDescription({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return <p className={cn('max-w-sm text-sm font-normal text-white/50', className)}>{children}</p>
}

export function CardSkeletonContainer({
  className,
  children,
  showGradient = true,
}: Readonly<{ className?: string; children: ReactNode; showGradient?: boolean }>) {
  return (
    <div
      className={cn(
        'z-40 h-60 rounded-xl md:h-80',
        className,
        showGradient &&
          'bg-console-inset [mask-image:radial-gradient(50%_50%_at_50%_50%,white_0%,transparent_100%)]',
      )}
    >
      {children}
    </div>
  )
}

function IconOrb({ className, children }: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <div
      className={cn(
        'flex size-16 items-center justify-center rounded-full bg-console-inset shadow-[0px_0px_8px_0px_var(--color-console-line-soft)_inset,0px_32px_24px_-16px_rgba(0,0,0,0.40)] ring-1 ring-console-line-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function ClaudeLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      imageRendering="optimizeQuality"
      fillRule="evenodd"
      clipRule="evenodd"
      viewBox="0 0 512 512"
      className={className}
      aria-hidden
    >
      <rect fill="#CC9B7A" width="512" height="512" rx="104.187" ry="105.042" />
      <path
        fill="#1F1F1E"
        fillRule="nonzero"
        d="M318.663 149.787h-43.368l78.952 212.423 43.368.004-78.952-212.427zm-125.326 0l-78.952 212.427h44.255l15.932-44.608 82.846-.004 16.107 44.612h44.255l-79.126-212.427h-45.317zm-4.251 128.341l26.91-74.701 27.083 74.701h-53.993z"
      />
    </svg>
  )
}

export function OpenAILogo({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} width="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M26.153 11.46a6.888 6.888 0 0 0-.608-5.73 7.117 7.117 0 0 0-3.29-2.93 7.238 7.238 0 0 0-4.41-.454 7.065 7.065 0 0 0-2.41-1.742A7.15 7.15 0 0 0 12.514 0a7.216 7.216 0 0 0-4.217 1.346 7.061 7.061 0 0 0-2.603 3.539 7.12 7.12 0 0 0-2.734 1.188A7.012 7.012 0 0 0 .966 8.268a6.979 6.979 0 0 0 .88 8.273 6.89 6.89 0 0 0 .607 5.729 7.117 7.117 0 0 0 3.29 2.93 7.238 7.238 0 0 0 4.41.454 7.061 7.061 0 0 0 2.409 1.742c.92.404 1.916.61 2.923.604a7.215 7.215 0 0 0 4.22-1.345 7.06 7.06 0 0 0 2.605-3.543 7.116 7.116 0 0 0 2.734-1.187 7.01 7.01 0 0 0 1.993-2.196 6.978 6.978 0 0 0-.884-8.27Zm-10.61 14.71c-1.412 0-2.505-.428-3.46-1.215.043-.023.119-.064.168-.094l5.65-3.22a.911.911 0 0 0 .464-.793v-7.86l2.389 1.36a.087.087 0 0 1 .046.065v6.508c0 2.952-2.491 5.248-5.257 5.248ZM4.062 21.354a5.17 5.17 0 0 1-.635-3.516c.042.025.115.07.168.1l5.65 3.22a.928.928 0 0 0 .928 0l6.898-3.93v2.72a.083.083 0 0 1-.034.072l-5.711 3.255a5.386 5.386 0 0 1-4.035.522 5.315 5.315 0 0 1-3.23-2.443ZM2.573 9.184a5.283 5.283 0 0 1 2.768-2.301V13.515a.895.895 0 0 0 .464.793l6.897 3.93-2.388 1.36a.087.087 0 0 1-.08.008L4.52 16.349a5.262 5.262 0 0 1-2.475-3.185 5.192 5.192 0 0 1 .527-3.98Zm19.623 4.506-6.898-3.93 2.388-1.36a.087.087 0 0 1 .08-.008l5.713 3.255a5.28 5.28 0 0 1 2.054 2.118 5.19 5.19 0 0 1-.488 5.608 5.314 5.314 0 0 1-2.39 1.742v-6.633a.896.896 0 0 0-.459-.792Zm2.377-3.533a7.973 7.973 0 0 0-.168-.099l-5.65-3.22a.93.93 0 0 0-.928 0l-6.898 3.93V8.046a.083.083 0 0 1 .034-.072l5.712-3.251a5.375 5.375 0 0 1 5.698.241 5.262 5.262 0 0 1 1.865 2.28c.39.92.506 1.93.335 2.913ZM9.631 15.009l-2.39-1.36a.083.083 0 0 1-.046-.065V7.075c.001-.997.29-1.973.832-2.814a5.297 5.297 0 0 1 2.231-1.935 5.382 5.382 0 0 1 5.659.72 4.89 4.89 0 0 0-.168.093l-5.65 3.22a.913.913 0 0 0-.465.793l-.003 7.857Zm1.297-2.76L14 10.5l3.072 1.75v3.5L14 17.499l-3.072-1.75v-3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function GeminiLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
        fill="url(#gemini-gradient)"
      />
      <defs>
        <radialGradient
          id="gemini-gradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)"
        >
          <stop offset=".067" stopColor="#9168C0" />
          <stop offset=".343" stopColor="#5684D1" />
          <stop offset=".672" stopColor="#1BA1E3" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export function MetaIconOutline({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 287.56 191"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="meta-gradient-a"
          x1="62.34"
          y1="101.45"
          x2="260.34"
          y2="91.45"
          gradientTransform="matrix(1, 0, 0, -1, 0, 192)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0064e1" />
          <stop offset="0.4" stopColor="#0064e1" />
          <stop offset="0.83" stopColor="#0073ee" />
          <stop offset="1" stopColor="#0082fb" />
        </linearGradient>
        <linearGradient
          id="meta-gradient-b"
          x1="41.42"
          y1="53"
          x2="41.42"
          y2="126"
          gradientTransform="matrix(1, 0, 0, -1, 0, 192)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0082fb" />
          <stop offset="1" stopColor="#0064e0" />
        </linearGradient>
      </defs>
      <path
        fill="#0081fb"
        d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85Z"
      />
      <path
        fill="url(#meta-gradient-a)"
        d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"
      />
      <path
        fill="url(#meta-gradient-b)"
        d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"
      />
    </svg>
  )
}
