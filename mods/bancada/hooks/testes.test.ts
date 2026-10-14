import { expect, test } from 'claude-code/testing'

import type { BlocoRelatorio, CapacidadeRelatorio, ItemRelatorio, Relatorio } from '../types'
import { chave, contar, custoTexto, linhasTestes, mover, selecionada } from './testes'

const semCusto = { openai_usd: null, meta_brl: null, mensagens_ana: null }

const item = (id: string, classe: ItemRelatorio['classe'], raias: string[], extra: Partial<ItemRelatorio> = {}): ItemRelatorio => ({
  id,
  titulo: `Cenario ${id}`,
  manual: false,
  escrita: false,
  rodadas: classe === 'passa' ? ['passou', 'passou', 'passou'] : classe === 'constante' ? ['falhou', 'falhou', 'falhou'] : ['passou', 'falhou', 'passou'],
  classe,
  mudanca: null,
  tools: [],
  nos: ['E1'],
  raias,
  fatia_sop: 1.2,
  depende_gh: false,
  custo: null,
  alerta_mensagens: false,
  ...extra,
})

const cap = (id: string, titulo: string, cenarios: ItemRelatorio[], extra: Partial<CapacidadeRelatorio> = {}): CapacidadeRelatorio => ({
  id,
  titulo,
  estado: null,
  faz: `O que ${id} faz`,
  falta: '',
  tools_texto: 'nenhuma',
  fatia_sop: 2.5,
  depende_gh: false,
  funciona: cenarios.length ? cenarios.every(i => i.classe === 'passa') : null,
  custo_medio: semCusto,
  cenarios,
  ...extra,
})

const bloco = (nome: string, capacidades: CapacidadeRelatorio[]): BlocoRelatorio => ({
  nome,
  resumo: `Resumo de ${nome}`,
  fatia_sop: 10,
  capacidades_total: capacidades.length,
  funcionam: capacidades.filter(c => c.funciona).length,
  nao_funcionam: capacidades.filter(c => c.funciona === false).length,
  sem_cenario: capacidades.filter(c => c.funciona === null).length,
  dependem_gh: capacidades.filter(c => c.depende_gh).length,
  custo_medio: semCusto,
  capacidades,
})

const relatorio: Relatorio = {
  bateria: 'v69',
  rodadas: [1, 2, 3],
  anterior: 'v68',
  precos: { conferido_em: '2026-10-13', dias: 0, vencido: false, meta_brl_por_mensagem: 0.035, cambio_brl_por_usd: 5.6 },
  custo_medio: { ...semCusto, medidos: 0 },
  teto_mensagens_ana: 8,
  raias: [
    { id: 'entrada', rotulo: 'Entrada' },
    { id: 'convenio', rotulo: 'Convenio' },
  ],
  blocos: [
    bloco('Chegada', [
      cap('C01', 'Triagem', [item('C01-1', 'passa', ['entrada'])], { estado: 'funciona' }),
      cap('C02', 'Convenio', [item('C02-1', 'intermitente', ['convenio']), item('C02-2', 'passa', ['convenio'])]),
    ]),
    bloco('Pendentes', [cap('C11', 'Portal', [])]),
  ],
  buracos: {
    capacidades_sem_cenario: ['C11'], total_capacidades: 3, nos_sem_cenario: [], total_nos: 10,
    origens: [], por_origem: { gh: { capacidades: 0, nos: 0 }, planejado: { capacidades: 0, nos: 0 }, manual: { capacidades: 1, nos: 0 }, escrever: { capacidades: 0, nos: 0 } },
    capacidades: [], desvio_gh: [],
  },
  geradoEm: 0,
}

test('conta por classe e monta as linhas na ordem do relatorio', () => {
  expect(contar(relatorio)).toEqual({ passa: 2, intermitente: 1, constante: 0, 'sem dado': 0, manual: 0 })
  const linhas = linhasTestes(relatorio, { soProblemas: false, raia: null })
  expect(linhas.map(l => l.tipo)).toEqual(['bloco', 'capacidade', 'cenario', 'capacidade', 'cenario', 'cenario', 'bloco', 'capacidade'])
  const vazia = linhas[7]!
  expect(vazia.tipo === 'capacidade' && vazia.vazia).toBe(true)
  expect(linhas.map(chave)).toEqual(['bloco:Chegada', 'C01', 'C01-1', 'C02', 'C02-1', 'C02-2', 'bloco:Pendentes', 'C11'])
})

test('so problemas deixa o intermitente e a capacidade vazia; a raia esconde a vazia', () => {
  const so = linhasTestes(relatorio, { soProblemas: true, raia: null })
  expect(so.filter(l => l.tipo === 'cenario').map(l => (l.tipo === 'cenario' ? l.item.id : ''))).toEqual(['C02-1'])
  expect(so.some(l => l.tipo === 'capacidade' && l.vazia)).toBe(true)
  const raia = linhasTestes(relatorio, { soProblemas: false, raia: 'entrada' })
  expect(raia.filter(l => l.tipo === 'cenario').length).toBe(1)
  expect(raia.some(l => l.tipo === 'capacidade' && l.vazia)).toBe(false)
})

test('a selecao cai no primeiro problema e o cursor para em bloco, capacidade e cenario', () => {
  const linhas = linhasTestes(relatorio, { soProblemas: false, raia: null })
  const sel = selecionada(linhas, null)
  expect(sel?.tipo === 'cenario' && sel.item.id).toBe('C02-1')
  expect(mover(linhas, null, 1)).toBe('C02-2')
  expect(mover(linhas, 'C02-2', 1)).toBe('bloco:Pendentes')
  expect(mover(linhas, 'bloco:Pendentes', 1)).toBe('C11')
  expect(mover(linhas, 'C11', 5)).toBe('C11')
  expect(mover(linhas, 'C01-1', -1)).toBe('C01')
  expect(mover(linhas, 'C01', -1)).toBe('bloco:Chegada')
  expect(mover(linhas, 'bloco:Chegada', -1)).toBe('bloco:Chegada')
  expect(selecionada(linhas, 'bloco:Chegada')?.tipo).toBe('bloco')
  expect(selecionada(linhas, 'nao-existe')?.tipo === 'cenario').toBe(true)
})

test('o custo vira texto em reais e dolares, ou "sem medida"', () => {
  expect(custoTexto(null)).toBe('sem medida')
  expect(custoTexto(semCusto)).toBe('sem medida')
  expect(custoTexto({ modelo: 'gpt-6-luna', mensagens_ana: 7, openai_usd: 0.0014, meta_brl: 0.28 })).toBe('R$ 0,28 Meta + US$ 0,0014 OpenAI, 7 msg da Ana')
  expect(custoTexto({ openai_usd: 0.00156, meta_brl: 0.035, mensagens_ana: 1.5 })).toBe('R$ 0,035 Meta + US$ 0,0016 OpenAI, 1,5 msg da Ana')
})
