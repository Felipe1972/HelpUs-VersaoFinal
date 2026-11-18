// Política pura: conteúdo genérico, cursor por conta, sem replay do histórico.
export function notificationBatch(
  items,
  cursor,
  now = Date.now(),
  activeConversation = null,
) {
  const maximum = Math.max(
    Number(cursor) || 0,
    ...items.map((n) => Number(n.id_notificacao) || 0),
  );
  if (cursor === null) return { cursor: maximum, show: [] };
  const show = items
    .filter(
      (n) =>
        Number(n.id_notificacao) > cursor &&
        !n.lida_em &&
        now - new Date(n.criada_em).getTime() >= 0 &&
        now - new Date(n.criada_em).getTime() < 120000 &&
        !(n.tipo === 'mensagem' && n.id_conversa === activeConversation),
    )
    .sort((a, b) => a.id_notificacao - b.id_notificacao)
    .slice(-3);
  return { cursor: maximum, show };
}
// Prepara texto genérico para não expor detalhes privados na notificação.
export function notificationContent(n, accountId) {
  const texts = {
    'a-caminho': ['Voluntário a caminho', 'Toque para acompanhar o atendimento.'],
    cheguei: ['Chegada informada', 'O voluntário informou que chegou ao local.'],
    previsao: ['Previsão atualizada', 'Toque para consultar a estimativa de chegada.'],
    novo_pedido: [
      'Novo pedido de ajuda',
      'Uma pessoa precisa de ajuda. Toque para visualizar.',
    ],
    aceite: [
      'Seu pedido foi aceito!',
      'Um voluntário assumiu seu atendimento. Toque para acompanhar.',
    ],
    mensagem: [
      'Nova mensagem',
      'Você recebeu uma mensagem. Toque para abrir a conversa.',
    ],
    conversa: ['Nova conversa', 'Toque para consultar suas conversas.'],
    compartilhamento: ['Localização compartilhada', 'Toque para acompanhar o pedido.'],
    revogacao: ['Compartilhamento encerrado', 'Consulte o estado atual do atendimento.'],
    desistencia: ['Voluntário desistiu', 'Toque para acompanhar seu pedido.'],
    cancelamento: ['Pedido cancelado', 'Toque para consultar o histórico.'],
    conclusao_pendente: ['Conclusão solicitada', 'Toque para acompanhar e responder.'],
    conclusao_recusada: [
      'Conclusão não confirmada',
      'Toque para acompanhar o atendimento.',
    ],
    conclusao: ['Atendimento concluído', 'Toque para consultar o histórico.'],
  };
  const [title, body] = texts[n.tipo] || [
    'Novo aviso do Help Us',
    'Toque para consultar seu aviso.',
  ];
  return {
    title,
    body,
    sound: 'default',
    data: {
      source: 'helpus',
      accountId,
      id_notificacao: n.id_notificacao,
      id_ocorrencia: n.id_ocorrencia,
      id_conversa: n.id_conversa || null,
      tipo: n.tipo,
    },
  };
}
