import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { useDocuments, useExpenses, useFuel, useVehicles } from '@/data/queries'
import { DOCUMENT_KIND_LABEL } from '@/domain/labels'
import type { DocumentFile } from '@/domain/types'
import { formatDateTime, formatMoney, formatMonth } from '@/lib/format'
import { DocumentPreview } from '@/features/shared/DocumentPreview'
import { StatusBadge } from '@/features/shared/status'
import { MonthFilter, VehicleFilter, useManagerFilters } from './filters'

export function DocumentsPage() {
  const { vehicleId, month } = useManagerFilters()
  const docs = useDocuments()
  const fuel = useFuel()
  const expenses = useExpenses()
  const vehicles = useVehicles()
  const [open, setOpen] = useState<DocumentFile>()
  const plate = (id: string) => vehicles.data?.find((v) => v.id === id)?.plate ?? '—'
  const entries = [...(fuel.data ?? []), ...(expenses.data ?? [])]
  const entryOf = (d: DocumentFile) => entries.find((e) => e.id === d.entryId)

  const list = (docs.data ?? []).filter((d) => (!vehicleId || d.vehicleId === vehicleId) && d.uploadedAt.startsWith(month))
  const linked = open ? entryOf(open) : undefined

  return (
    <div>
      <PageHeader
        title="Documentos"
        description={`${list.length} comprovantes anexados em ${formatMonth(month)}`}
        filters={
          <>
            <VehicleFilter />
            <MonthFilter />
          </>
        }
      />
      <Card>
        <QueryState query={docs}>
          {list.length ? (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Enviado em</Th>
                    <Th>Tipo</Th>
                    <Th>Veículo</Th>
                    <Th>Lançamento</Th>
                    <Th>Leitura</Th>
                    <Th>
                      <span className="sr-only">Ações</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => {
                    const e = entryOf(d)
                    return (
                      <Tr key={d.id}>
                        <Td className="num whitespace-nowrap">{formatDateTime(d.uploadedAt)}</Td>
                        <Td>{DOCUMENT_KIND_LABEL[d.kind]}</Td>
                        <Td className="font-medium">{plate(d.vehicleId)}</Td>
                        <Td>
                          {e ? (
                            <span className="inline-flex items-center gap-2">
                              {formatMoney(e.kind === 'abastecimento' ? e.total : e.value)}
                              <StatusBadge status={e.status} short />
                            </span>
                          ) : (
                            <Badge>Não vinculado</Badge>
                          )}
                        </Td>
                        <Td>
                          {d.extraction ? (
                            <Badge tone={d.extraction.fields.some((f) => f.confidence === 'baixa') ? 'warn' : 'info'}>
                              Simulada{d.extraction.fields.some((f) => f.confidence === 'baixa') ? ' · incerta' : ''}
                            </Badge>
                          ) : (
                            <span className="text-ink-3">Sem leitura</span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setOpen(d)}>
                            Ver documento
                          </Button>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState title="Nenhum documento neste período">Comprovantes anexados aos lançamentos aparecem aqui.</EmptyState>
          )}
        </QueryState>
      </Card>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(undefined)} title={open ? DOCUMENT_KIND_LABEL[open.kind] : ''} description={open ? `${plate(open.vehicleId)} · ${formatDateTime(open.uploadedAt)}` : undefined}>
        {open && (
          <div className="space-y-4">
            <DocumentPreview doc={open} />
            {linked && (
              <p className="text-sm text-ink-2">
                Vinculado a {linked.kind === 'abastecimento' ? `abastecimento em ${linked.station}` : 'despesa'} de{' '}
                <strong className="num">{formatMoney(linked.kind === 'abastecimento' ? linked.total : linked.value)}</strong>.
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
