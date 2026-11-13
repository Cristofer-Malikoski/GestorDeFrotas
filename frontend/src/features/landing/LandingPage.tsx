import { Link } from 'react-router'
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Copy,
  FileSpreadsheet,
  Fuel,
  Receipt,
  Route,
  Sigma,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Photo } from '@/components/brand/Photo'
import { Button } from '@/components/ui/button'

const BEFORE_AFTER: { icon: ReactNode; before: string; after: string }[] = [
  {
    icon: <Copy />,
    before: 'Redigitar placa, motorista, data e km em cada linha.',
    after: 'Veículo, viagem, data e último posto já vêm preenchidos.',
  },
  {
    icon: <FileSpreadsheet />,
    before: 'Copiar a aba do mês e consertar fórmulas quebradas.',
    after: 'O mês é um filtro. O fechamento se monta sozinho.',
  },
  {
    icon: <Sigma />,
    before: 'Somar despesas na mão para saber se o mês deu lucro.',
    after: 'Faturamento, despesas, resultado e custo por km na hora.',
  },
  {
    icon: <TriangleAlert />,
    before: 'Abastecimento lançado duas vezes passa despercebido.',
    after: 'O sistema avisa antes de salvar e o gestor confere.',
  },
  {
    icon: <Receipt />,
    before: 'Comprovante em papel separado da linha da planilha.',
    after: 'Comprovante anexado ao próprio lançamento.',
  },
]

