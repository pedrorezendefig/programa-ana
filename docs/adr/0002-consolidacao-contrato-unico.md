---
status: accepted
date: 2026-06-29
supersedes: 0001
---

# Consolidação em um contrato único de Serviços Contínuos

A divisão em **dois contratos autônomos** decidida no ADR-0001 (Serviços Contínuos + Contrato Ana, com DPA compartilhado) foi **revista**. Os serviços para o cliente de saúde passam a viver em **um único Contrato de Serviços Contínuos**, cuja mensalidade é a **soma dos Entregáveis aceitos e em operação**: Aplicativo do hospital (R$ 5.000), Site e Central de Comando (+R$ 1.000), Ana no WhatsApp (+R$ 2.000) e Meta de desempenho da Ana (+R$ 1.000), até R$ 9.000/mês. A Ana deixa de ser contrato separado e passa a ser um conjunto de Entregáveis.

## Contexto

O ADR-0001 separou a Ana para que ela pudesse ser pausada sem afetar a receita firme do Aplicativo do hospital. Na prática, o **modelo de soma de Entregáveis** (Cláusula 3 mais Termo de Entregável) já entrega esse isolamento: cada entrega só passa a incidir quando aceita e em operação, e pode ser ligada ou desligada por Termo de Entregável, sem mexer no restante. O custo de manter dois instrumentos (duas assinaturas, dois faturamentos, cláusulas gerais duplicadas) deixou de se justificar para um único cliente.

## Opções consideradas

- **Dois contratos (ADR-0001):** isolamento jurídico maior, porém duas assinaturas, dois faturamentos e duplicação das cláusulas gerais, para um só cliente.
- **Um contrato único com Entregáveis modulares (escolhida):** uma assinatura, um faturamento e a flexibilidade de ligar ou desligar entregas via Termo de Entregável. A escada de valor (R$ 5k até 9k) comunica a evolução ao cliente num único documento, aumentando a percepção de valor.

## Consequências

- A Ana é Entregável do Contrato de Serviços Contínuos, não contrato próprio. Novos agentes (ex.: Retell) entram como novos Anexos de Entregável do mesmo contrato.
- A LGPD fica condensada na Cláusula 8 do contrato; um DPA standalone mais detalhado é opção para quando a Ana entrar em operação com dados sensíveis de saúde.
- O conceito de "Contrato Ana" e a estrutura de dois contratos saem do vocabulário (ver CONTEXT.md).
- Preserva-se o que o ADR-0001 trouxe de bom: objeto amplo, Termo de Entregável que dispensa aditivo, e a possibilidade de pausar a Ana (agora encerrando o Entregável, não o contrato).
