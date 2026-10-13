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
  aba: 'bateria' | 'testes'
  selecionado: string | null
  soFalhas: boolean
  rolagem: number
  soProblemas: boolean
  soBuracos: boolean
  raia: string | null
  rolagemTestes: number
  /** chave da linha sob o cursor na aba Testes: id de cenario ou de capacidade vazia */
  itemTestes: string | null
}

export type Classe = 'passa' | 'intermitente' | 'constante' | 'sem dado' | 'manual'

export type ItemRelatorio = {
  id: string
  titulo: string
  manual: boolean
  escrita: boolean
  rodadas: (Veredito | null)[]
  classe: Classe
  mudanca: 'regrediu' | 'melhorou' | null
  tools: string[]
  nos: string[]
  raias: string[]
}

export type CapacidadeRelatorio = {
  id: string
  titulo: string
  estado: string | null
  cenarios: ItemRelatorio[]
}

export type Relatorio = {
  bateria: string | null
  rodadas: number[]
  anterior: string | null
  raias: { id: string; rotulo: string }[]
  blocos: { nome: string; capacidades: CapacidadeRelatorio[] }[]
  buracos: {
    capacidades_sem_cenario: string[]
    total_capacidades: number
    nos_sem_cenario: { raia: string; rotulo: string; nos: { id: string; titulo: string }[] }[]
    total_nos: number
  }
  geradoEm: number
}

declare module 'claude-code' {
  interface PluginState {
    bancada: {
      bancada: Bancada | null
      visao: Visao
      agora: number
      relatorio: Relatorio | null
    }
  }
}
