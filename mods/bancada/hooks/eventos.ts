// Leitor dos eventos da bancada (ana/bancada/resultados/ao-vivo.jsonl) e da
// conversa gravada (ana/bancada/conversas/<id>.json). Puro: sem $, sem desenho.
import type { Bancada, Cenario, Conferencia, Custo, FimConversa, Turno, Veredito } from '../types'

type Evento = Record<string, unknown> & { evento: string; t: string }

const cenarioVazio = (id: string, titulo: string): Cenario => ({
  id,
  titulo,
  estado: 'espera',
  anterior: null,
  rodadas: [],
  inicio: null,
  fim: null,
  conversaId: null,
  contato: null,
  link: null,
  turnosPrevistos: 0,
  turnos: [],
  tools: null,
  traceMotivo: null,
  pior: null,
  falhas: [],
  fimConversa: null,
  custo: null,
})

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

/** Le o ao-vivo.jsonl inteiro. Linha quebrada (a ultima, ainda sendo escrita) e ignorada. */
export function lerEventos(texto: string): Bancada | null {
  let b: Bancada | null = null
  const por = new Map<string, Cenario>()
  for (const linha of texto.split('\n')) {
    if (!linha.trim()) continue
    let e: Evento
    try {
      e = JSON.parse(linha) as Evento
    } catch {
      continue
    }
    if (e.evento === 'bateria') {
      const anteriores = (e.rodadas_anteriores ?? {}) as Record<string, (Veredito | null)[]>
      const cenarios = (e.cenarios as { id: string; titulo: string }[]) ?? []
      b = {
        origem: 'ao-vivo',
        bateria: (e.bateria as string | null) ?? null,
        rodada: (e.rodada as number | null) ?? null,
        arquivo: str(e.arquivo),
        comecou: e.t,
        terminou: null,
        traceLigado: Boolean(e.trace_ligado),
        pulados: (e.pulados as { id: string; motivo: string }[]) ?? [],
        placar: null,
        cenarios: cenarios.map(c => ({
          ...cenarioVazio(c.id, c.titulo),
          rodadas: anteriores[c.id] ?? [],
        })),
      }
      por.clear()
      for (const c of b.cenarios) por.set(c.id, c)
      continue
    }
    if (!b) continue
    const id = str(e.id)
    const c = por.get(id)
    switch (e.evento) {
      case 'cenario':
        if (!c) break
        c.estado = 'rodando'
        c.inicio = e.t
        c.titulo = str(e.titulo) || c.titulo
        c.turnosPrevistos = Number(e.turnos ?? 0)
        c.anterior = (e.anterior as Veredito | null) ?? null
        break
      case 'conversa':
        if (!c) break
        c.conversaId = Number(e.conversa_id)
        c.contato = str(e.contato)
        c.link = str(e.link) || null
        break
      case 'paciente':
        if (!c) break
        c.turnos.push({
          n: Number(e.n),
          paciente: str(e.texto),
          espere: (e.espere as string | null) ?? null,
          nos: lista(e.nos),
          ana: null,
          ferramentas: null,
          conferencias: [],
        })
        break
      case 'ana': {
        const t = c?.turnos.find(x => x.n === Number(e.n))
        if (t) t.ana = lista(e.respostas)
        break
      }
      case 'trace':
        if (!c) break
        c.tools = Array.isArray(e.tools) ? lista(e.tools) : null
        c.traceMotivo = (e.motivo as string | null) ?? null
        c.pior = (e.pior as number | null) ?? null
        if (Array.isArray(e.por_turno)) {
          ;(e.por_turno as unknown[][]).forEach((ferr, i) => {
            const t = c.turnos[i]
            if (t) t.ferramentas = lista(ferr)
          })
        }
        break
      case 'custo':
        if (!c) break
        c.custo = (e.custo as Custo | null) ?? null
        break
      case 'veredito': {
        if (!c) break
        c.estado = (e.veredito as Veredito) ?? 'erro'
        c.fim = e.t
        c.falhas = lista(e.falhas)
        c.fimConversa = (e.fim as FimConversa | null) ?? null
        const turnos = (e.turnos as { n: number; ferramentas: string[] | null; conferencias: Conferencia[] }[]) ?? []
        for (const g of turnos) {
          const t = c.turnos.find(x => x.n === g.n)
          if (!t) continue
          t.ferramentas = g.ferramentas ?? t.ferramentas
          t.conferencias = g.conferencias ?? []
        }
        break
      }
      case 'placar':
        b.terminou = e.t
        b.placar = { passou: Number(e.passou), total: Number(e.total) }
        break
    }
  }
  return b
}

