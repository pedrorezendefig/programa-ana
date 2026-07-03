---
status: superseded
superseded-by: 0002-consolidacao-contrato-unico
date: 2026-06-15
---

# Dois contratos autônomos com Anexo de Proteção de Dados (DPA) compartilhado

> **Substituída pelo [ADR-0002](0002-consolidacao-contrato-unico.md) (2026-06-29):** a decisão de dois contratos foi revista; tudo passou a um contrato único de Serviços Contínuos, com a Ana como Entregável.

Os serviços da VITTA TECH para o cliente de saúde foram divididos em **dois contratos autônomos**, o **Contrato de Serviços Contínuos** (App de Reuniões, Site e sua gestão) e o **Contrato Ana** (agentes de IA conversacional), em vez de um contrato único ("Patamares") ou de um guarda-chuva com anexos de escopo. O **Anexo de Proteção de Dados (DPA/LGPD)**, peça mais pesada e idêntica nos dois, é um documento único, assinado uma vez e referenciado por ambos. Cada contrato nasce com seu valor (Serviços Contínuos R$ 5.000, Ana R$ 0) e cresce pela soma dos **Anexos de Entregável** aceitos.

## Opções consideradas

- **Contrato único (status quo):** modelo de "Patamares" de 5k a 9k. Acoplava tudo: a Ana (frente incerta, dependente de homologação da API MV e da política da Meta para WhatsApp) não podia ser pausada sem mexer na receita firme do App de Reuniões.
- **Guarda-chuva + anexos de escopo (MSA + SOWs):** mais enxuto no total, mas é juridicamente um único instrumento; conflita com o objetivo de ter dois contratos separáveis e acopla as duas frentes.
- **Dois contratos 100% completos:** cada um com seu próprio DPA; duplica cerca de 70% do texto jurídico e dobra o custo de revisão por advogado.

## Consequências

- A Ana pode ser pausada ou encerrada sem afetar os R$ 5.000/mês dos Serviços Contínuos.
- Novos agentes da família Ana (ex.: **Retell**, voz por ligação) entram como **Anexo de Entregável** do Contrato Ana, sem contrato novo. Por isso o **objeto do Contrato Ana é redigido de forma ampla** ("agentes de IA conversacional"), não restrito ao agente atual.
- O DPA é redigido como documento standalone, com um único ponto de atualização quando entra novo subprocessador (ex.: Retell).
- Cláusulas gerais menores (PI, sigilo, limitação de responsabilidade) ainda aparecem nos dois contratos, em forma condensada.
