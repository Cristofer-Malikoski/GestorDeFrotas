import { useState } from 'react'
import { toast } from 'sonner'
import { Paperclip, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field, Input, Select } from '@/components/ui/field'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCategories, useCreateCategory, useExpenses, useVehicles } from '@/data/queries'
import { GROUP_LABEL } from '@/domain/reports'
import { countsInTotals } from '@/domain/rules'
import type { CategoryGroup } from '@/domain/types'
import { formatDateTime, formatMoney, formatMonth } from '@/lib/format'
import { CategoryIcon } from '@/features/shared/categoryIcons'
import { ExpenseForm } from '@/features/shared/ExpenseForm'
import { StatusBadge } from '@/features/shared/status'
import { MonthFilter, VehicleFilter, useManagerFilters } from './filters'

export function ExpensesPage() {
  const { vehicleId, month } = useManagerFilters()
  const expenses = useExpenses()
  const categories = useCategories()
  const vehicles = useVehicles()
  const [category, setCategory] = useState('')
  const [creating, setCreating] = useState(false)
  const plate = (id: string) => vehicles.data?.find((v) => v.id === id)?.plate ?? '—'
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? id

  const inPeriod = (expenses.data ?? []).filter((e) => (!vehicleId || e.vehicleId === vehicleId) && e.date.startsWith(month))
  const list = inPeriod.filter((e) => !category || e.categoryId === category)
  const total = list.filter(countsInTotals).reduce((s, e) => s + e.value, 0)
  const byCat = new Map<string, number>()
  for (const e of inPeriod.filter(countsInTotals)) byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.value)

  return (
    <div>
      <PageHeader
        title="Despesas"
        description={`${formatMonth(month)} · ${formatMoney(total)} em ${list.length} lançamentos${category ? ` de ${catName(category)}` : ''}`}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus /> Registrar despesa
          </Button>
        }
        filters={
          <>
            <VehicleFilter />
            <MonthFilter />
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-ink-3">Categoria</span>
              <Select className="h-10 min-w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Todas as categorias</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          </>
        }
      />
      <Tabs defaultValue="lancamentos">
        <TabsList className="mb-4">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="lancamentos">
          <Card>
            <QueryState query={expenses}>
              {list.length ? (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Data</Th>
                        <Th>Veículo</Th>
                        <Th>Categoria</Th>
                        <Th>Descrição</Th>
                        <Th>Lançado por</Th>
                        <Th numeric>Valor</Th>
                        <Th>Estado</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((e) => (
                        <Tr key={e.id}>
                          <Td className="num whitespace-nowrap">{formatDateTime(e.date)}</Td>
                          <Td className="font-medium">{plate(e.vehicleId)}</Td>
                          <Td>
                            <span className="inline-flex items-center gap-2">
                              <CategoryIcon id={e.categoryId} className="size-4 text-slate" />
                              {catName(e.categoryId)}
                            </span>
                          </Td>
                          <Td className="max-w-64">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="truncate">{e.description ?? '—'}</span>
                              {e.documentId && <Paperclip className="size-3.5 shrink-0 text-slate" aria-label="com comprovante" />}
                            </span>
                          </Td>
                          <Td>{e.createdBy === 'motorista' ? 'Motorista' : 'Gestor'}</Td>
                          <Td numeric className="font-semibold">{formatMoney(e.value)}</Td>
                          <Td>
                            <StatusBadge status={e.status} short />
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              ) : (
                <EmptyState title="Nenhuma despesa com esses filtros">Mude o mês, o veículo ou a categoria.</EmptyState>
              )}
            </QueryState>
          </Card>
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriesPanel totals={byCat} month={month} />
        </TabsContent>
      </Tabs>
      <Sheet open={creating} onOpenChange={setCreating} title="Registrar despesa" description="Inclui custos fixos como seguro, parcela e impostos.">
        <ExpenseForm actor="gestor" onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Sheet>
    </div>
  )
}

const GROUPS: CategoryGroup[] = ['viagem', 'manutencao', 'pessoal', 'fixo', 'impostos', 'outros']

function CategoriesPanel({ totals, month }: { totals: Map<string, number>; month: string }) {
  const categories = useCategories()
  const create = useCreateCategory()
  const [name, setName] = useState('')
  const [group, setGroup] = useState<CategoryGroup>('outros')
  const [driverCanUse, setDriverCanUse] = useState(false)
  const [error, setError] = useState<string>()

  async function add() {
    if (name.trim().length < 2) return setError('Dê um nome à categoria.')
    setError(undefined)
    try {
      await create.mutateAsync({ name: name.trim(), group, driverCanUse, needsDescription: false })
      toast.success(`Categoria "${name.trim()}" criada.`)
      setName('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Categoria</Th>
                <Th>Grupo no fechamento</Th>
                <Th>Motorista pode lançar</Th>
                <Th numeric>Total em {formatMonth(month)}</Th>
              </tr>
            </thead>
            <tbody>
              {categories.data?.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <CategoryIcon id={c.id} className="size-4 text-slate" />
                      {c.name}
                    </span>
                  </Td>
                  <Td>{GROUP_LABEL[c.group]}</Td>
                  <Td>{c.driverCanUse ? <Badge tone="ok">Sim</Badge> : <Badge>Só gestor</Badge>}</Td>
                  <Td numeric>{totals.get(c.id) ? formatMoney(totals.get(c.id)!) : '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
      <Card className="h-fit space-y-4 p-5">
        <h2 className="font-display font-bold">Nova categoria</h2>
        <Field label="Nome" error={error}>
          {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Balança, Chapa" />}
        </Field>
        <Field label="Grupo no fechamento mensal">
          {(p) => (
            <Select {...p} value={group} onChange={(e) => setGroup(e.target.value as CategoryGroup)}>
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {GROUP_LABEL[g]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <label className="flex items-center gap-2.5 text-[15px]">
          <input type="checkbox" checked={driverCanUse} onChange={(e) => setDriverCanUse(e.target.checked)} className="size-5 accent-navy-900" />
          Motorista pode lançar esta despesa
        </label>
        <Button variant="dark" onClick={add} loading={create.isPending}>
          <Plus /> Criar categoria
        </Button>
      </Card>
    </div>
  )
}