/** A forma da conversa gravada (ana/bancada/conversas/<id>.json, ADR-0032). */
export type ConversaGravada = {
  id: string
  arquivo: string
  titulo: string
  contato: string
  conversa_id: number | null
  inicio: string | null
  turnos: Turno[]
  tools: string[] | null
  fim: FimConversa | null
  veredito: Veredito
  falhas: string[]
  rodou_em: string
  custo?: Custo | null
}

/** Sem ao-vivo.jsonl, a bancada parada: montada das conversas gravadas. */
export function deConversas(docs: ConversaGravada[]): Bancada | null {
  if (docs.length === 0) return null
  const ordenados = [...docs].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const primeiro = ordenados[0]
  if (!primeiro) return null
  const inicios = ordenados.map(d => d.inicio).filter((x): x is string => Boolean(x)).sort()
  const fins = ordenados.map(d => d.rodou_em).filter(Boolean).sort()
  return {
    origem: 'conversas',
    bateria: null,
    rodada: null,
    arquivo: primeiro.arquivo,
    comecou: inicios[0] ?? fins[0] ?? '',
    terminou: fins[fins.length - 1] ?? null,
    traceLigado: ordenados.some(d => d.tools !== null),
    pulados: [],
    placar: {
      passou: ordenados.filter(d => d.veredito === 'passou').length,
      total: ordenados.length,
    },
    cenarios: ordenados.map(d => ({
      ...cenarioVazio(d.id, d.titulo),
      estado: d.veredito,
      inicio: d.inicio,
      fim: d.rodou_em,
      conversaId: d.conversa_id,
      contato: d.contato,
      turnosPrevistos: d.turnos.length,
      turnos: d.turnos.map(t => ({
        n: t.n,
        paciente: t.paciente,
        espere: t.espere ?? null,
        nos: t.nos ?? [],
        ana: t.ana ?? [],
        ferramentas: t.ferramentas ?? null,
        conferencias: t.conferencias ?? [],
      })),
      tools: d.tools,
      falhas: d.falhas ?? [],
      fimConversa: d.fim,
      custo: d.custo ?? null,
    })),
  }
}

export type Resumo = {
  total: number
  feitos: number
  passou: number
  falhou: number
  erro: number
  rodando: Cenario | null
  mediaMs: number | null
}

export function resumir(b: Bancada): Resumo {
  const feitos = b.cenarios.filter(c => c.fim !== null)
  const duracoes = feitos
    .filter(c => c.inicio)
    .map(c => Date.parse(c.fim as string) - Date.parse(c.inicio as string))
    .filter(ms => Number.isFinite(ms) && ms > 0)
  return {
    total: b.cenarios.length,
    feitos: feitos.length,
    passou: b.cenarios.filter(c => c.estado === 'passou').length,
    falhou: b.cenarios.filter(c => c.estado === 'falhou').length,
    erro: b.cenarios.filter(c => c.estado === 'erro').length,
    rodando: b.cenarios.find(c => c.estado === 'rodando') ?? null,
    mediaMs: duracoes.length ? duracoes.reduce((a, x) => a + x, 0) / duracoes.length : null,
  }
}

/** Quanto falta, em ms, pela media dos cenarios ja feitos. null sem base. */
export function estimarRestante(b: Bancada, r: Resumo, agoraMs: number): number | null {
  if (b.terminou || r.mediaMs === null) return null
  const porFazer = r.total - r.feitos
  let ms = porFazer * r.mediaMs
  if (r.rodando?.inicio) ms -= Math.min(r.mediaMs, agoraMs - Date.parse(r.rodando.inicio))
  return Math.max(0, ms)
}

/** "regrediu" (passou antes, nao passou agora), "melhorou" (o contrario) ou null. */
export function mudanca(c: Cenario): 'regrediu' | 'melhorou' | null {
  const antes = c.anterior ?? c.rodadas[c.rodadas.length - 1] ?? null
  if (!antes || c.estado === 'espera' || c.estado === 'rodando') return null
  if (antes === 'passou' && c.estado !== 'passou') return 'regrediu'
  if (antes !== 'passou' && c.estado === 'passou') return 'melhorou'
  return null
}

export function duracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m${String(s % 60).padStart(2, '0')}` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

/** Quebra um texto em linhas de ate `largura` colunas, por palavra. */
export function quebrar(texto: string, largura: number): string[] {
  const saida: string[] = []
  for (const paragrafo of texto.split('\n')) {
    if (paragrafo.trim() === '') {
      saida.push('')
      continue
    }
    let atual = ''
    for (const palavra of paragrafo.split(/\s+/)) {
      if (atual === '') atual = palavra
      else if (atual.length + 1 + palavra.length <= largura) atual += ' ' + palavra
      else {
        saida.push(atual)
        atual = palavra
      }
      while (atual.length > largura) {
        saida.push(atual.slice(0, largura))
        atual = atual.slice(largura)
      }
    }
    saida.push(atual)
  }
  return saida
}
