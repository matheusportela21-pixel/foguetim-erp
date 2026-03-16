'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown, ChevronRight, Sparkles, AlertCircle, X,
} from 'lucide-react'
import type {
  NormalizedMlAttribute,
  MlIdentifierField,
  MlVariationField,
  MlAttributeUiSection,
  MlAttributeSuggestion,
} from '@/lib/ml/attributes/types'

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface AttributeSectionProps {
  sections:       MlAttributeUiSection[]
  identifiers:    MlIdentifierField[]
  variationFields: MlVariationField[]
  values:         Record<string, string>
  onChange:       (id: string, value: string) => void
  onNAToggle:     (id: string) => void
  naValues:       Set<string>
  categoryName:   string
  productTitle:   string
  onAISuggest?:   () => void
  canUseAI:       boolean
}

/* ── Shared styles ───────────────────────────────────────────────────────── */

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg bg-dark-700 border border-white/[0.08] text-white ' +
  'placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-colors'

const selectCls = inputCls

/* ── Single attribute field ──────────────────────────────────────────────── */

function AttrField({
  attr, value, isNA, changed, onChange, onToggleNA,
}: {
  attr:       NormalizedMlAttribute
  value:      string
  isNA:       boolean
  changed:    boolean
  onChange:   (v: string) => void
  onToggleNA: () => void
}) {
  const canBeNA   = !attr.is_required
  const borderCls = attr.is_required && !value && !isNA
    ? ' border-red-500/50 focus:ring-red-500/40'
    : changed
    ? ' border-yellow-500/50'
    : ''
  const naBadge = canBeNA && (
    <button
      type="button"
      onClick={onToggleNA}
      title="Marcar como não aplicável"
      className={`shrink-0 text-[10px] px-2 py-1 rounded transition-all ${
        isNA
          ? 'bg-amber-900/40 text-amber-400 border border-amber-700'
          : 'bg-dark-700 text-slate-500 border border-white/[0.08] hover:bg-dark-600'
      }`}
    >
      N/A
    </button>
  )

  /* list / list_multi */
  if ((attr.value_type === 'list' || attr.value_type === 'list_multi') &&
       attr.allowed_values.length > 0) {
    return (
      <div className="flex gap-2">
        <select
          value={isNA ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isNA}
          className={selectCls + borderCls + ' flex-1' + (isNA ? ' opacity-40 cursor-not-allowed' : '')}
        >
          <option value="">— Selecione —</option>
          {attr.allowed_values.map((v) => (
            <option key={v.id} value={v.name}>{v.name}</option>
          ))}
        </select>
        {naBadge}
      </div>
    )
  }

  /* boolean */
  if (attr.value_type === 'boolean') {
    return (
      <div className="flex gap-2">
        {(['Sim', 'Não'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => !isNA && onChange(opt)}
            disabled={isNA}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              !isNA && value === opt
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
            } ${isNA ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {opt}
          </button>
        ))}
        {naBadge}
      </div>
    )
  }

  /* number */
  if (attr.value_type === 'number') {
    return (
      <div className="flex gap-2">
        <input
          type="number"
          value={isNA ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isNA}
          placeholder={isNA ? 'N/A' : (attr.hint ?? '')}
          className={inputCls + borderCls + ' flex-1' + (isNA ? ' opacity-40 cursor-not-allowed' : '')}
        />
        {naBadge}
      </div>
    )
  }

  /* text / string (default) */
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={isNA ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isNA}
        maxLength={attr.value_max_length}
        placeholder={isNA ? 'N/A' : (attr.hint ?? `Informe ${attr.name}`)}
        className={inputCls + borderCls + ' flex-1' + (isNA ? ' opacity-40 cursor-not-allowed' : '')}
      />
      {naBadge}
    </div>
  )
}

/* ── Identifier block ────────────────────────────────────────────────────── */

