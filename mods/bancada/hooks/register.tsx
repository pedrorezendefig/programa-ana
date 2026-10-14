// Bancada ao vivo (ADR-0033): o painel do Claude Code com duas abas. "Bateria" mostra
// a bateria da Ana rodando, cenario a cenario (le ana/bancada/resultados/ao-vivo.jsonl,
// escrito pelo e2e.py, a cada segundo; parada, mostra a ultima). "Testes" e a mesa de
// testes: o relatorio por capacidade (relatorio.py --json) numa lista com cursor, o
// detalhe do cenario sob o cursor e os buracos de cobertura. O painel e so visor: nada
// sai daqui para o chat; o Pedro pede o que quer no prompt. Nada abre ao iniciar a sessao: o painel aparece
// quando uma bateria comeca a rodar, pelos comandos (/painel, /painel testes,
// /painel rodar <args>, /painel parar) ou pela ferramenta abrir_testes, que a skill
// /testes chama.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Bancada, Cenario, Classe, ItemRelatorio, Relatorio, Visao } from '../types'
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
import { brl, chave, contar, custoTexto, linhasTestes, mover as moverCursor, pct, selecionada, usd } from './testes'

const PANE = 'bancada'
const TITULO = 'Bancada ao vivo'
const AO_VIVO = 'ana/bancada/resultados/ao-vivo.jsonl'
const CONVERSAS = 'ana/bancada/conversas'
const E2E = 'ana/bancada/e2e.py'
const RELATORIO = 'ana/bancada/relatorio.py'
const FERRAMENTA = 'abrir_testes'
const CENARIOS_PADRAO = 'cenarios/capacidades.json'

const bancada = atom({ plugin: 'bancada', key: 'bancada' } as const, null as Bancada | null)
const visao = atom({ plugin: 'bancada', key: 'visao' } as const, {
  aba: 'bateria',
  selecionado: null,
  soFalhas: false,
  rolagem: 0,
  soProblemas: false,
  soBuracos: false,
  raia: null,
  rolagemTestes: 0,
  itemTestes: null,
} as Visao)
const agora = atom({ plugin: 'bancada', key: 'agora' } as const, 0)
const relatorio = atom({ plugin: 'bancada', key: 'relatorio' } as const, null as Relatorio | null)

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

