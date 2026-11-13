import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, BarChart3, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { Photo } from '@/components/brand/Photo'
import { useSession } from '@/auth/session'
import { DEMO_USERS } from '@/data/mock/fixtures'
import type { Role } from '@/domain/types'
import { cn } from '@/lib/cn'

export function LoginPage() {
  const { signIn } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const suggested = params.get('perfil') as Role | null

  function enter(role: Role) {
    signIn(role)
    navigate(role === 'motorista' ? '/motorista' : '/gestor')
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" aria-label="Fretuno — página inicial" className="self-start">
          <Logo className="h-8" />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-3xl font-extrabold">Como você quer entrar?</h1>
          <p className="mt-2 text-ink-2">
            Escolha um perfil para explorar. Cada um vê só o que precisa — o motorista não vê valores de frete nem resultado.
          </p>
          <div className="mt-8 space-y-3">
            <ProfileButton
              highlighted={suggested === 'gestor'}
              icon={<BarChart3 />}
              title="Gestor"
              who={DEMO_USERS.gestor.name}
              detail="Painel, conferência de lançamentos, viagens, fretes e fechamento do mês."
              onClick={() => enter('gestor')}
            />
            <ProfileButton
              highlighted={suggested === 'motorista'}
              icon={<Truck />}
              title="Motorista"
              who={`${DEMO_USERS.motorista.name} · caminhão DMO1A23`}
              detail="Registrar abastecimento, despesa e viagem; acompanhar os próprios lançamentos."
              onClick={() => enter('motorista')}
            />
          </div>
          <p className="mt-8 rounded-lg bg-canvas px-4 py-3 text-sm text-ink-3">
            <strong className="font-semibold text-ink-2">Entrada demonstrativa, sem senha.</strong> O login real (com usuário e
            permissões por perfil) depende do servidor, ainda em desenvolvimento.
          </p>
        </div>
      </main>
      <div className="relative hidden lg:block">
        <Photo
          name="estrada-montanha"
          widths={[960, 1600]}
          sizes="55vw"
          alt="Caminhão azul em estrada de montanha"
          className="absolute inset-0"
          position="55% 50%"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(10_20_29/0.85),transparent)] p-10 text-white">
          <p className="font-display text-3xl font-extrabold">Sua operação em ordem.</p>
          <p className="font-display text-3xl font-extrabold text-go-400">Sua frota em movimento.</p>
        </div>
      </div>
    </div>
  )
}

function ProfileButton({
  icon,
  title,
  who,
  detail,
  onClick,
  highlighted,
}: {
  icon: ReactNode
  title: string
  who: string
  detail: string
  onClick: () => void
  highlighted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-4 rounded-xl border bg-surface p-4 text-left transition-colors hover:border-navy-900 hover:bg-navy-50',
        highlighted ? 'border-navy-900 ring-1 ring-navy-900' : 'border-line-strong',
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-go-400 [&_svg]:size-6" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold">Entrar como {title.toLowerCase()}</span>
        <span className="block text-sm font-medium text-ink-2">{who}</span>
        <span className="mt-0.5 block text-sm text-ink-3">{detail}</span>
      </span>
      <ArrowRight className="size-5 shrink-0 text-slate transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  )
}
