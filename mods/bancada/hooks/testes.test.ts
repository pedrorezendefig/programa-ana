import { expect, test } from 'claude-code/testing'

import type { ItemRelatorio, Relatorio } from '../types'
import { contar, linhasTestes, mover, selecionada } from './testes'

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
  ...extra,
})

const relatorio: Relatorio = {
  bateria: 'v69',
  rodadas: [1, 2, 3],
  anterior: 'v68',
  raias: [
    { id: 'entrada', rotulo: 'Entrada' },
    { id: 'convenio', rotulo: 'Convenio' },
  ],
  blocos: [
    {
      nome: 'Chegada',
      capacidades: [
        { id: 'C01', titulo: 'Triagem', estado: 'funciona', cenarios: [item('C01-1', 'passa', ['entrada'])] },
        { id: 'C02', titulo: 'Convenio', estado: null, cenarios: [item('C02-1', 'intermitente', ['convenio']), item('C02-2', 'passa', ['convenio'])] },
      ],
    },
    {
      nome: 'Pendentes',
      capacidades: [{ id: 'C11', titulo: 'Portal', estado: null, cenarios: [] }],
    },
  ],
  buracos: { capacidades_sem_cenario: ['C11'], total_capacidades: 3, nos_sem_cenario: [], total_nos: 10 },
  geradoEm: 0,
}

test('conta por classe e monta as linhas na ordem do relatorio', () => {
  expect(contar(relatorio)).toEqual({ passa: 2, intermitente: 1, constante: 0, 'sem dado': 0, manual: 0 })
  const linhas = linhasTestes(relatorio, { soProblemas: false, raia: null })
  expect(linhas.map(l => l.tipo)).toEqual(['bloco', 'capacidade', 'cenario', 'capacidade', 'cenario', 'cenario', 'bloco', 'capacidade'])
  const vazia = linhas[7]!
  expect(vazia.tipo === 'capacidade' && vazia.vazia).toBe(true)
})

test('so problemas deixa o intermitente e a capacidade vazia; a raia esconde a vazia', () => {
  const so = linhasTestes(relatorio, { soProblemas: true, raia: null })
  expect(so.filter(l => l.tipo === 'cenario').map(l => (l.tipo === 'cenario' ? l.item.id : ''))).toEqual(['C02-1'])
  expect(so.some(l => l.tipo === 'capacidade' && l.vazia)).toBe(true)
  const raia = linhasTestes(relatorio, { soProblemas: false, raia: 'entrada' })
  expect(raia.filter(l => l.tipo === 'cenario').length).toBe(1)
  expect(raia.some(l => l.tipo === 'capacidade' && l.vazia)).toBe(false)
})

test('a selecao cai no primeiro problema e o cursor anda so pelas linhas paraveis', () => {
  const linhas = linhasTestes(relatorio, { soProblemas: false, raia: null })
  const sel = selecionada(linhas, null)
  expect(sel?.tipo === 'cenario' && sel.item.id).toBe('C02-1')
  expect(mover(linhas, null, 1)).toBe('C02-2')
  expect(mover(linhas, 'C02-2', 1)).toBe('C11')
  expect(mover(linhas, 'C11', 5)).toBe('C11')
  expect(mover(linhas, 'C01-1', -1)).toBe('C01-1')
  expect(selecionada(linhas, 'nao-existe')?.tipo === 'cenario').toBe(true)
})
