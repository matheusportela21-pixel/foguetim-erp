'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Rocket, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const TIMM_IMAGES: Record<string, string> = {
  search:      '/mascot/timm-search.png',
  box:         '/mascot/timm-box.png',
  connect:     '/mascot/timm-connect.png',
  calculator:  '/mascot/timm-calculator.png',
  maintenance: '/mascot/timm-maintenance.png',
  celebrate:   '/mascot/timm-celebrate.png',
  thinking:    '/mascot/timm-thinking.png',
  waving:      '/mascot/timm-waving.png',
  standing:    '/mascot/timm-standing.png',
  '404':       '/mascot/timm-404.png',
  open:        '/mascot/timm-open.png',
}

export interface EmptyStateProps {
  image:       keyof typeof TIMM_IMAGES
  title:       string
  description: string
  action?: {
    label:    string
    href?:    string
    onClick?: () => void
  }
  /** Optional smaller size for inline empty states */
  compact?: boolean
  className?: string
}

export function EmptyState({ image, title, description, action, compact, className }: EmptyStateProps) {
  const [imgErr, setImgErr] = useState(false)
  const src = TIMM_IMAGES[image] ?? TIMM_IMAGES.standing
  const imgSize = compact ? 120 : 180

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className ?? ''}`}
    >
      {/* Timm image */}
      <div className="mb-6">
        {!imgErr ? (
          <Image
            src={src}
            alt="Timm"
            width={imgSize}
            height={imgSize}
            className="object-contain drop-shadow-lg"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            className="rounded-full bg-primary-500/10 flex items-center justify-center"
            style={{ width: imgSize, height: imgSize }}
          >
            <Rocket className="w-12 h-12 text-primary-400" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-lg md:text-xl font-bold text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {/* Action button */}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-primary-600 to-primary-500
                       text-white text-sm font-semibold shadow-glow-sm
                       hover:shadow-neon-purple transition-all duration-200
                       hover:scale-[1.02] active:scale-[0.98]"
          >
            {action.label}
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-primary-600 to-primary-500
                       text-white text-sm font-semibold shadow-glow-sm
                       hover:shadow-neon-purple transition-all duration-200
                       hover:scale-[1.02] active:scale-[0.98]"
          >
            {action.label}
            <ArrowRight className="w-4 h-4" />
          </button>
        )
      )}
    </motion.div>
  )
}

export default EmptyState
