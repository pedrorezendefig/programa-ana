import { expect, test } from 'claude-code/testing'

import { deConversas, estimarRestante, lerEventos, mudanca, quebrar, resumir } from './eventos'

const linhas = [
  { evento: 'bateria', t: '2026-10-13T03:58:00+00:00', bateria: 'v69', rodada: 2, arquivo: 'capacidades.json', cenarios: [{ id: 'C01-1', titulo: 'Triagem' }, { id: 'C02-1', titulo: 'Saudacao' }], pulados: [{ id: 'C11-1', motivo: 'manual' }], trace_ligado: true, rodadas_anteriores: { 'C01-1': ['passou'], 'C02-1': ['falhou'] } },
  { evento: 'cenario', t: '2026-10-13T03:58:10+00:00', id: 'C01-1', titulo: 'Triagem', turnos: 1, anterior: 'passou' },
  { evento: 'conversa', t: '2026-10-13T03:58:11+00:00', id: 'C01-1', conversa_id: 380, contato: 'TESTE', link: 'https://chat/app/accounts/1/conversations/380' },
  { evento: 'paciente', t: '2026-10-13T03:58:12+00:00', id: 'C01-1', n: 1, texto: 'dor no peito', espere: 'orienta o PS', nos: ['E1'] },
  { evento: 'ana', t: '2026-10-13T03:58:30+00:00', id: 'C01-1', n: 1, respostas: ['Procure o PS'] },
  { evento: 'trace', t: '2026-10-13T03:58:40+00:00', id: 'C01-1', tools: ['assign_label'], pior: 1, por_turno: [['assign_label']] },
  { evento: 'veredito', t: '2026-10-13T03:58:50+00:00', id: 'C01-1', veredito: 'falhou', falhas: ['turno 1: etiqueta "emergencia" (veio: [])'], turnos: [{ n: 1, ferramentas: ['assign_label'], conferencias: [{ turno: 1, tipo: 'etiqueta', esperado: 'emergencia', veio: [], ok: false }] }], fim: { etiquetas: [], raia: null, raia_pelo_trace: [], status: 'open', handoff: false } },
  { evento: 'cenario', t: '2026-10-13T03:59:00+00:00', id: 'C02-1', titulo: 'Saudacao', turnos: 1, anterior: 'falhou' },
  { evento: 'paciente', t: '2026-10-13T03:59:01+00:00', id: 'C02-1', n: 1, texto: 'oi', espere: null, nos: [] },
]
const texto = linhas.map(l => JSON.stringify(l)).join('\n') + '\n{"evento":"ana","t":"2026-10-13T03:59:'

test('le os eventos ate a linha quebrada e sabe quem roda', () => {
  const b = lerEventos(texto)
  expect(b).not.toBeNull()
  expect(b!.bateria).toBe('v69')
  expect(b!.rodada).toBe(2)
  expect(b!.terminou).toBeNull()
  const c1 = b!.cenarios[0]!
  const c2 = b!.cenarios[1]!
  expect(c1.estado).toBe('falhou')
  expect(c1.link).toBe('https://chat/app/accounts/1/conversations/380')
  expect(c1.turnos[0]!.ana).toEqual(['Procure o PS'])
  expect(c1.turnos[0]!.conferencias[0]!.ok).toBe(false)
  expect(c1.rodadas).toEqual(['passou'])
  expect(mudanca(c1)).toBe('regrediu')
  expect(c2.estado).toBe('rodando')
  expect(c2.turnos[0]!.ana).toBeNull()
  const r = resumir(b!)
  expect(r.rodando?.id).toBe('C02-1')
  expect(r.feitos).toBe(1)
  expect(r.falhou).toBe(1)
  expect(estimarRestante(b!, r, Date.parse('2026-10-13T03:59:05+00:00'))).toBe(35000)
})

test('o placar fecha a bateria', () => {
  const b = lerEventos(texto.split('\n').slice(0, -1).join('\n') + '\n' + JSON.stringify({ evento: 'placar', t: '2026-10-13T04:00:00+00:00', passou: 1, total: 2, resultados: [] }))
  expect(b!.terminou).toBe('2026-10-13T04:00:00+00:00')
  expect(b!.placar).toEqual({ passou: 1, total: 2 })
})

test('sem ao-vivo, monta a bancada das conversas gravadas', () => {
  const b = deConversas([
    { id: 'C02-1', arquivo: 'capacidades.json', titulo: 'Saudacao', contato: 'T', conversa_id: 2, inicio: '2026-10-13T03:00:00+00:00', turnos: [{ n: 1, paciente: 'oi', espere: null, nos: [], ana: ['Ola'], ferramentas: [], conferencias: [] }], tools: [], fim: null, veredito: 'passou', falhas: [], rodou_em: '2026-10-13T03:01:00+00:00' },
    { id: 'C01-1', arquivo: 'capacidades.json', titulo: 'Triagem', contato: 'T', conversa_id: 1, inicio: '2026-10-13T02:59:00+00:00', turnos: [], tools: null, fim: null, veredito: 'erro', falhas: ['x'], rodou_em: '2026-10-13T02:59:30+00:00' },
  ])
  expect(b!.origem).toBe('conversas')
  expect(b!.cenarios.map(c => c.id)).toEqual(['C01-1', 'C02-1'])
  expect(b!.placar).toEqual({ passou: 1, total: 2 })
  expect(b!.terminou).toBe('2026-10-13T03:01:00+00:00')
  expect(mudanca(b!.cenarios[0]!)).toBeNull()
})

test('quebra por palavra e corta palavra maior que a largura', () => {
  expect(quebrar('um dois tres quatro', 8)).toEqual(['um dois', 'tres', 'quatro'])
  expect(quebrar('abcdefghijkl', 5)).toEqual(['abcde', 'fghij', 'kl'])
  expect(quebrar('a\n\nb', 10)).toEqual(['a', '', 'b'])
})
