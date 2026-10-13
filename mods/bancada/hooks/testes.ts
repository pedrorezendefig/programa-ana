// Mesa de testes: o modelo puro da aba Testes do painel. Sem $, sem desenho:
// as linhas da lista (bloco, capacidade, cenario) ja filtradas pela visao, a
// selecao e o passeio por ela e as contagens por classe.
import type { CapacidadeRelatorio, Classe, ItemRelatorio, Relatorio, Visao } from '../types'

export type LinhaTestes =
  | { tipo: 'bloco'; nome: string }
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
    if (doBloco.length) out.push({ tipo: 'bloco', nome: bloco.nome }, ...doBloco)
  }
  return out
}

/** A chave de uma linha que o cursor pode parar: cenario, ou capacidade vazia. */
export const chave = (l: LinhaTestes): string | null =>
  l.tipo === 'cenario' ? l.item.id : l.tipo === 'capacidade' && l.vazia ? l.cap.id : null

/** A linha selecionada: a da chave, senao o primeiro problema, senao a primeira que da para parar. */
export function selecionada(linhas: LinhaTestes[], atual: string | null): LinhaTestes | null {
  const paraveis = linhas.filter(l => chave(l) !== null)
  if (atual) {
    const l = paraveis.find(x => chave(x) === atual)
    if (l) return l
  }
  return paraveis.find(l => l.tipo === 'capacidade' || (l.tipo === 'cenario' && problema(l.item))) ?? paraveis[0] ?? null
}

/** Anda `passo` linhas paraveis a partir da selecao; devolve a chave nova. */
export function mover(linhas: LinhaTestes[], atual: string | null, passo: number): string | null {
  const chaves = linhas.map(chave).filter((k): k is string => k !== null)
  if (chaves.length === 0) return null
  const sel = selecionada(linhas, atual)
  const base = sel ? chaves.indexOf(chave(sel) as string) : -1
  const i = Math.min(chaves.length - 1, Math.max(0, (base < 0 ? 0 : base) + passo))
  return chaves[i] ?? null
}
