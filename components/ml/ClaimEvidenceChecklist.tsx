'use client'

const EVIDENCE_BY_REASON: Record<string, string[]> = {
  'PDD9939': [
    'Foto do produto que foi enviado',
    'Foto da embalagem com etiqueta de envio',
    'Nota fiscal com descrição do produto',
    'Screenshot do anúncio no ML',
  ],
  'PDD1182': [
    'Foto do defeito',
    'Vídeo demonstrando o problema (link externo)',
    'Nota fiscal',
    'Laudo técnico (se disponível)',
  ],
  'PDD1183': [
    'Foto da embalagem avariada',
    'Foto do produto avariado',
    'Comprovante de postagem',
    'Nota fiscal',
  ],
  'PDD1181': [
    'Foto do produto/embalagem recebida',
    'Nota fiscal com itens listados',
    'Screenshot do anúncio com conteúdo descrito',
  ],
  'PNR1169': [
    'Comprovante de postagem',
    'Código de rastreamento',
    'Screenshot do status de entrega',
  ],
  'PNR1170': [
    'Comprovante de postagem com endereço',
    'Screenshot do rastreamento com endereço de entrega',
  ],
  'DEFAULT': [
    'Nota fiscal',
    'Comprovante de envio',
    'Foto do produto',
  ],
}

interface Props {
  reasonId:     string
  checkedItems: string[]
  onToggle:     (item: string) => void
}

export function ClaimEvidenceChecklist({ reasonId, checkedItems, onToggle }: Props) {
  const items = EVIDENCE_BY_REASON[reasonId] ?? EVIDENCE_BY_REASON['DEFAULT']

  return (
    <div className="space-y-2">
      {items.map(item => {
        const checked = checkedItems.includes(item)
        return (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className="w-full flex items-center gap-2.5 text-left group"
          >
            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
              checked
                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'border-slate-700 text-transparent group-hover:border-slate-500'
            }`}>
              {checked && (
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className={`text-xs transition-colors ${
              checked ? 'text-green-400 line-through opacity-60' : 'text-slate-400 group-hover:text-slate-200'
            }`}>
              {item}
            </span>
          </button>
        )
      })}
    </div>
  )
}
