export const statusLabel = (value) =>
  ({
    aberta: 'Aguardando ajuda',
    em_atendimento: 'Em atendimento',
    finalizada: 'Concluído',
    cancelada: 'Cancelado',
    aceito: 'Aceito',
    recusado: 'Recusado',
    desistiu: 'Voluntário desistiu',
    finalizado: 'Concluído',
    cancelado: 'Cancelado',
  })[value] || 'Status indisponível';
