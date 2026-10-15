---
status: accepted
date: 2026-07-30
amended_by: 0015
---

# A fonte de dados editável da Ana sai do Google Sheets e vira NocoDB self-hosted (Base Ana)

Os valores de consultas, exames, estimativas de cirurgias e a cobertura de convênios que a Ana usa passam a morar num **NocoDB** rodando no Coolify da VPS (serviço `nocodb-base-ana`, base "Base Ana", 4 tabelas). O usuário de negócio edita numa interface de planilha na web; a Ana lê por **tools HTTP sobre shared views públicas somente leitura** (HTTPS com Let's Encrypt); a edição vale na resposta seguinte, sem redeploy. O Google Sheets deixa de ser fonte: as planilhas originais viram legado (xlsx brutos, incluindo os logs com dado pessoal, guardados em `dados-locais/`, fora do git; snapshot sem dado pessoal em `ana/base-conhecimento/`).

## Contexto

- O plano original (grilling da manhã de 30/jul/2026) era manter o Google Sheets e ler as 4 abas publicadas em CSV. Na execução, dois atritos mataram a ideia: o fluxo de publicação/compartilhamento do Google é cheio de passos manuais na conta dona, e o compartilhamento por link da planilha consolidada **expôs a aba `6_Ouvidoria_Log` (nome + CPF de pacientes)**, incidente corrigido na hora restringindo a planilha.
- O Pedro pediu alternativas em que ele deposita os dados e a sessão faz o resto, com um requisito essencial: uma tela onde o usuário de negócio edite os dados no futuro, e a possibilidade de migrar para banco "de verdade" depois.
- Medição real da VPS (KVM 4, 16 GB): ~10,4 GB usados, ~5,7 GB livres; o container do NocoDB custa ~0,3 a 0,5 GB.

## Opções consideradas

| Opção | Veredito |
|---|---|
| Google Sheets publicado em CSV (plano original) | Abandonada: fricção manual alta e risco LGPD demonstrado na prática |
| Supabase novo (gerenciado, gratuito) | Descartada: edição de negócio cairia no Studio (ferramenta de dev) |
| Tabelas no Supabase self-hosted do Hospital Reuniões | Descartada: acopla a Ana ao banco de produção de outro sistema |
| Módulo CRUD no app Hospital Reuniões | Adiada: melhor destino final possível, mas é projeto, não sandbox |
| **NocoDB no Coolify** | **Escolhida**: sandbox imediato que já entrega a tela de edição do negócio, API para a Ana e Postgres/export para migração futura |

## Consequências

- A leitura da Ana não usa segredo nenhum: shared views são somente leitura por construção e só existem para as 4 tabelas sem dado pessoal. Escrita exige login no NocoDB.
- O executor HTTP do fazer.ai agents só aceita HTTPS; o serviço ganhou router Traefik com certificado Let's Encrypt no domínio sslip.io (labels custom no compose do serviço). Um domínio próprio (ex.: `dados.hospitalsaomatheus.cloud`, DNS na Cloudflare) fica como melhoria opcional.
- O prompt do agente ganhou a seção "Tabelas Oficiais" com precedência sobre a `search_knowledge` para valores e cobertura; a KB continua para o restante (lista geral de convênios, institucional).
- Os logs operacionais do n8n (Reclamações, Agendamentos Convênio, Avaliações) NÃO foram importados: na plataforma nova esses registros acontecem por outros mecanismos (ex.: ouvidoria via `private_note`); os arquivos ficam em `dados-locais/` como histórico.
- Migração futura é export/import trivial (ou apontar o NocoDB para um Postgres), inclusive para dentro do app Hospital Reuniões se um dia fizer sentido.
