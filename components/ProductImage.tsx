'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'

interface ProductImageProps {
  src?:       string | null
  alt?:       string
  size?:      'xs' | 'sm' | 'md' | 'lg'
  contain?:   boolean          // use object-contain instead of object-cover (for logos)
  className?: string
  rounded?:   string           // tailwind rounded class, default 'rounded-lg'
}

const SIZE_MAP = {
  xs: 'w-8  h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

const ICON_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4   h-4',
  md: 'w-5   h-5',
  lg: 'w-7   h-7',
}

export default function ProductImage({
  src,
  alt       = 'Imagem do produto',
  size      = 'md',
  contain   = false,
  className = '',
  rounded   = 'rounded-lg',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false)

  const sizeClass = SIZE_MAP[size]
  const iconClass = ICON_MAP[size]
  const fitClass  = contain ? 'object-contain' : 'object-cover'

  if (!src || failed) {
    return (
      <div
        className={`${sizeClass} ${rounded} flex-shrink-0 flex items-center justify-center bg-dark-700 border border-white/[0.06] ${className}`}
      >
        <Package className={`${iconClass} text-slate-600`} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      width={128}
      height={128}
      onError={() => setFailed(true)}
      className={`${sizeClass} ${rounded} flex-shrink-0 ${fitClass} bg-dark-700 ${className}`}
    />
  )
}
