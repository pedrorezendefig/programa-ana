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

/** O custo de uma conversa (issue #24): a Meta cobra cada resposta da Ana, a OpenAI os tokens. */
export type Custo = {
  modelo: string | null
  mensagens_ana: number
  openai_usd: number | null
  meta_brl: number | null
  chamadas?: number | null
}

export type CustoMedio = {
  openai_usd: number | null
  meta_brl: number | null
  mensagens_ana: number | null
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
  custo: Custo | null
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
  /** chave da linha sob o cursor na aba Testes: id de cenario, id de capacidade ou "bloco:<nome>" */
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
  /** % dos nos do Mapa do SOP que o cenario percorre */
  fatia_sop: number
  /** chama ferramenta da Global Health (derivado das tools, nunca escrito) */
  depende_gh: boolean
  custo: Custo | null
  /** mais respostas da Ana que o teto (cada uma e cobrada pela Meta) */
  alerta_mensagens: boolean
}

export type CapacidadeRelatorio = {
  id: string
  titulo: string
  estado: string | null
  /** o porque da capacidade, do comparativo do OS */
  faz: string
  falta: string
  tools_texto: string
  fatia_sop: number
  depende_gh: boolean
  /** true: todo cenario executavel passa; false: algum falha; null: sem cenario */
  funciona: boolean | null
  custo_medio: CustoMedio
  cenarios: ItemRelatorio[]
}

export type BlocoRelatorio = {
  nome: string
  resumo: string
  fatia_sop: number
  capacidades_total: number
  funcionam: number
  nao_funcionam: number
  sem_cenario: number
  dependem_gh: number
  custo_medio: CustoMedio
  capacidades: CapacidadeRelatorio[]
}

export type Precos = {
  conferido_em: string | null
  dias: number | null
  vencido: boolean
  meta_brl_por_mensagem: number | null
  cambio_brl_por_usd: number | null
}

export type OrigemBuraco = 'gh' | 'planejado' | 'manual' | 'escrever'

export type Relatorio = {
  bateria: string | null
  rodadas: number[]
  anterior: string | null
  precos: Precos | null
  custo_medio: CustoMedio & { medidos: number }
  teto_mensagens_ana: number
  raias: { id: string; rotulo: string }[]
  blocos: BlocoRelatorio[]
  buracos: {
    capacidades_sem_cenario: string[]
    total_capacidades: number
    /** a legenda: de onde vem cada buraco e de quem depende (derivado pelo relatorio.py) */
    origens: { chave: OrigemBuraco; rotulo: string; de_quem: string; descricao: string }[]
    por_origem: Record<OrigemBuraco, { capacidades: number; nos: number }>
    capacidades: { id: string; titulo: string; estado: string | null; origem: OrigemBuraco; porque: string; manuais: { id: string; titulo: string; passos: string }[] }[]
    /** cenarios que passam, mas so pelo desvio: a GH responde vazio e a Ana encaminha */
    desvio_gh: { id: string; capacidade: string; titulo: string; porque: string }[]
    nos_sem_cenario: { raia: string; rotulo: string; nos: { id: string; titulo: string; origem: OrigemBuraco }[] }[]
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
