import { Link } from 'react-router'
import { ArrowRight, Fuel, MapPin, Receipt, Route } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Callout } from '@/components/ui/callout'
import { Button } from '@/components/ui/button'
import { EmptyState, QueryState } from '@/components/ui/feedback'
import { formatDate, formatKm } from '@/lib/format'
import { useDriverData } from './useDriverData'
import { EntryRow } from './EntryRow'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function DriverHome() {
  const d = useDriverData()
  const returned = d.entries.filter((e) => e.status === 'devolvido')
  const recent = d.entries.slice(0, 5)
  const firstName = d.session?.name.split(' ')[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[28px] leading-tight font-extrabold">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-ink-3">O que aconteceu na estrada? Registre em poucos toques.</p>
      </div>

      {returned.length > 0 && (
        <Callout
          tone="bad"
          title={returned.length === 1 ? 'O gestor pediu uma correção' : `O gestor pediu ${returned.length} correções`}
          action={
            <Button asChild variant="dark" size="sm">
              <Link to={`/motorista/lancamentos?corrigir=${returned[0].id}`}>Corrigir</Link>
            </Button>
          }
        >
          {returned[0].returnReason}
        </Callout>
      )}

      <section aria-labelledby="acoes" className="grid gap-3 sm:grid-cols-3">
        <h2 id="acoes" className="sr-only">
          Ações principais
        </h2>
        <ActionCard to="/motorista/abastecer" icon={<Fuel />} title="Registrar abastecimento" hint="Litros, valor e km" primary />
        <ActionCard to="/motorista/despesa" icon={<Receipt />} title="Registrar despesa" hint="Pedágio, oficina, pernoite…" />
        <ActionCard
          to="/motorista/viagem"
          icon={<Route />}
          title={d.activeTrip ? 'Atualizar viagem' : 'Nova viagem'}
          hint={d.activeTrip ? 'Km ou encerrar' : 'Origem e destino'}
        />
      </section>

      <QueryState query={d} rows={2}>
        {d.vehicle && (
          <Card className="overflow-hidden">
            <div className="grid sm:grid-cols-2">
              <div className="border-b border-line p-5 sm:border-r sm:border-b-0">
                <p className="text-sm text-ink-3">Seu caminhão</p>
                <p className="mt-1 font-display text-2xl font-extrabold">{d.vehicle.plate}</p>
                <p className="text-ink-2">
                  {d.vehicle.model} · {d.vehicle.year}
                </p>
                <p className="num mt-2 text-sm text-ink-3">Hodômetro: {formatKm(d.vehicle.odometerKm)}</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-ink-3">Viagem atual</p>
                {d.activeTrip ? (
                  <>
                    <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold">
                      <MapPin className="size-4 text-go-700" aria-hidden />
                      {d.activeTrip.origin} → {d.activeTrip.destination}
                    </p>
                    <p className="num text-sm text-ink-2">
                      Saída em {formatDate(d.activeTrip.startDate)} · {formatKm((d.activeTrip.lastKm ?? d.activeTrip.startKm) - d.activeTrip.startKm)} rodados
                    </p>
                    <Link to="/motorista/viagem" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-info-700 underline underline-offset-4">
                      Atualizar km ou encerrar
                    </Link>
                  </>
                ) : (
                  <p className="mt-1 text-ink-2">Nenhuma viagem em andamento.</p>
                )}
              </div>
            </div>
          </Card>
        )}

        <section aria-labelledby="ultimos">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="ultimos" className="font-display text-lg font-bold">
              Seus últimos lançamentos
            </h2>
            <Link to="/motorista/lancamentos" className="text-sm font-semibold text-info-700 underline underline-offset-4">
              Ver todos
            </Link>
          </div>
          <Card>
            {recent.length ? (
              <ul className="divide-y divide-line">
                {recent.map((e) => (
                  <EntryRow key={e.id} entry={e} categories={d.categories} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nada registrado ainda">Quando você registrar um abastecimento ou uma despesa, ele aparece aqui com o estado da conferência.</EmptyState>
            )}
          </Card>
        </section>
      </QueryState>
    </div>
  )
}

function ActionCard({ to, icon, title, hint, primary }: { to: string; icon: ReactNode; title: string; hint: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={
        primary
          ? 'group flex min-h-28 flex-col justify-between rounded-xl bg-go-400 p-4 text-navy-900 transition-colors hover:bg-go-500'
          : 'group flex min-h-28 flex-col justify-between rounded-xl bg-navy-900 p-4 text-white transition-colors hover:bg-navy-700'
      }
    >
      <span className={primary ? '[&_svg]:size-7' : 'text-go-400 [&_svg]:size-7'} aria-hidden>
        {icon}
      </span>
      <span>
        <span className="flex items-center justify-between gap-2 font-display text-lg leading-tight font-bold">
          {title}
          <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
        <span className={primary ? 'text-sm text-navy-800' : 'text-sm text-navy-200'}>{hint}</span>
      </span>
    </Link>
  )
}
