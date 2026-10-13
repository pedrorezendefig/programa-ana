// Bancada ao vivo (ADR-0033): o painel do Claude Code que mostra a bateria da Ana
// rodando, cenario a cenario. Le ana/bancada/resultados/ao-vivo.jsonl (escrito pelo
// e2e.py) a cada segundo; parado, mostra a ultima bateria. Comandos: /bancada,
// /bancada rodar <args do e2e.py>, /bancada parar.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Bancada, Cenario, Visao } from '../types'
import {
  deConversas,
  duracao,
  estimarRestante,
  lerEventos,
  mudanca,
  quebrar,
  resumir,
  type ConversaGravada,
} from './eventos'

const PANE = 'bancada'
const TITULO = 'Bancada ao vivo'
const AO_VIVO = 'ana/bancada/resultados/ao-vivo.jsonl'
const CONVERSAS = 'ana/bancada/conversas'
const E2E = 'ana/bancada/e2e.py'
const CENARIOS_PADRAO = 'cenarios/capacidades.json'

const bancada = atom({ plugin: 'bancada', key: 'bancada' } as const, null as Bancada | null)
const visao = atom({ plugin: 'bancada', key: 'visao' } as const, {
  selecionado: null,
  soFalhas: false,
  rolagem: 0,
} as Visao)
const agora = atom({ plugin: 'bancada', key: 'agora' } as const, 0)

// o que este carregamento do modulo ja viu (zera a cada reload, como todo modulo)
let ultimoArquivo = { size: -1, mtimeMs: -1 }
let ultimaBateria: string | null = null
let avisados = new Set<string>()
let rodando: { parar: () => void; comando: string } | null = null

