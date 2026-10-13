import { expect, test } from 'claude-code/testing'

import type { Bancada, Relatorio, Visao } from '../types'

// O painel precisa desenhar nas duas colocacoes do terminal (inline e dock) e nas duas abas,
// com e sem dados: um <Button> sem key fez o motor recusar a arvore inteira, e o painel
// apareceu como uma caixa vazia de uma linha.

const relatorio: Relatorio = {
  bateria: 'gpt-6-luna',
  rodadas: [1, 2, 3],
  anterior: 'v69',
  raias: [
    { id: 'entrada', rotulo: 'Entrada e regras globais' },
    { id: 'urgencia', rotulo: 'Urgência (Seção 0)' },
  ],
  blocos: [
    {
      nome: 'Chegada e triagem',
      capacidades: [
        {
          id: 'C01',
          titulo: 'Triagem de urgência',
          estado: 'funciona',
          cenarios: [
            { id: 'C01-1', titulo: 'Triagem de urgência', manual: false, escrita: false, rodadas: ['passou', 'passou', 'passou'], classe: 'passa', mudanca: null, tools: [], nos: ['E1', 'U1'], raias: ['entrada', 'urgencia'] },
            { id: 'C01-2', titulo: 'Intermitente', manual: false, escrita: false, rodadas: ['passou', 'falhou', 'passou'], classe: 'intermitente', mudanca: 'regrediu', tools: ['assign_label'], nos: ['U2'], raias: ['urgencia'] },
          ],
        },
        { id: 'C11', titulo: 'Sem cenario', estado: null, cenarios: [] },
      ],
    },
  ],
  buracos: {
    capacidades_sem_cenario: ['C11'],
    total_capacidades: 30,
    nos_sem_cenario: [{ raia: 'entrada', rotulo: 'Entrada e regras globais', nos: [{ id: 'E8', titulo: 'Regras globais inegociáveis' }] }],
    total_nos: 81,
  },
  geradoEm: Date.now(),
}

const bancada: Bancada = {
  origem: 'ao-vivo',
  bateria: 'v70',
  rodada: 1,
  arquivo: 'capacidades.json',
  comecou: '2026-10-13T03:58:00+00:00',
  terminou: null,
  traceLigado: true,
  pulados: [{ id: 'C11-1', motivo: 'manual' }],
  placar: { passou: 1, total: 2 },
  cenarios: [
    {
      id: 'C01-1', titulo: 'Triagem', estado: 'falhou', anterior: 'passou', rodadas: ['passou'], inicio: '2026-10-13T03:58:10+00:00', fim: '2026-10-13T03:58:50+00:00',
      conversaId: 380, contato: 'TESTE', link: 'https://chat/app/accounts/1/conversations/380', turnosPrevistos: 1,
      turnos: [{ n: 1, paciente: 'dor no peito', espere: 'orienta o PS', nos: ['E1'], ana: ['Procure o PS'], ferramentas: ['assign_label'], conferencias: [{ turno: 1, tipo: 'etiqueta', esperado: 'emergencia', veio: [], ok: false }] }],
      tools: ['assign_label'], traceMotivo: null, pior: 1, falhas: ['turno 1: etiqueta "emergencia" (veio: [])'],
      fimConversa: { etiquetas: [], raia: null, raia_pelo_trace: [], status: 'open', handoff: false },
    },
    { id: 'C02-1', titulo: 'Saudacao', estado: 'rodando', anterior: null, rodadas: [], inicio: '2026-10-13T03:59:00+00:00', fim: null, conversaId: null, contato: null, link: null, turnosPrevistos: 2, turnos: [], tools: null, traceMotivo: null, pior: null, falhas: [], fimConversa: null },
  ],
}

const visaoBase: Visao = { aba: 'bateria', selecionado: null, soFalhas: false, rolagem: 0, soProblemas: false, soBuracos: false, raia: null, rolagemTestes: 0, itemTestes: null }

type Engine = Parameters<Parameters<typeof test>[1]>[0]
type On = Parameters<Parameters<typeof test>[1]>[1]

// o teste responde a leitura do estado do mod por baixo dele, com os dados de exemplo
const semear = (on: On, valores: { bancada?: Bancada; relatorio?: Relatorio; visao: Visao }) => {
  on('state.get', { plugin: 'bancada' }, ((_: unknown, e: { key: string }, next: (e: unknown) => unknown) =>
    e.key in valores ? { value: { value: valores[e.key as keyof typeof valores], version: 1 } } : next(e)) as never)
}

const montar = ($: Engine, placement: 'inline' | 'dock') =>
  $.ui.mount({
    plugin: 'bancada',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'bancada',
    props: { title: 'Bancada ao vivo', isFocused: false, bodyColumns: 200, placement, scroll: { offset: 0, bodyRows: 30 }, view: {} } as never,
    viewport: { columns: 220, rows: 50 } as never,
  })

for (const placement of ['inline', 'dock'] as const) {
  test(`sem dados, o painel desenha texto (${placement})`, async $ => {
    const ui = await montar($, placement)
    expect((await ui.findAll({ type: 'Text' })).length).toBeGreaterThan(0)
    await ui.unmount()
  })

  test(`aba Bateria com bateria em curso desenha os cenarios (${placement})`, async ($, on) => {
    semear(on, { bancada, visao: { ...visaoBase, aba: 'bateria' } })
    const ui = await montar($, placement)
    expect(await ui.find({ type: 'Text', text: /C01-1/ })).toBeDefined()
    await ui.unmount()
  })

  test(`aba Testes com relatorio desenha a lista (${placement})`, async ($, on) => {
    semear(on, { relatorio, visao: { ...visaoBase, aba: 'testes' } })
    const ui = await montar($, placement)
    expect(await ui.find({ type: 'Text', text: /C01-2/ })).toBeDefined()
    await ui.unmount()
  })

  test(`aba Testes com relatorio desenha os buracos (${placement})`, async ($, on) => {
    semear(on, { relatorio, visao: { ...visaoBase, aba: 'testes', soBuracos: true } })
    const ui = await montar($, placement)
    expect(await ui.find({ type: 'Text', text: /E8/ })).toBeDefined()
    await ui.unmount()
  })
}
