import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { isDemo } from '@/config'
import { useRepository } from '@/data/RepositoryProvider'
import { cn } from '@/lib/cn'

/** Faixa permanente informando que é uma demonstração — nada aqui é processado de verdade. */
export function DemoBanner({ className, dark }: { className?: string; dark?: boolean }) {
  const repo = useRepository()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  if (!isDemo || repo.kind !== 'mock') return null
  async function reset() {
    setBusy(true)
    await repo.reset?.()
    await qc.invalidateQueries()
    setBusy(false)
    toast.success('Dados de demonstração restaurados.')
  }
  return (
    <div
      className={cn(
        'no-print flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-[13px]',
        dark ? 'bg-navy-950 text-navy-200' : 'bg-amber-100 text-navy-900',
        className,
      )}
    >
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">Demonstração.</strong> Dados sintéticos; leitura de documentos simulada; o que
        você registrar fica só nesta aba do navegador.
      </p>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 disabled:opacity-60"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Restaurar dados
      </button>
    </div>
  )
}