export function LandingPage() {
  return (
    <div className="bg-surface text-ink">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* HERO */}
      <section className="on-dark relative isolate overflow-hidden bg-navy-950 text-white">
        <Photo
          name="hero-estrada-por-do-sol"
          widths={[960, 1600, 2560]}
          alt="Caminhão de carga em rodovia ao pôr do sol"
          priority
          position="68% 60%"
          className="absolute inset-0 -z-20"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_20_29/0.92)_0%,rgb(10_20_29/0.78)_38%,rgb(10_20_29/0.15)_75%,rgb(10_20_29/0)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-[linear-gradient(0deg,rgb(10_20_29/0.7),transparent)]" />

        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo variant="negative" className="h-8" />
          <nav aria-label="Seções" className="hidden items-center gap-7 text-[15px] text-white/85 md:flex">
            <a href="#planilha" className="hover:text-white">Da planilha ao Fretuno</a>
            <a href="#motorista" className="hover:text-white">Motorista</a>
            <a href="#gestor" className="hover:text-white">Gestor</a>
          </nav>
          <Button asChild variant="primary" size="md">
            <Link to="/entrar">Explorar demonstração</Link>
          </Button>
        </header>

        <div id="conteudo" className="mx-auto max-w-7xl px-5 pt-16 pb-24 sm:px-8 md:pt-24 md:pb-36">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-sm text-white/90">
            <span className="size-2 rounded-full bg-amber-400" aria-hidden /> Gestão de fretes e frotas para transportadores
          </p>
          <h1 className="mt-6 max-w-2xl font-display text-5xl leading-[1.04] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Mais estrada.
            <br />
            <span className="text-go-400">Menos papelada.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/90 sm:text-xl">
            Sua operação em ordem. Sua frota em movimento. O Fretuno troca a planilha de fretes, abastecimentos e despesas por
            lançamentos rápidos na estrada e um fechamento mensal que se monta sozinho.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to="/entrar?perfil=gestor">
                Ver como gestor <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              <Link to="/entrar?perfil=motorista">Ver como motorista</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-white/75">Demonstração com dados sintéticos. Não precisa de cadastro.</p>
        </div>
      </section>

      {/* PLANILHA → FRETUNO */}
      <section id="planilha" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <p className="text-sm font-semibold tracking-wider text-go-700 uppercase">Da planilha ao Fretuno</p>
            <h2 className="mt-3 font-display text-4xl leading-tight font-extrabold">
              A mesma conta de sempre. Sem o trabalho repetido.
            </h2>
            <p className="mt-5 text-lg text-ink-2">
              Fretes, abastecimentos, despesas, impostos, seguro e manutenção continuam lá — organizados por veículo e por mês,
              do jeito que quem toca caminhão já conhece. O que muda é quem faz a soma.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="hidden grid-cols-[48px_1fr_1fr] border-b border-line bg-canvas text-sm font-semibold text-ink-3 sm:grid">
              <span />
              <span className="px-4 py-3">Na planilha</span>
              <span className="border-l border-line px-4 py-3">No Fretuno</span>
            </div>
            <ul>
              {BEFORE_AFTER.map((row) => (
                <li key={row.before} className="grid grid-cols-[48px_1fr] border-b border-line last:border-0 sm:grid-cols-[48px_1fr_1fr]">
                  <span className="flex items-start justify-center pt-4 text-slate [&_svg]:size-5" aria-hidden>
                    {row.icon}
                  </span>
                  <p className="flex gap-2 px-4 py-4 text-ink-2">
                    <X className="mt-0.5 size-4 shrink-0 text-bad-600" aria-label="Antes:" />
                    {row.before}
                  </p>
                  <p className="col-start-2 flex gap-2 px-4 pb-4 font-medium sm:col-start-3 sm:border-l sm:border-line sm:py-4">
                    <Check className="mt-0.5 size-4 shrink-0 text-go-700" aria-label="Agora:" />
                    {row.after}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* MOTORISTA */}
      <section id="motorista" className="bg-canvas">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-semibold tracking-wider text-go-700 uppercase">Para o motorista</p>
            <h2 className="mt-3 font-display text-4xl leading-tight font-extrabold">Registrou, seguiu viagem.</h2>
            <p className="mt-5 text-lg text-ink-2">
              Três ações na tela inicial. O que o sistema já sabe vem preenchido; falta de comprovante ou de km não trava o
              lançamento — vira pendência para o gestor.
            </p>
            <ol className="mt-8 space-y-5">
              {[
                { icon: <Fuel />, t: 'Registrar abastecimento', d: 'Litros, valor e km. O posto e a viagem já estão lá. Ou use a foto do cupom e só confira.' },
                { icon: <Receipt />, t: 'Registrar despesa', d: 'Pedágio, pernoite, oficina: um toque na categoria e o valor.' },
                { icon: <Route />, t: 'Iniciar ou encerrar viagem', d: 'Origem e km de saída sugeridos pela última viagem.' },
              ].map((s) => (
                <li key={s.t} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-go-400 [&_svg]:size-5" aria-hidden>
                    {s.icon}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-bold">{s.t}</span>
                    <span className="text-ink-2">{s.d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="order-1 overflow-hidden rounded-2xl lg:order-2">
            <Photo
              name="motorista-cabine"
              widths={[960, 1600]}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt="Motorista na cabine do caminhão conferindo um documento"
              className="block aspect-[4/3]"
              position="60% 50%"
            />
          </div>
        </div>
      </section>

      {/* GESTOR */}
      <section id="gestor" className="on-dark bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid items-end gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold tracking-wider text-go-400 uppercase">Para o gestor</p>
              <h2 className="mt-3 font-display text-4xl leading-tight font-extrabold">O resultado do mês sem esperar o fim do mês.</h2>
            </div>
            <p className="text-lg text-navy-200">
              Veja faturamento, despesas e resultado por caminhão, confira o que ficou pendente e feche o mês com o mesmo
              relatório que você já usa — agora exportável e sem fórmula quebrada.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <ProductPreview />
            <div className="relative overflow-hidden rounded-2xl">
              <Photo
                name="patio-frota-aereo"
                widths={[960, 1600]}
                sizes="(min-width: 1024px) 40vw, 100vw"
                alt="Vista aérea de um pátio com carretas estacionadas lado a lado"
                className="block h-full min-h-72"
              />
            </div>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { icon: <ClipboardCheck />, t: 'Conferência com motivo', d: 'Duplicidade, leitura incerta, km fora do padrão: cada pendência diz o que olhar.' },
              { icon: <FileSpreadsheet />, t: 'Fechamento mensal', d: 'Entradas, saídas e resultado no formato da planilha. Exporta para Excel (CSV).' },
              { icon: <Route />, t: 'Comparação entre caminhões', d: 'Receita, custo por km e consumo lado a lado, no período que você escolher.' },
            ].map((f) => (
              <li key={f.t}>
                <span className="text-go-400 [&_svg]:size-6" aria-hidden>
                  {f.icon}
                </span>
                <p className="mt-3 font-display text-lg font-bold">{f.t}</p>
                <p className="mt-1 text-navy-200">{f.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ESTRADA BRASILEIRA */}
      <section className="relative isolate overflow-hidden">
        <Photo
          name="rodovia-rural-sp"
          widths={[960, 1600]}
          alt="Caminhão-tanque em rodovia cercada por plantações no interior de São Paulo"
          className="absolute inset-0 -z-10"
          position="30% 65%"
        />
        <div className="mx-auto flex max-w-7xl justify-end px-5 py-20 sm:px-8 md:py-28">
          <div className="max-w-md rounded-2xl bg-surface p-8 shadow-[var(--shadow-pop)]">
            <h2 className="font-display text-3xl leading-tight font-extrabold">Feito para a estrada brasileira.</h2>
            <ul className="mt-5 space-y-3 text-ink-2">
              {[
                'Reais, quilômetros e km/L no formato que você usa.',
                'Categorias da estrada: pedágio, pernoite, oficina, pneus.',
                'Impostos, seguro, parcela e salário no fechamento.',
                'Funciona no navegador do computador, sem instalar nada.',
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-go-700" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <Button asChild variant="dark" size="lg" className="mt-7 w-full">
              <Link to="/entrar">
                Explorar demonstração <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* TRANSPARÊNCIA */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 rounded-2xl border border-line bg-canvas p-8 md:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-2xl font-extrabold">O que esta demonstração é — e o que ainda não é</h2>
          <ul className="grid gap-3 text-ink-2 sm:grid-cols-2">
            <li><strong className="text-ink">Navegação e regras reais:</strong> pendências, duplicidade, cálculos e relatórios funcionam.</li>
            <li><strong className="text-ink">Dados sintéticos:</strong> placas, pessoas, clientes e valores são inventados.</li>
            <li><strong className="text-ink">Leitura de comprovante simulada:</strong> usamos um cupom de exemplo; nada é lido por IA.</li>
            <li><strong className="text-ink">Sem servidor:</strong> o que você registrar fica só nesta aba do navegador.</li>
          </ul>
        </div>
      </section>

      <footer className="on-dark bg-navy-950 text-navy-200">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <Logo variant="negative" className="h-7" />
              <p className="mt-2 text-sm">Mais estrada. Menos papelada.</p>
            </div>
            <Button asChild variant="primary">
              <Link to="/entrar">Explorar demonstração</Link>
            </Button>
          </div>
          <div className="mt-10 border-t border-navy-700 pt-6 text-[13px] leading-relaxed">
            <p>
              Fretuno é um nome provisório, pendente de validação de marca. Protótipo de demonstração.
            </p>
            <p className="mt-2">
              Fotos:{' '}
              <a className="underline hover:text-white" href="https://unsplash.com/@nataliila">Natalia Marcelewicz</a>,{' '}
              <a className="underline hover:text-white" href="https://unsplash.com/@marcinjozwiak">Marcin Jozwiak</a> e{' '}
              <a className="underline hover:text-white" href="https://unsplash.com/@juanmascan1978">Juan Pablo Mascanfroni</a> (Unsplash);{' '}
              <a className="underline hover:text-white" href="https://www.pexels.com/photo/19357316/">Raphael Brasileiro</a> e{' '}
              <a className="underline hover:text-white" href="https://www.pexels.com/photo/6720527/">Gustavo Fring</a> (Pexels).
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Composição com a própria interface (dados sintéticos) — comunica gestão melhor que foto genérica. */
function ProductPreview() {
  const bars = [62, 70, 66, 74, 58, 71, 34, 69, 77, 72, 75, 48]
  const costs = [55, 58, 57, 60, 52, 59, 61, 57, 61, 60, 62, 40]
  return (
    <div className="rounded-2xl bg-canvas p-5 text-ink shadow-[var(--shadow-pop)]" aria-label="Exemplo do painel do gestor com dados sintéticos" role="img">
      <div className="flex items-center justify-between">
        <p className="font-display font-bold">Resultado do mês</p>
        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs text-ink-3">dados sintéticos</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Faturamento', 'R$ 58.420'],
          ['Despesas', 'R$ 47.910'],
          ['Resultado', '+ R$ 10.510'],
          ['Custo por km', 'R$ 4,86'],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-surface p-3 shadow-[var(--shadow-card)]">
            <p className="text-xs text-ink-3">{l}</p>
            <p className={`font-kpi mt-1 text-lg font-extrabold ${l === 'Resultado' ? 'text-go-800' : ''}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]">
        <div className="flex h-32 items-end gap-1.5">
          {bars.map((b, i) => (
            <div key={i} className="flex flex-1 items-end gap-0.5">
              <div className="flex-1 rounded-t-sm bg-chart-revenue" style={{ height: `${b}%` }} />
              <div className="flex-1 rounded-t-sm bg-chart-cost" style={{ height: `${costs[i]}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-ink-3">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-revenue" />Faturamento</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-cost" />Despesas</span>
          <span className="ml-auto">jul: mês com prejuízo (despesa maior que faturamento)</span>
        </div>
      </div>
    </div>
  )
}