const marca: Record<Cenario['estado'], string> = {
  espera: ' . ',
  rodando: ' > ',
  passou: ' ok',
  falhou: ' X ',
  erro: ' ! ',
}
const cor: Record<Cenario['estado'], 'green' | 'red' | 'yellow' | 'cyan' | undefined> = {
  espera: undefined,
  rodando: 'cyan',
  passou: 'green',
  falhou: 'red',
  erro: 'yellow',
}
const letraRodada = (v: string | null) => (v === 'passou' ? 'o' : v === 'falhou' ? 'x' : v === 'erro' ? '!' : '-')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'bancada',
      description: 'Bancada ao vivo: abre o painel da bateria; "rodar <args do e2e.py>" roda uma rodada; "parar" encerra',
      argumentHint: '[rodar <args> | parar]',
    })
    const started = await next(e)
    void $.clock.every(1000, () => {
      void vigiar($)
    })
    void vigiar($)
    return started
  })

  on('command.run', { command: 'bancada' }, async ($, e) => {
    const [verbo, ...resto] = e.args.trim().split(/\s+/).filter(Boolean)
    if (verbo === 'parar') {
      if (!rodando) return { text: 'Bancada: nenhuma rodada iniciada por aqui esta rodando.' }
      const comando = rodando.comando
      rodando.parar()
      rodando = null
      return { text: `Bancada: parei "${comando}".` }
    }
    if (verbo === 'rodar') {
      if (rodando) return { text: `Bancada: ja tem uma rodada em curso ("${rodando.comando}"). Use /bancada parar antes.` }
      const args = resto[0]?.endsWith('.json') ? resto : [CENARIOS_PADRAO, ...resto]
      const argv = ['python3', E2E, ...args]
      const comando = argv.join(' ')
      const processo = $.process.spawn({ argv })
      rodando = { comando, parar: () => void processo.return(undefined as never) }
      void (async () => {
        try {
          for await (const { stream, text } of processo) {
            if (stream === 'stderr' && text.trim()) $.ui.log(`bancada: ${text.trim()}`, { to: 'debug' })
          }
          const fim = await processo.result
          $.ui.toast(`Bancada: rodada terminou (saida ${fim.code ?? fim.signal ?? '?'})`)
        } catch (err) {
          $.ui.log(`bancada: o e2e.py nao rodou: ${String(err)}`)
        } finally {
          if (rodando?.comando === comando) rodando = null
        }
      })()
      await $.ui.open({ id: PANE, title: TITULO })
      return { text: `Bancada: rodando "${comando}". O painel segue a rodada; /bancada parar encerra.` }
    }
    if (verbo) return { text: 'Bancada: uso /bancada, /bancada rodar <args do e2e.py> ou /bancada parar.' }
    await $.ui.open({ id: PANE, title: TITULO, focus: true })
    return { text: 'Bancada: painel aberto. Teclas no painel: j/k navegar, f seguir, x so falhas, u/d rolar, Esc volta ao prompt.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const b = await read($, bancada)
    const v = await read($, visao)
    const agoraMs = (await read($, agora)) || Date.now()
    const colunas = e.viewport?.columns ?? 120
    const linhas = Math.max(8, (e.viewport?.rows ?? 30) - 1)

    if (!b) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text bold>{TITULO}</Text>
          <Text dimColor>Nenhuma bateria encontrada. Rode /bancada rodar --so C02-1 ou python3 {E2E} {CENARIOS_PADRAO}.</Text>
        </Box>
      )
    }

    const r = resumir(b)
    const restante = estimarRestante(b, r, agoraMs)
    const cenarios = v.soFalhas ? b.cenarios.filter(c => c.estado === 'falhou' || c.estado === 'erro') : b.cenarios
    const selecionado =
      (v.selecionado && b.cenarios.find(c => c.id === v.selecionado)) ||
      r.rodando ||
      [...b.cenarios].reverse().find(c => c.fim !== null) ||
      b.cenarios[0] ||
      null

    const mover = (passo: number) =>
      update($, visao, x => {
        const base = cenarios.findIndex(c => c.id === (selecionado?.id ?? ''))
        const i = Math.min(cenarios.length - 1, Math.max(0, (base < 0 ? 0 : base) + passo))
        return { ...x, selecionado: cenarios[i]?.id ?? null, rolagem: 0 }
      })
    const rolar = (passo: number) => update($, visao, x => ({ ...x, rolagem: Math.max(0, x.rolagem + passo) }))

    const larguraLista = Math.min(44, Math.max(28, Math.floor(colunas * 0.36)))
    const larguraTexto = Math.max(20, colunas - larguraLista - 5)
    const corpo = Math.max(3, linhas - 4)

    // cabecalho
    const rotulo = b.bateria ? `${b.bateria} rodada ${b.rodada}` : b.origem === 'conversas' ? 'ultima gravacao' : b.arquivo
    const placar = `${r.passou} ok  ${r.falhou} falhou${r.erro ? `  ${r.erro} erro` : ''}`
    const andamento = b.terminou
      ? `terminou ${b.placar ? `${b.placar.passou}/${b.placar.total}` : ''}`
      : `${r.feitos}/${r.total}${restante !== null ? `  falta ~${duracao(restante)}` : ''}`

    // lista
    const janela = cenarios.slice(0, corpo)
    const idx = cenarios.findIndex(c => c.id === selecionado?.id)
    const inicioLista = Math.max(0, Math.min(idx - Math.floor(corpo / 2), cenarios.length - corpo))
    const visiveis = cenarios.length > corpo ? cenarios.slice(inicioLista, inicioLista + corpo) : janela

    // conversa do selecionado
    const texto: { t: string; cor?: 'green' | 'red' | 'yellow' | 'cyan'; dim?: boolean; bold?: boolean }[] = []
    if (selecionado) {
      const c = selecionado
      const m = mudanca(c)
      texto.push({
        t: `${c.id}  ${c.titulo}  [${c.estado}${m ? `, ${m}` : ''}]${c.inicio ? `  ${duracao((c.fim ? Date.parse(c.fim) : agoraMs) - Date.parse(c.inicio))}` : ''}`,
        bold: true,
        cor: cor[c.estado],
      })
      if (c.rodadas.length) texto.push({ t: `rodadas anteriores: ${c.rodadas.map(letraRodada).join(' ')}`, dim: true })
      if (c.anterior) texto.push({ t: `gravacao anterior: ${c.anterior}`, dim: true })
      texto.push({ t: '' })
      for (const t of c.turnos) {
        for (const l of quebrar(`> paciente: ${t.paciente}`, larguraTexto)) texto.push({ t: l, bold: true })
        if (t.ana === null) texto.push({ t: '< Ana: ...', cor: 'cyan' })
        else if (t.ana.length === 0) texto.push({ t: '< Ana: (nada)', cor: 'yellow' })
        else for (const resposta of t.ana) for (const l of quebrar(`< Ana: ${resposta}`, larguraTexto)) texto.push({ t: l })
        if (t.ferramentas && t.ferramentas.length) texto.push({ t: `  ferramentas: ${t.ferramentas.join(', ')}`, dim: true })
        if (t.espere) for (const l of quebrar(`  espere: ${t.espere}`, larguraTexto)) texto.push({ t: l, dim: true })
        for (const cf of t.conferencias) {
          const veio = cf.veio === null || cf.veio === undefined ? '' : ` (veio: ${JSON.stringify(cf.veio)})`
          const lin = `  ${cf.ok === false ? 'X' : cf.ok ? 'ok' : '?'} ${cf.tipo} ${JSON.stringify(cf.esperado)}${cf.ok === false ? veio : ''}`
          for (const l of quebrar(lin, larguraTexto)) texto.push({ t: l, cor: cf.ok === false ? 'red' : cf.ok ? 'green' : undefined })
        }
        texto.push({ t: '' })
      }
      if (c.estado === 'rodando' && c.turnos.length < c.turnosPrevistos) texto.push({ t: `turno ${c.turnos.length + 1} de ${c.turnosPrevistos}...`, dim: true })
      if (c.tools) texto.push({ t: `trace: ${c.tools.length} chamada(s) -> ${c.tools.join(', ') || 'nenhuma'}`, dim: true })
      else if (c.traceMotivo) texto.push({ t: `trace: nao coletado (${c.traceMotivo})`, cor: 'yellow' })
      if (c.pior && c.pior > 1) texto.push({ t: `ATENCAO: tool de dado repetida ${c.pior}x no mesmo turno`, cor: 'yellow' })
      if (c.fimConversa) {
        const f = c.fimConversa
        const raia = f.raia ?? f.raia_pelo_trace?.join(', ') ?? '-'
        texto.push({ t: `fim: etiquetas ${f.etiquetas.join(', ') || '-'}; raia ${raia}; status ${f.status ?? '-'}; handoff ${f.handoff === null ? '?' : f.handoff}`, dim: true })
      }
      if (c.falhas.length) {
        texto.push({ t: 'falhas:', cor: 'red', bold: true })
        for (const f of c.falhas) for (const l of quebrar(`  - ${f}`, larguraTexto)) texto.push({ t: l, cor: 'red' })
      }
    }
    const rolagem = Math.min(v.rolagem, Math.max(0, texto.length - corpo))
    const recorte = texto.slice(rolagem, rolagem + corpo)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{TITULO}  <Text dimColor>{rotulo}</Text></Text>
          <Text>{andamento}  <Text dimColor>{placar}</Text>{rodando ? <Text color="cyan">  (rodando por aqui)</Text> : null}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Box flexDirection="column" width={larguraLista} borderStyle="single" borderDimColor paddingX={1}>
            {visiveis.length === 0 && <Text dimColor>{v.soFalhas ? 'nenhuma falha' : 'sem cenarios'}</Text>}
            {visiveis.map(c => {
              const m = mudanca(c)
              const tempo = c.inicio ? duracao((c.fim ? Date.parse(c.fim) : agoraMs) - Date.parse(c.inicio)) : ''
              const rod = c.rodadas.length ? ` ${c.rodadas.map(letraRodada).join('')}` : ''
              const sel = c.id === selecionado?.id
              return (
                <Button key={c.id} plain onPress={() => update($, visao, x => ({ ...x, selecionado: c.id, rolagem: 0 }))}>
                  <Text color={cor[c.estado]} bold={sel} inverse={sel}>
                    {marca[c.estado]} {c.id.padEnd(6)} {c.titulo.slice(0, Math.max(6, larguraLista - 22 - rod.length)).padEnd(Math.max(6, larguraLista - 22 - rod.length))}{tempo.padStart(5)}{rod}
                  </Text>
                  {m ? <Text color={m === 'regrediu' ? 'red' : 'green'}> {m}</Text> : null}
                </Button>
              )
            })}
          </Box>
          <Box flexDirection="column" width={larguraTexto + 2}>
            {selecionado?.link ? <Link href={selecionado.link} label={`Chatwoot #${selecionado.conversaId}`} /> : <Text dimColor>{selecionado ? 'sem conversa ainda' : ''}</Text>}
            {recorte.map((l, i) => (
              <Text key={String(rolagem + i)} color={l.cor} dimColor={l.dim} bold={l.bold} wrap="truncate">{l.t || ' '}</Text>
            ))}
            {texto.length > corpo ? <Text dimColor>linhas {rolagem + 1} a {Math.min(texto.length, rolagem + corpo)} de {texto.length}</Text> : null}
          </Box>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Button plain hotkey="j" onPress={() => mover(1)}>baixo</Button>
          <Button plain hotkey="k" onPress={() => mover(-1)}>cima</Button>
          <Button plain hotkey="f" onPress={() => update($, visao, x => ({ ...x, selecionado: null, rolagem: 0 }))}>seguir</Button>
          <Button plain hotkey="x" onPress={() => update($, visao, x => ({ ...x, soFalhas: !x.soFalhas, selecionado: null, rolagem: 0 }))}>{v.soFalhas ? 'todos' : 'so falhas'}</Button>
          <Button plain hotkey="d" onPress={() => rolar(Math.max(1, corpo - 2))}>rolar baixo</Button>
          <Button plain hotkey="u" onPress={() => rolar(-Math.max(1, corpo - 2))}>rolar cima</Button>
          {b.pulados.length ? <Text dimColor>{b.pulados.length} pulado(s)</Text> : null}
        </Box>
      </Box>
    )
  })
}

