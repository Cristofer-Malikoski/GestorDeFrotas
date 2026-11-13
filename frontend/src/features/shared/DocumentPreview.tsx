import { FileText } from 'lucide-react'
import type { DocumentFile } from '@/domain/types'
import { DOCUMENT_KIND_LABEL } from '@/domain/labels'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Pré-visualização de documento.
 * Na demonstração, desenha um comprovante SINTÉTICO a partir dos dados de exemplo
 * (não é uma imagem real). Com a API, exibirá o arquivo em `previewUrl`.
 */
export function DocumentPreview({ doc, className, localImageUrl }: { doc: DocumentFile; className?: string; localImageUrl?: string }) {
  if (doc.previewUrl || localImageUrl) {
    return (
      <figure className={cn('overflow-hidden rounded-lg border border-line bg-sunken', className)}>
        <img src={localImageUrl ?? doc.previewUrl} alt={`${DOCUMENT_KIND_LABEL[doc.kind]} — ${doc.fileName}`} className="max-h-96 w-full object-contain" />
        {localImageUrl && (
          <figcaption className="px-3 py-2 text-xs text-ink-3">Sua imagem fica apenas no seu navegador nesta demonstração.</figcaption>
        )}
      </figure>
    )
  }
  const s = doc.synthetic
  return (
    <figure className={cn('rounded-lg border border-line bg-sunken p-4', className)}>
      <div
        className="mx-auto max-w-[280px] rotate-[-0.6deg] bg-white px-5 py-4 font-mono text-[12.5px] leading-relaxed text-ink shadow-[var(--shadow-card)]"
        aria-label={`Comprovante sintético: ${s?.issuer ?? doc.fileName}`}
      >
        <p className="text-center font-bold uppercase">{s?.issuer ?? 'Documento'}</p>
        <p className="text-center text-[11px] text-ink-3">{DOCUMENT_KIND_LABEL[doc.kind]}</p>
        <hr className="my-2 border-dashed border-line-strong" />
        {s?.lines.map((l) => (
          <p key={l.label} className="flex justify-between gap-3">
            <span>{l.label}</span>
            <span className="text-right">{l.value}</span>
          </p>
        ))}
        <hr className="my-2 border-dashed border-line-strong" />
        <p className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>{s?.total}</span>
        </p>
        <p className="mt-1 text-[11px] text-ink-3">{s ? formatDateTime(s.date) : formatDateTime(doc.uploadedAt)}</p>
      </div>
      <figcaption className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
        <FileText className="size-3.5" aria-hidden />
        Comprovante sintético de demonstração — {doc.fileName}
      </figcaption>
    </figure>
  )
}