// a paleta da mesa de testes (hex: o terminal desenha como esta)
const PAL = {
  verde: '#3fb950',
  amarelo: '#e3b341',
  vermelho: '#f85149',
  ciano: '#39c5cf',
  roxo: '#bc8cff',
  laranja: '#f0883e',
  azul: '#58a6ff',
  cinza: '#8b949e',
}
const corDaClasse: Record<Classe, string> = {
  passa: PAL.verde,
  intermitente: PAL.amarelo,
  constante: PAL.vermelho,
  'sem dado': PAL.cinza,
  manual: PAL.cinza,
}
const marcaDaClasse: Record<Classe, string> = { passa: '●', intermitente: '◐', constante: '●', 'sem dado': '○', manual: '✎' }
const corDaRodada = (v: string | null) => (v === 'passou' ? PAL.verde : v === 'falhou' ? PAL.vermelho : v === 'erro' ? PAL.laranja : PAL.cinza)
const palavraRodada = (v: string | null) => (v === 'passou' ? 'ok' : v === 'falhou' ? 'falhou' : v === 'erro' ? 'erro' : 'sem dado')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // a ferramenta vem antes do comando: se o comando for recusado, a mesa de testes continua existindo
    await $.tool.register({
      name: FERRAMENTA,
      description:
        'Abre o painel da bancada na aba Testes (relatorio dos cenarios da Ana por capacidade: rodadas, classe, regressao, buracos de cobertura) e devolve os totais. Use na skill /testes em vez de colar o relatorio no chat.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    })
    try {
      await $.command.register({
        name: 'painel',
        description: 'Bancada ao vivo: abre o painel da bateria; "rodar <args do e2e.py>" roda uma rodada; "parar" encerra',
        argumentHint: '[testes | rodar <args> | parar]',
      })
    } catch (err) {
      // nao pode ser /painel: esse nome e da skill do ritual, e o motor recusa o comando
      $.ui.log(`Bancada: comando /painel nao registrado (${String(err)}); a ferramenta e o painel seguem ativos`)
    }
    const started = await next(e)
    void $.clock.every(1000, () => {
      void vigiar($)
    })
    void vigiar($)
    return started
  })

  on('tool.call', { tool: 'mcp__bancada__abrir_testes' }, async $ => {
    const aberto = await abrirTestes($)
    const r = await read($, relatorio)
    const painel = aberto.isPlaced ? 'Painel aberto.' : `Painel NAO desenhado: ${aberto.reason ?? 'sem motivo informado'}.`
    return { result: `${painel} ${r ? resumoRelatorio(r) : 'Nao consegui gerar o relatorio (python3 ana/bancada/relatorio.py --json falhou).'}` }
  })

  on('command.run', { command: 'painel' }, async ($, e) => {
    const [verbo, ...resto] = e.args.trim().split(/\s+/).filter(Boolean)
    if (verbo === 'parar') {
      if (!rodando) return { text: 'Bancada: nenhuma rodada iniciada por aqui esta rodando.' }
      const comando = rodando.comando
      rodando.parar()
      rodando = null
      return { text: `Bancada: parei "${comando}".` }
    }
    if (verbo === 'rodar') {
      if (rodando) return { text: `Bancada: ja tem uma rodada em curso ("${rodando.comando}"). Use /painel parar antes.` }
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
      return { text: `Bancada: rodando "${comando}". O painel segue a rodada; /painel parar encerra.` }
    }
    if (verbo === 'testes') {
      await abrirTestes($)
      const r = await read($, relatorio)
      return { text: r ? `Bancada: mesa de testes aberta. ${resumoRelatorio(r)}` : 'Bancada: mesa de testes aberta, mas o relatorio nao gerou.' }
    }
    if (verbo) return { text: 'Bancada: uso /painel, /painel testes, /painel rodar <args do e2e.py> ou /painel parar.' }
    await update($, visao, x => ({ ...x, aba: 'bateria' as const }))
    await $.ui.open({ id: PANE, title: TITULO, focus: true })
    return { text: 'Bancada: painel aberto. Clique numa linha (categoria, capacidade ou cenario) para ver o detalhe. Teclas: b/t trocam de aba; j/k navegar, f seguir, x so falhas, u/d rolar; na mesa de testes p so problemas, a raia, h buracos, r atualizar. Esc volta ao prompt.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e)
    const b = await read($, bancada)
    const v = await read($, visao)
    const agoraMs = (await read($, agora)) || Date.now()
    // no dock (tela cheia), o painel e uma coluna a direita: mede o corpo dele, nao o terminal
    const colunas = e.props.bodyColumns || e.viewport?.columns || 120
    const linhas = Math.max(8, (e.props.placement === 'dock' && e.props.scroll?.bodyRows) || (e.viewport?.rows ?? 30) - 1)
    const abas = (
      <Box flexDirection="row" gap={2}>
        <Button key="aba-bateria" plain hotkey="b" onPress={() => update($, visao, x => ({ ...x, aba: 'bateria' as const }))}>
          <Text bold backgroundColor={v.aba === 'bateria' ? PAL.azul : undefined} color={v.aba === 'bateria' ? 'black' : PAL.cinza}> b Bateria </Text>
        </Button>
        <Button key="aba-testes" plain hotkey="t" onPress={() => update($, visao, x => ({ ...x, aba: 'testes' as const }))}>
          <Text bold backgroundColor={v.aba === 'testes' ? PAL.ciano : undefined} color={v.aba === 'testes' ? 'black' : PAL.cinza}> t Testes </Text>
        </Button>
      </Box>
    )

    if (v.aba === 'testes') {
      const rel = await read($, relatorio)
      const largura = Math.max(60, e.props.bodyColumns || colunas)
      const corpo = Math.max(6, linhas - 7)
      const larguraLista = Math.min(64, Math.max(34, Math.floor(largura * 0.46)))
      const larguraDetalhe = Math.max(24, largura - larguraLista - 3)
      const n = rel ? contar(rel) : null
      const todas = rel ? linhasTestes(rel, v) : []
      const sel = selecionada(todas, v.itemTestes)
      const chaveSel = sel ? chave(sel) : null
      const raias = rel?.raias ?? []
      const rotuloRaia = raias.find(r => r.id === v.raia)?.rotulo ?? null
      const nBuracos = rel ? rel.buracos.capacidades_sem_cenario.length + rel.buracos.nos_sem_cenario.reduce((a, g) => a + g.nos.length, 0) : 0

      // a lista: janela de `corpo` linhas em volta do cursor
      const idx = Math.max(0, todas.findIndex(l => chave(l) === chaveSel))
      const inicio = Math.max(0, Math.min(idx - Math.floor(corpo / 2), todas.length - corpo))
      const visiveis = todas.slice(inicio, inicio + corpo)
      const larguraTitulo = Math.max(10, larguraLista - 24)
      const selecionar = (k: string | null) => update($, visao, x => ({ ...x, itemTestes: k, rolagemTestes: 0 }))
      const andar = (passo: number) => selecionar(moverCursor(todas, v.itemTestes, passo))
      const rolarT = (passo: number) => update($, visao, x => ({ ...x, rolagemTestes: Math.max(0, x.rolagemTestes + passo) }))
      const proximaRaia = () =>
        update($, visao, x => {
          const i = raias.findIndex(r => r.id === x.raia)
          const prox = raias[i + 1]
          return { ...x, raia: i < 0 ? (raias[0]?.id ?? null) : prox ? prox.id : null, itemTestes: null, rolagemTestes: 0 }
        })

      // o detalhe: o que esta sob o cursor, ou os buracos
      const detalhe: { t: string; cor?: string; dim?: boolean; bold?: boolean }[] = []
      let corMoldura: string = PAL.ciano
      if (!rel) {
        detalhe.push({ t: 'Relatorio ainda nao gerado. Tecle r.', dim: true })
      } else if (v.soBuracos) {
        corMoldura = PAL.roxo
        const b = rel.buracos
        // de onde vem cada buraco: a cor e a etiqueta [de quem] vem da origem derivada pelo relatorio
        const corOrigem: Record<string, string> = { gh: PAL.laranja, planejado: PAL.roxo, manual: PAL.amarelo, escrever: PAL.ciano }
        const deQuem = (k: string) => b.origens.find(o => o.chave === k)?.de_quem ?? k
        detalhe.push({ t: 'BURACOS DE COBERTURA: DE ONDE VEM CADA UM', bold: true, cor: PAL.roxo })
        for (const o of b.origens) {
          const n = b.por_origem[o.chave] ?? { capacidades: 0, nos: 0 }
          detalhe.push({ t: `● ${o.rotulo}  [${o.de_quem}]  ${n.capacidades} capacidade(s), ${n.nos} no(s)`, bold: true, cor: corOrigem[o.chave] })
          for (const l of quebrar(`  ${o.descricao}`, larguraDetalhe)) detalhe.push({ t: l, dim: true })
        }
        detalhe.push({ t: '' })
        detalhe.push({ t: `Capacidades sem cenario executavel (${b.capacidades.length} de ${b.total_capacidades}):`, bold: true })
        for (const c of b.capacidades) {
          detalhe.push({ t: `  ${c.id}  ${c.titulo}  [${deQuem(c.origem)}]`, bold: true, cor: corOrigem[c.origem] })
          for (const l of quebrar(`    ${c.porque || '(sem porque no comparativo)'}`, larguraDetalhe)) detalhe.push({ t: l, dim: true })
        }
        if (b.desvio_gh.length) {
          detalhe.push({ t: '' })
          detalhe.push({ t: `Passam so pelo desvio, a GH responde vazio e a Ana encaminha (${b.desvio_gh.length}):`, bold: true, cor: PAL.laranja })
          for (const d of b.desvio_gh) {
            detalhe.push({ t: `  ${d.id}  ${d.titulo}  [terceiros]`, bold: true, cor: PAL.laranja })
            for (const l of quebrar(`    ${d.porque}`, larguraDetalhe)) detalhe.push({ t: l, dim: true })
          }
        }
        const grupos = b.nos_sem_cenario.filter(g => !v.raia || g.raia === v.raia)
        detalhe.push({ t: '' })
        detalhe.push({ t: `Nos do SOP sem cenario (${grupos.reduce((a, g) => a + g.nos.length, 0)}${v.raia ? ' na raia' : ` de ${b.total_nos}`}):`, bold: true })
        for (const g of grupos) {
          detalhe.push({ t: `  ${g.rotulo}`, bold: true, cor: PAL.ciano })
          for (const no of g.nos) for (const l of quebrar(`    ${no.id}  ${no.titulo}  [${deQuem(no.origem)}]`, larguraDetalhe)) detalhe.push({ t: l, cor: corOrigem[no.origem] ?? PAL.amarelo })
        }
      } else if (!sel) {
        detalhe.push({ t: 'Nada sob o cursor. Clique numa linha ou tecle j ou k.', dim: true })
      } else if (sel.tipo === 'bloco') {
        // a categoria: o porque, a fatia do SOP, o que funciona, o que depende da GH, o custo
        const bl = sel.bloco
        corMoldura = PAL.ciano
        detalhe.push({ t: `▣ ${bl.nome.toUpperCase()}`, bold: true, cor: PAL.ciano })
        for (const l of quebrar(bl.resumo || 'sem resumo no comparativo', larguraDetalhe)) detalhe.push({ t: l })
        detalhe.push({ t: '' })
        detalhe.push({ t: `fatia da Ana: ${pct(bl.fatia_sop)} dos nos do SOP, ${bl.capacidades_total} capacidade(s)`, bold: true })
        detalhe.push({ t: `funcionam: ${bl.funcionam}`, cor: PAL.verde })
        detalhe.push({ t: `nao funcionam: ${bl.nao_funcionam}`, cor: bl.nao_funcionam ? PAL.vermelho : undefined })
        detalhe.push({ t: `sem cenario: ${bl.sem_cenario}`, cor: bl.sem_cenario ? PAL.roxo : undefined })
        detalhe.push({ t: `dependem da Global Health: ${bl.dependem_gh}`, cor: bl.dependem_gh ? PAL.laranja : undefined })
        detalhe.push({ t: `custo medio por conversa: ${custoTexto(bl.custo_medio)}` })
        detalhe.push({ t: '' })
        for (const c of bl.capacidades) {
          const marcaCap = c.funciona === null ? '○' : c.funciona ? '●' : '●'
          const corCap = c.funciona === null ? PAL.roxo : c.funciona ? PAL.verde : PAL.vermelho
          detalhe.push({ t: `${marcaCap} ${c.id}  ${c.titulo}${c.depende_gh ? '  [GH]' : ''}`, bold: true, cor: corCap })
          for (const l of quebrar(`    ${c.faz || '(sem resumo)'}`, larguraDetalhe)) detalhe.push({ t: l, dim: true })
        }
      } else if (sel.tipo === 'capacidade') {
        const c = sel.cap
        corMoldura = c.funciona === null ? PAL.roxo : c.funciona ? PAL.verde : PAL.vermelho
        detalhe.push({ t: `${c.funciona === null ? '◌' : '●'} ${c.id}  ${c.titulo}`, bold: true, cor: corMoldura })
        if (c.estado) detalhe.push({ t: `estado no comparativo: ${c.estado}`, dim: true })
        detalhe.push({ t: '' })
        for (const l of quebrar(c.faz || 'sem resumo no comparativo', larguraDetalhe)) detalhe.push({ t: l })
        if (c.falta) for (const l of quebrar(`falta: ${c.falta}`, larguraDetalhe)) detalhe.push({ t: l, cor: PAL.laranja })
        detalhe.push({ t: '' })
        detalhe.push({ t: `fatia da Ana: ${pct(c.fatia_sop)} dos nos do SOP`, bold: true })
        detalhe.push({ t: `funciona: ${c.funciona === null ? 'sem cenario executavel' : c.funciona ? 'sim, todo cenario passa' : 'nao, algum cenario falha'}`, cor: corMoldura })
        detalhe.push({ t: `depende da Global Health: ${c.depende_gh ? 'sim' : 'nao'}`, cor: c.depende_gh ? PAL.laranja : undefined })
        for (const l of quebrar(`ferramentas: ${c.tools_texto || 'nenhuma'}`, larguraDetalhe)) detalhe.push({ t: l, dim: true })
        detalhe.push({ t: `custo medio por conversa: ${custoTexto(c.custo_medio)}` })
        detalhe.push({ t: '' })
        if (sel.vazia) {
          for (const l of quebrar('Esta capacidade nao tem nenhum cenario executavel: e um buraco de cobertura. Peca um cenario no prompt.', larguraDetalhe)) detalhe.push({ t: l, cor: PAL.roxo })
        } else {
          for (const i of c.cenarios) {
            detalhe.push({ t: `${marcaDaClasse[i.classe]} ${i.id}  ${i.titulo}  ${i.classe}${i.custo ? `  ${brl(i.custo.meta_brl)} + ${usd(i.custo.openai_usd)}` : ''}`, cor: corDaClasse[i.classe] })
          }
        }
      } else {
        const i = sel.item
        corMoldura = i.mudanca === 'regrediu' ? PAL.vermelho : corDaClasse[i.classe]
        detalhe.push({ t: `${marcaDaClasse[i.classe]} ${i.id}  ${i.titulo}`, bold: true, cor: corMoldura })
        detalhe.push({ t: `capacidade ${sel.cap.id}  ${sel.cap.titulo}${sel.cap.estado ? `  (${sel.cap.estado})` : ''}`, dim: true })
        detalhe.push({ t: '' })
        detalhe.push({ t: `classe: ${i.classe}${i.mudanca ? `, ${i.mudanca} contra ${rel.anterior ?? 'a bateria anterior'}` : ''}`, cor: corMoldura, bold: true })
        if (i.manual) detalhe.push({ t: 'cenario manual: nao roda na bancada', cor: PAL.cinza })
        else detalhe.push({ t: `rodadas: ${i.rodadas.map((r, k) => `${k + 1} ${palavraRodada(r)}`).join('   ') || 'nenhuma'}` })
        if (i.escrita) detalhe.push({ t: 'so roda com --com-escrita (mexe no Chatwoot)', cor: PAL.laranja })
        detalhe.push({ t: '' })
        const nomesRaias = i.raias.map(id => raias.find(r => r.id === id)?.rotulo ?? id)
        for (const l of quebrar(`raias: ${nomesRaias.join(', ') || '-'}`, larguraDetalhe)) detalhe.push({ t: l })
        for (const l of quebrar(`nos do SOP: ${i.nos.join(', ') || '-'}`, larguraDetalhe)) detalhe.push({ t: l })
        for (const l of quebrar(`tools esperadas: ${i.tools.join(', ') || 'nenhuma'}`, larguraDetalhe)) detalhe.push({ t: l })
        detalhe.push({ t: `fatia da Ana: ${pct(i.fatia_sop)} dos nos do SOP${i.depende_gh ? '   depende da Global Health' : ''}`, cor: i.depende_gh ? PAL.laranja : undefined })
        detalhe.push({ t: '' })
        detalhe.push({ t: `custo da conversa: ${custoTexto(i.custo)}`, bold: Boolean(i.custo) })
        if (i.custo) detalhe.push({ t: `  modelo ${i.custo.modelo ?? '?'}${i.custo.chamadas ? `, ${i.custo.chamadas} chamada(s) ao modelo` : ''}`, dim: true })
        if (i.alerta_mensagens) detalhe.push({ t: `  ATENCAO: mais de ${rel.teto_mensagens_ana} mensagens da Ana (cada uma e cobrada pela Meta)`, cor: PAL.laranja, bold: true })
        detalhe.push({ t: '' })
        detalhe.push({ t: `conversa gravada: ana/bancada/conversas/${i.id}.json`, dim: true })
      }
      const alturaDetalhe = Math.max(3, corpo - 3)
      const rolagem = Math.min(v.rolagemTestes, Math.max(0, detalhe.length - alturaDetalhe))
      const recorte = detalhe.slice(rolagem, rolagem + alturaDetalhe)

      return (
        <Box flexDirection="column" paddingX={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Box flexDirection="row" gap={1}>
              <Text backgroundColor={PAL.ciano} color="black" bold> ANA </Text>
              <Text bold>Mesa de testes</Text>
              {rel ? (
                <Text dimColor>
                  bateria {rel.bateria ?? 'nenhuma'} · {rel.rodadas.length} rodada(s){rel.anterior ? ` · regressao contra ${rel.anterior}` : ''}
                </Text>
              ) : null}
            </Box>
            {abas}
          </Box>
          <Box flexDirection="row" gap={1}>
            {n ? (
              <Box flexDirection="row" gap={1}>
                <Text backgroundColor={PAL.verde} color="black"> {n.passa} passam </Text>
                <Text backgroundColor={PAL.amarelo} color="black"> {n.intermitente} intermitentes </Text>
                <Text backgroundColor={PAL.vermelho} color="black"> {n.constante} constantes </Text>
                <Text backgroundColor={PAL.cinza} color="black"> {n['sem dado']} sem dado </Text>
                <Text backgroundColor={PAL.cinza} color="black"> {n.manual} manuais </Text>
                <Text backgroundColor={PAL.roxo} color="black"> {nBuracos} buracos </Text>
              </Box>
            ) : null}
            {v.soProblemas ? <Text color={PAL.laranja}>[so problemas]</Text> : null}
            {rotuloRaia ? <Text color={PAL.laranja}>[raia: {rotuloRaia}]</Text> : null}
            {v.soBuracos ? <Text color={PAL.roxo}>[buracos]</Text> : null}
          </Box>
          {rel ? (
            <Box flexDirection="row" gap={1}>
              <Text dimColor>custo medio por conversa:</Text>
              <Text bold>{custoTexto(rel.custo_medio)}</Text>
              {rel.custo_medio.medidos ? <Text dimColor>({rel.custo_medio.medidos} medida(s))</Text> : <Text color={PAL.cinza}>(rode uma bateria para medir)</Text>}
              {rel.precos?.vencido ? <Text color={PAL.laranja}>precos de {rel.precos.conferido_em ?? '?'}: conferir ana/bancada/precos.json</Text> : null}
            </Box>
          ) : null}
          <Box flexDirection="row" gap={1}>
            <Box flexDirection="column" width={larguraLista} borderStyle="round" borderColor={PAL.ciano} paddingX={1}>
              {visiveis.length === 0 && <Text dimColor>{rel ? 'nada com esses filtros' : 'sem relatorio'}</Text>}
              {visiveis.map((l, k) => {
                if (l.tipo === 'bloco') {
                  const k2 = chave(l)
                  return (
                    <Button key={`b:${k2}`} plain onPress={() => selecionar(k2)}>
                      <Text color={PAL.ciano} bold inverse={chaveSel === k2}>
                        {l.bloco.nome.toUpperCase()}
                      </Text>
                      <Text dimColor>  {pct(l.bloco.fatia_sop)} do SOP</Text>
                    </Button>
                  )
                }
                if (l.tipo === 'capacidade' && !l.vazia) {
                  const corCap = l.cap.funciona ? PAL.verde : l.cap.funciona === false ? PAL.vermelho : undefined
                  return (
                    <Button key={`c:${l.cap.id}`} plain onPress={() => selecionar(l.cap.id)}>
                      <Text bold inverse={chaveSel === l.cap.id}>
                        <Text color={corCap}>●</Text> {l.cap.id} {l.cap.titulo.slice(0, larguraTitulo + 4)}
                      </Text>
                      {l.cap.depende_gh ? <Text color={PAL.laranja}>  GH</Text> : null}
                      {l.cap.estado ? <Text dimColor>  {l.cap.estado}</Text> : null}
                    </Button>
                  )
                }
                if (l.tipo === 'capacidade')
                  return (
                    <Button key={`v:${l.cap.id}`} plain onPress={() => selecionar(l.cap.id)}>
                      <Text color={PAL.roxo} inverse={chaveSel === l.cap.id} bold={chaveSel === l.cap.id}>
                        {' ◌ '}{l.cap.id.padEnd(6)} {l.cap.titulo.slice(0, larguraTitulo).padEnd(larguraTitulo)}  sem cenario
                      </Text>
                      {l.cap.depende_gh ? <Text color={PAL.laranja}>  GH</Text> : null}
                    </Button>
                  )
                const i = l.item
                const ativo = chaveSel === i.id
                const corLinha = i.mudanca === 'regrediu' ? PAL.vermelho : i.mudanca === 'melhorou' ? PAL.verde : corDaClasse[i.classe]
                return (
                  <Button key={`i:${i.id}`} plain onPress={() => selecionar(i.id)}>
                    <Text color={corLinha} inverse={ativo} bold={ativo}>
                      {' '}{marcaDaClasse[i.classe]} {i.id.padEnd(6)} {i.titulo.slice(0, larguraTitulo).padEnd(larguraTitulo)}{' '}
                    </Text>
                    {i.manual ? (
                      <Text color={PAL.cinza}>manual</Text>
                    ) : (
                      i.rodadas.map((r, k2) => (
                        <Text key={`r:${i.id}:${k2}`} color={corDaRodada(r)}>{r === 'passou' ? '●' : r === 'falhou' ? '✖' : r === 'erro' ? '!' : '·'}</Text>
                      ))
                    )}
                    {i.mudanca ? <Text color={i.mudanca === 'regrediu' ? PAL.vermelho : PAL.verde} bold> {i.mudanca}</Text> : null}
                    {i.alerta_mensagens ? <Text color={PAL.laranja} bold> {'>'}{rel?.teto_mensagens_ana ?? 8} msg</Text> : null}
                  </Button>
                )
              })}
              {todas.length > corpo ? <Text dimColor>{inicio + 1} a {Math.min(todas.length, inicio + corpo)} de {todas.length}</Text> : null}
            </Box>
            <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={corMoldura} paddingX={1}>
              {recorte.map((l, k) => (
                <Text key={`d:${rolagem + k}`} color={l.cor} dimColor={l.dim} bold={l.bold} wrap="truncate">{l.t || ' '}</Text>
              ))}
              {detalhe.length > alturaDetalhe ? <Text dimColor>linhas {rolagem + 1} a {Math.min(detalhe.length, rolagem + alturaDetalhe)} de {detalhe.length}  (u/d rolam)</Text> : null}
            </Box>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Button plain hotkey="j" onPress={() => andar(1)}>j baixo</Button>
            <Button plain hotkey="k" onPress={() => andar(-1)}>k cima</Button>
            <Button plain hotkey="p" onPress={() => update($, visao, x => ({ ...x, soProblemas: !x.soProblemas, itemTestes: null, rolagemTestes: 0 }))}>{v.soProblemas ? 'p todos' : 'p so problemas'}</Button>
            <Button plain hotkey="a" onPress={proximaRaia}>a raia</Button>
            <Button plain hotkey="h" onPress={() => update($, visao, x => ({ ...x, soBuracos: !x.soBuracos, rolagemTestes: 0 }))}>{v.soBuracos ? 'h detalhe' : 'h buracos'}</Button>
            <Button plain hotkey="d" onPress={() => rolarT(Math.max(1, alturaDetalhe - 2))}>d rolar</Button>
            <Button plain hotkey="u" onPress={() => rolarT(-Math.max(1, alturaDetalhe - 2))}>u rolar</Button>
            <Button plain hotkey="r" onPress={() => void atualizarRelatorio($)}>r atualizar</Button>
          </Box>
        </Box>
      )
    }

    if (!b) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text bold>{TITULO}</Text>
          <Text dimColor>Nenhuma bateria encontrada. Rode /painel rodar --so C02-1 ou python3 {E2E} {CENARIOS_PADRAO}.</Text>
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
      if (c.custo) texto.push({ t: `custo: ${custoTexto(c.custo)}${c.custo.modelo ? ` (${c.custo.modelo})` : ''}`, dim: true })
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
    // seguindo (nada clicado) e com o cenario ainda rodando, a janela gruda no fim: a mensagem
    // nova aparece na hora; clicado, le do comeco e rola com u/d
    const seguindo = !v.selecionado && selecionado?.estado === 'rodando'
    const rolagem = seguindo ? Math.max(0, texto.length - corpo) : Math.min(v.rolagem, Math.max(0, texto.length - corpo))
    const recorte = texto.slice(rolagem, rolagem + corpo)

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>{TITULO}  <Text dimColor>{rotulo}</Text></Text>
          <Text>{andamento}  <Text dimColor>{placar}</Text>{rodando ? <Text color="cyan">  (rodando por aqui)</Text> : null}</Text>
          {abas}
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
      void atualizarRelatorio($)
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

/** Roda relatorio.py --json e guarda o resultado; null se o script falhou. */
async function atualizarRelatorio($: Engine): Promise<Relatorio | null> {
  try {
    const { exitCode, stdout, stderr } = await $.process.run(['python3', RELATORIO, '--json'], { timeoutMs: 60000 })
    if (exitCode !== 0) {
      $.ui.log(`bancada: relatorio.py saiu com ${exitCode}: ${stderr.trim().slice(0, 300)}`, { to: 'debug' })
      return null
    }
    const r = { ...(JSON.parse(stdout) as Omit<Relatorio, 'geradoEm'>), geradoEm: Date.now() }
    await update($, relatorio, () => r)
    return r
  } catch (err) {
    $.ui.log(`bancada: relatorio.py nao rodou: ${String(err)}`, { to: 'debug' })
    return null
  }
}

/** Abre a mesa de testes com o teclado (sempre a pedido: comando ou ferramenta). */
async function abrirTestes($: Engine) {
  await atualizarRelatorio($)
  await update($, visao, x => ({ ...x, aba: 'testes' as const, rolagemTestes: 0 }))
  const aberto = await $.ui.open({ id: PANE, title: TITULO, focus: true })
  if (!aberto.isPlaced) $.ui.toast('Bancada: alargue o terminal (ou use /painel testes) para ver a mesa de testes')
  return aberto
}

function itens(r: Relatorio): ItemRelatorio[] {
  return r.blocos.flatMap(b => b.capacidades.flatMap(c => c.cenarios))
}

export function resumoRelatorio(r: Relatorio): string {
  const n = contar(r)
  const regrediram = itens(r).filter(i => i.mudanca === 'regrediu').map(i => i.id)
  const problemas = itens(r).filter(i => i.classe === 'intermitente' || i.classe === 'constante').map(i => `${i.id} (${i.classe})`)
  return (
    `Bateria ${r.bateria ?? 'nenhuma'} (${r.rodadas.length} rodada(s))${r.anterior ? `, anterior ${r.anterior}` : ''}: ` +
    `${n.passa} passam, ${n.intermitente} intermitentes, ${n.constante} constantes, ${n['sem dado']} sem dado, ${n.manual} manuais. ` +
    (problemas.length ? `Problemas: ${problemas.join(', ')}. ` : '') +
    (regrediram.length ? `Regrediram: ${regrediram.join(', ')}. ` : '') +
    `Buracos: ${r.buracos.capacidades_sem_cenario.length} de ${r.buracos.total_capacidades} capacidades sem cenario executavel (${r.buracos.capacidades_sem_cenario.join(', ')}); ` +
    `${r.buracos.nos_sem_cenario.reduce((a, x) => a + x.nos.length, 0)} de ${r.buracos.total_nos} nos do SOP sem cenario. ` +
    `De onde vem: ${r.buracos.origens.map(o => `${o.rotulo} [${o.de_quem}] ${r.buracos.por_origem[o.chave]?.capacidades ?? 0} cap + ${r.buracos.por_origem[o.chave]?.nos ?? 0} nos`).join('; ')}. ` +
    (r.buracos.desvio_gh.length ? `Passam so pelo desvio da GH: ${r.buracos.desvio_gh.map(d => d.id).join(', ')}. ` : '') +
    `Custo medio por conversa: ${custoTexto(r.custo_medio)}${r.custo_medio.medidos ? ` (${r.custo_medio.medidos} medida(s))` : ''}.` +
    (r.precos?.vencido ? ` Precos de ${r.precos.conferido_em ?? '?'}: conferir ana/bancada/precos.json.` : '')
  )
}