function IdentifierBlock({
  identifiers, values, onChange,
}: {
  identifiers: MlIdentifierField[]
  values:      Record<string, string>
  onChange:    (id: string, value: string) => void
}) {
  if (identifiers.length === 0) return null

  return (
    <div className="bg-dark-800 border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificadores do Produto</p>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {identifiers.map((idf) => {
          const val     = values[idf.attribute_id] ?? idf.value
          const isGtin  = ['GTIN', 'EAN', 'UPC', 'ISBN'].includes(idf.type)
          const invalid = isGtin && val && !/^\d{8,14}$/.test(val)
          return (
            <div key={idf.attribute_id}>
              <label className="flex items-center gap-1.5 text-xs mb-1.5 font-medium text-slate-500">
                {idf.name}
                {idf.is_required && (
                  <span className="text-[9px] font-bold bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">*</span>
                )}
              </label>
              <input
                type="text"
                value={val}
                onChange={(e) => onChange(idf.attribute_id, e.target.value)}
                placeholder={isGtin ? '7891000000000' : idf.name}
                maxLength={isGtin ? 14 : undefined}
                className={inputCls + (invalid ? ' border-red-500/50' : '')}
              />
              {invalid && (
                <p className="text-[10px] text-red-400 mt-1">{idf.validation_message}</p>
              )}
              {!idf.is_required && (
                <p className="text-[10px] text-slate-600 mt-1">Opcional — melhora indexação</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Collapsible section ─────────────────────────────────────────────────── */

function CollapsibleSection({
  section, values, naValues, onChange, onNAToggle, suggestions, onApplySuggestion,
}: {
  section:           MlAttributeUiSection
  values:            Record<string, string>
  naValues:          Set<string>
  onChange:          (id: string, v: string) => void
  onNAToggle:        (id: string) => void
  suggestions:       MlAttributeSuggestion[]
  onApplySuggestion: (id: string, v: string) => void
}) {
  const [collapsed, setCollapsed] = useState(section.is_collapsed_by_default)

  const suggMap: Record<string, MlAttributeSuggestion> = {}
  for (const s of suggestions) { suggMap[s.attribute_id] = s }

  const headerColor =
    section.id === 'required'
      ? section.pending_count > 0
        ? 'text-red-400'
        : 'text-green-400'
      : 'text-slate-400'

  return (
    <div className="bg-dark-800 border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            : <ChevronDown  className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          <p className={`text-[10px] font-bold uppercase tracking-widest ${headerColor}`}>
            {section.label}
          </p>
          <p className="text-[10px] text-slate-600">{section.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {section.pending_count > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-bold bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded border border-red-800">
              <AlertCircle className="w-2.5 h-2.5" />
              {section.pending_count} pendente{section.pending_count !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[10px] text-slate-600">{section.attributes.length}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {section.attributes.map((attr) => {
            const val     = values[attr.id] ?? attr.current_value ?? ''
            const isNA    = naValues.has(attr.id)
            const changed = val !== (attr.current_value ?? '')
            const sugg    = suggMap[attr.id]
            return (
              <div key={attr.id}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className={`text-xs font-medium ${changed ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {attr.name}
                    {attr.is_required && (
                      <span className="ml-1 text-[9px] font-bold bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">*</span>
                    )}
                  </label>
                  {changed && (
                    <span className="ml-auto text-[9px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded">alterado</span>
                  )}
                </div>

                {/* AI suggestion banner */}
                {sugg && !val && !isNA && (
                  <div className="flex items-center gap-2 mb-1.5 px-2.5 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                    <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                    <span className="text-[10px] text-violet-300 flex-1 truncate">
                      IA: <strong>{sugg.suggested_value}</strong>
                      <span className="text-slate-500 ml-1">({Math.round(sugg.confidence * 100)}%)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(attr.id, sugg.suggested_value)}
                      className="text-[9px] text-violet-400 border border-violet-500/40 rounded px-1.5 py-0.5 hover:bg-violet-500/20 transition-colors shrink-0"
                    >
                      Usar
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(attr.id, '__dismiss__')}
                      className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <AttrField
                  attr={attr}
                  value={val}
                  isNA={isNA}
                  changed={changed}
                  onChange={(v) => onChange(attr.id, v)}
                  onToggleNA={() => onNAToggle(attr.id)}
                />
                {attr.hint && (
                  <p className="text-[10px] text-slate-600 mt-1">{attr.hint}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────────────────── */

export default function AttributeSection({
  sections, identifiers, variationFields: _variationFields,
  values, onChange, onNAToggle, naValues,
  categoryName: _categoryName, productTitle: _productTitle,
  onAISuggest, canUseAI,
}: AttributeSectionProps) {
  const [aiLoading,    setAiLoading]    = useState(false)
  const [suggestions,  setSuggestions]  = useState<MlAttributeSuggestion[]>([])
  const [showRequired, setShowRequired] = useState(false)

  const totalPending = sections.reduce((s, sec) => s + sec.pending_count, 0)

  const handleAI = useCallback(async () => {
    if (!canUseAI || !onAISuggest) return
    setAiLoading(true)
    try {
      onAISuggest()
    } finally {
      setAiLoading(false)
    }
  }, [canUseAI, onAISuggest])

  function applySuggestion(id: string, value: string) {
    if (value === '__dismiss__') {
      setSuggestions((prev) => prev.filter((s) => s.attribute_id !== id))
      return
    }
    onChange(id, value)
    setSuggestions((prev) => prev.filter((s) => s.attribute_id !== id))
  }

  const filteredSections = showRequired
    ? sections.filter((s) => s.id === 'required' || s.id === 'conditional')
    : sections

  return (
    <div className="space-y-3">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {totalPending > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-900/20 border border-red-800 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {totalPending} obrigatório{totalPending !== 1 ? 's' : ''} pendente{totalPending !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRequired((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg border border-white/[0.06] hover:bg-white/[0.04]"
          >
            {showRequired ? 'Mostrar todos' : 'Apenas obrigatórios'}
          </button>
          {canUseAI && (
            <button
              type="button"
              onClick={() => void handleAI()}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {aiLoading
                ? <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> Analisando...</>
                : <><Sparkles className="w-3 h-3" /> Sugerir com IA</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Identifiers ──────────────────────────────────────────────────── */}
      <IdentifierBlock
        identifiers={identifiers}
        values={values}
        onChange={onChange}
      />

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      {filteredSections.map((sec) => (
        <CollapsibleSection
          key={sec.id}
          section={sec}
          values={values}
          naValues={naValues}
          onChange={onChange}
          onNAToggle={onNAToggle}
          suggestions={suggestions.filter((s) =>
            sec.attributes.some((a) => a.id === s.attribute_id),
          )}
          onApplySuggestion={applySuggestion}
        />
      ))}

      {sections.length === 0 && (
        <p className="text-xs text-slate-600 py-4 text-center">
          Nenhum atributo disponível para esta categoria.
        </p>
      )}
    </div>
  )
}
