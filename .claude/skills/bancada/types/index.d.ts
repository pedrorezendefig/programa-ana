export type Veredito = 'passou' | 'falhou' | 'erro'
export type Estado = 'espera' | 'rodando' | Veredito

export type Conferencia = {
  turno: number
  tipo: string
  esperado: unknown
  veio: unknown
  ok: boolean | null
}

export type Turno = {
  n: number
  paciente: string
  espere: string | null
  nos: string[]
  ana: string[] | null
  ferramentas: string[] | null
  conferencias: Conferencia[]
}

export type FimConversa = {
  etiquetas: string[]
  raia: string | null
  raia_pelo_trace: string[] | null
  status: string | null
  handoff: boolean | null
}

export type Cenario = {
  id: string
  titulo: string
  estado: Estado
  anterior: Veredito | null
  rodadas: (Veredito | null)[]
  inicio: string | null
  fim: string | null
  conversaId: number | null
  contato: string | null
  link: string | null
  turnosPrevistos: number
  turnos: Turno[]
  tools: string[] | null
  traceMotivo: string | null
  pior: number | null
  falhas: string[]
  fimConversa: FimConversa | null
}

export type Bancada = {
  origem: 'ao-vivo' | 'conversas'
  bateria: string | null
  rodada: number | null
  arquivo: string
  comecou: string
  terminou: string | null
  traceLigado: boolean
  pulados: { id: string; motivo: string }[]
  placar: { passou: number; total: number } | null
  cenarios: Cenario[]
}

export type Visao = {
  selecionado: string | null
  soFalhas: boolean
  rolagem: number
}

declare module 'claude-code' {
  interface PluginState {
    bancada: {
      bancada: Bancada | null
      visao: Visao
      agora: number
    }
  }
}
