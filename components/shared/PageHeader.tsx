'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-primary-400 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-300">{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