type Engine = EngineInterface

/** A cada segundo: o arquivo mudou? Le, atualiza o estado, abre o painel, avisa. */
async function vigiar($: Engine) {
  let stat: { size: number; mtimeMs: number } | null = null
  try {
    stat = await $.fs.stat(AO_VIVO)
  } catch {
    stat = null
  }
  if (stat === null) {
    if (ultimoArquivo.size !== -2) {
      ultimoArquivo = { size: -2, mtimeMs: -2 }
      const b = await lerConversas($)
      await update($, bancada, () => b)
    }
    return
  }
  const atual = await read($, bancada)
  if (stat.size === ultimoArquivo.size && stat.mtimeMs === ultimoArquivo.mtimeMs) {
    if (atual && !atual.terminou) await update($, agora, () => Date.now())
    return
  }
  ultimoArquivo = { size: stat.size, mtimeMs: stat.mtimeMs }
  let b: Bancada | null = null
  try {
    b = lerEventos(await $.fs.read(AO_VIVO))
  } catch {
    b = null
  }
  if (!b) {
    if (!atual) {
      const gravadas = await lerConversas($)
      await update($, bancada, () => gravadas)
    }
    return
  }
  const anterior = await read($, bancada)
  await update($, bancada, () => b)
  await update($, agora, () => Date.now())

  if (b.comecou !== ultimaBateria) {
    ultimaBateria = b.comecou
    avisados = new Set()
    if (!b.terminou) {
      await update($, visao, x => ({ ...x, selecionado: null, rolagem: 0 }))
      void $.ui.open({ id: PANE, title: TITULO })
      $.ui.toast(`Bancada: comecou ${b.bateria ? `${b.bateria} rodada ${b.rodada}` : b.arquivo} (${b.cenarios.length} cenarios)`)
    }
  }
  const r = resumir(b)
  if (!b.terminou) {
    for (const c of b.cenarios) {
      if ((c.estado === 'falhou' || c.estado === 'erro') && !avisados.has(c.id)) {
        avisados.add(c.id)
        const foiAnterior = anterior?.cenarios.find(x => x.id === c.id)
        if (!foiAnterior || foiAnterior.estado !== c.estado) $.ui.toast(`${c.id} ${c.estado}: ${c.falhas[0] ?? ''}`.slice(0, 160))
      }
    }
    const restante = estimarRestante(b, r, Date.now())
    $.ui.status(`bancada: ${r.rodando?.id ?? '...'} (${r.feitos}/${r.total}) ${r.passou} ok ${r.falhou} falhou${restante !== null ? ` ~${duracao(restante)}` : ''}`)
  } else {
    if (!avisados.has('placar') && anterior && !anterior.terminou) {
      avisados.add('placar')
      $.ui.toast(`Bancada: placar ${b.placar?.passou}/${b.placar?.total}${b.bateria ? ` (${b.bateria} rodada ${b.rodada})` : ''}`, { timeoutMs: 10000 })
    }
    $.ui.status(undefined)
  }
}

async function lerConversas($: Engine): Promise<Bancada | null> {
  try {
    const nomes = (await $.fs.list(CONVERSAS)).filter(x => x.kind === 'file' && x.name.endsWith('.json'))
    const docs: ConversaGravada[] = []
    for (const n of nomes) {
      try {
        docs.push(JSON.parse(await $.fs.read(`${CONVERSAS}/${n.name}`)) as ConversaGravada)
      } catch {
        // uma conversa quebrada nao derruba a lista
      }
    }
    return deConversas(docs)
  } catch {
    return null
  }
}
