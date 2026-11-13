import {
  Droplets,
  Ellipsis,
  FileBadge,
  Landmark,
  Disc3,
  Receipt,
  Satellite,
  ShieldCheck,
  SquareParking,
  Ticket,
  Users,
  Utensils,
  Wrench,
  Tag,
} from 'lucide-react'

const ICONS: Record<string, typeof Ticket> = {
  pedagio: Ticket,
  estacionamento: SquareParking,
  alimentacao: Utensils,
  oficina: Wrench,
  pneus: Disc3,
  lavagem: Droplets,
  salario: Users,
  parcela: Landmark,
  seguro: ShieldCheck,
  rastreador: Satellite,
  impostos_faturamento: Receipt,
  ipva: FileBadge,
  outros: Ellipsis,
}

export function CategoryIcon({ id, className = 'size-5' }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Tag
  return <Icon className={className} aria-hidden />
}
