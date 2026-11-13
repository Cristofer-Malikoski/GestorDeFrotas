import type { DocumentKind, EntryStatus, FuelType, IssueCode, TripStatus } from './types'

export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  diesel_s10: 'Diesel S10',
  diesel_s500: 'Diesel S500',
  arla32: 'Arla 32',
}

export const ENTRY_STATUS_LABEL: Record<EntryStatus, string> = {
  registrado: 'Registrado',
  pendente: 'Pendente de conferência',
  aprovado: 'Aprovado',
  devolvido: 'Devolvido para correção',
}

export const ENTRY_STATUS_SHORT: Record<EntryStatus, string> = {
  registrado: 'Registrado',
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  devolvido: 'Devolvido',
}

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
}

export const ISSUE_LABEL: Record<IssueCode, string> = {
  sem_comprovante: 'Sem comprovante',
  km_ausente: 'Km não informado',
  km_inconsistente: 'Km inconsistente',
  possivel_duplicado: 'Possível duplicidade',
  leitura_incerta: 'Leitura incerta',
  preco_atipico: 'Preço fora do padrão',
}

/** Ordem de gravidade na fila de conferência (menor = mais grave) */
export const ISSUE_SEVERITY: Record<IssueCode, number> = {
  possivel_duplicado: 0,
  leitura_incerta: 1,
  km_inconsistente: 2,
  preco_atipico: 3,
  sem_comprovante: 4,
  km_ausente: 5,
}

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  cupom_combustivel: 'Cupom de combustível',
  recibo: 'Recibo',
  nota_servico: 'Nota de serviço',
}
