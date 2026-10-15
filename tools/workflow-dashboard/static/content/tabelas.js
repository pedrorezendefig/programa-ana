'use strict';

/* Curadoria funcional das tabelas do banco: alimenta o popover do Mapa da app.
   Uma linha por tabela dizendo O QUE ela guarda em linguagem de negócio, mais
   notas opcionais por coluna importante. Tabela nova sem verbete aparece no
   popover só com os dados técnicos (o painel avisa discreto que falta verbete).
   A Ana não tem banco próprio: as tabelas são do Oracle do MV do hospital
   (owner DBAMV, base TST, só leitura), as já estudadas em
   ana/api-mv/dicionario-colunas.md. Fonte do vocabulário: CONTEXT.md e esse
   dicionário. */

export const TABELAS = {
  ESCALA_CENTRAL: { resumo: 'O molde semanal da agenda: dia da semana, horário, capacidade, prestador e setor.' },
  ESCALA_CENTRAL_ITEM_AGENDA: { resumo: 'Quais itens cada escala aceita marcar, com o máximo por item (liga escala e item).' },
  ITEM_AGENDAMENTO: { resumo: 'O catálogo do que se agenda: consulta, exame de imagem ou de laboratório, com duração e preparo.' },
  EXA_RX: { resumo: 'Os exames de imagem, com o texto de preparo que a Ana pode repassar e o prazo do laudo.' },
  GERACAO_AGENDA: { resumo: 'O job que transforma a escala em agendas datadas para um período.' },
  AGENDA_CENTRAL: { resumo: 'A agenda de um dia de um prestador: capacidade, marcados e quando fica liberada.' },
  IT_AGENDA_CENTRAL: {
    resumo: 'O horário (slot) de uma agenda: livre sem paciente, marcado com paciente, item e convênio.',
    colunas: {
      CD_PACIENTE: 'nulo = horário livre; preenchido = marcado',
      TP_SITUACAO: 'M marcado, A aguardando, E atendido, C cancelado',
      TP_PRESENCA_FALTA: 'P presença ou F falta (o no-show)',
    },
  },
  PACIENTE: { resumo: 'O cadastro do paciente no MV: nome, nascimento, documento e contato.' },
  ATENDIME: { resumo: 'O atendimento que nasce quando o paciente comparece, com a alta e o desfecho.' },
  MOT_ALT: { resumo: 'O catálogo de motivos de alta (alta, permanência, transferência, óbito).' },
  PACIENTE_OBITO: { resumo: 'A fila de processamento de óbito do MV, o terceiro sinal de desfecho.' },
  ATENDIME_GLOBAL_HEALTH: { resumo: 'A tabela de interface da Global Health, desnormalizada e sem FK; vazia na base TST.' },
};
