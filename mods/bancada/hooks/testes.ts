// Mesa de testes: o modelo puro da aba Testes do painel. Sem $, sem desenho:
// as linhas da lista (bloco, capacidade, cenario) ja filtradas pela visao, a
// selecao e o passeio por ela (o cursor para nos tres niveis), as contagens por
// classe e os textos de custo (issue #24).
import type { BlocoRelatorio, CapacidadeRelatorio, Classe, Custo, CustoMedio, ItemRelatorio, Relatorio, Visao } from '../types'

export type LinhaTestes =
  | { tipo: 'bloco'; bloco: BlocoRelatorio }
  | { tipo: 'capacidade'; cap: CapacidadeRelatorio; vazia: boolean }
  | { tipo: 'cenario'; item: ItemRelatorio; cap: CapacidadeRelatorio }

export const problema = (i: ItemRelatorio) =>
  i.classe === 'intermitente' || i.classe === 'constante' || i.classe === 'sem dado' || i.mudanca === 'regrediu'

export function contar(r: Relatorio): Record<Classe, number> {
  const n: Record<Classe, number> = { passa: 0, intermitente: 0, constante: 0, 'sem dado': 0, manual: 0 }
  for (const b of r.blocos) for (const c of b.capacidades) for (const i of c.cenarios) n[i.classe] += 1
  return n
}

/** As linhas da lista, na ordem do relatorio, ja filtradas por "so problemas" e raia. */
export function linhasTestes(r: Relatorio, v: Pick<Visao, 'soProblemas' | 'raia'>): LinhaTestes[] {
  const out: LinhaTestes[] = []
  for (const bloco of r.blocos) {
    const doBloco: LinhaTestes[] = []
    for (const cap of bloco.capacidades) {
      const vazia = cap.cenarios.length === 0
      if (vazia) {
        // capacidade sem cenario executavel e um buraco: entra como problema, mas nao tem raia
        if (!v.raia) doBloco.push({ tipo: 'capacidade', cap, vazia: true })
        continue
      }
      const cenarios = cap.cenarios.filter(i => (!v.soProblemas || problema(i)) && (!v.raia || i.raias.includes(v.raia)))
      if (cenarios.length === 0) continue
      doBloco.push({ tipo: 'capacidade', cap, vazia: false })
      for (const item of cenarios) doBloco.push({ tipo: 'cenario', item, cap })
    }
    if (doBloco.length) out.push({ tipo: 'bloco', bloco }, ...doBloco)
  }
  return out
}

/** A chave de uma linha: o cursor para em bloco, capacidade e cenario. */
export const chave = (l: LinhaTestes): string =>
  l.tipo === 'cenario' ? l.item.id : l.tipo === 'capacidade' ? l.cap.id : `bloco:${l.bloco.nome}`

/** A linha selecionada: a da chave, senao o primeiro problema (cenario ou capacidade vazia), senao a primeira. */
export function selecionada(linhas: LinhaTestes[], atual: string | null): LinhaTestes | null {
  if (atual) {
    const l = linhas.find(x => chave(x) === atual)
    if (l) return l
  }
  return linhas.find(l => (l.tipo === 'capacidade' && l.vazia) || (l.tipo === 'cenario' && problema(l.item))) ?? linhas[0] ?? null
}

/** Anda `passo` linhas a partir da selecao; devolve a chave nova. */
export function mover(linhas: LinhaTestes[], atual: string | null, passo: number): string | null {
  if (linhas.length === 0) return null
  const sel = selecionada(linhas, atual)
  const base = sel ? linhas.indexOf(sel) : -1
  const i = Math.min(linhas.length - 1, Math.max(0, (base < 0 ? 0 : base) + passo))
  const l = linhas[i]
  return l ? chave(l) : null
}

// ---------------------------------------------------------------- custo

const virgula = (n: number, casas: number) => n.toFixed(casas).replace('.', ',')
export const brl = (v: number | null | undefined) => (v === null || v === undefined ? '-' : `R$ ${virgula(v, v < 0.1 ? 3 : 2)}`)
export const usd = (v: number | null | undefined) => (v === null || v === undefined ? '-' : `US$ ${virgula(v, 4)}`)
export const pct = (v: number) => `${virgula(v, v >= 10 ? 0 : 1)}%`

/** "R$ 0,35 Meta + US$ 0,0014 OpenAI, 7 msg da Ana", ou "sem medida" quando a rodada nao mediu. */
export function custoTexto(c: Custo | CustoMedio | null | undefined): string {
  if (!c || (c.meta_brl === null && c.openai_usd === null)) return 'sem medida'
  const msg = c.mensagens_ana === null || c.mensagens_ana === undefined ? '' : `, ${virgula(c.mensagens_ana, Number.isInteger(c.mensagens_ana) ? 0 : 1)} msg da Ana`
  return `${brl(c.meta_brl)} Meta + ${usd(c.openai_usd)} OpenAI${msg}`
}
