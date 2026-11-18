const chat = require('../services/chatService');

function fail(response, error) {
  if (error instanceof chat.ChatError)
    return response
      .status(error.status)
      .json({ codigo: error.code, mensagem: error.message });
  console.error('Falha no chat:', error.code || error.name);
  return response
    .status(500)
    .json({
      codigo: 'INTERNAL_ERROR',
      mensagem: 'Não foi possível carregar a conversa.',
    });
}

async function listar(request, response) {
  try {
    return response.json({
      conversas: await chat.conversations(request.usuario.id_usuario),
    });
  } catch (error) {
    return fail(response, error);
  }
}

async function historico(request, response) {
  try {
    return response.json(
      await chat.history(
        request.usuario.id_usuario,
        chat.positiveId(request.params.id_ocorrencia, 'Ocorrência'),
        chat.positiveId(request.query.id_interlocutor, 'Interlocutor'),
        request.query.antes_de,
        request.query.limite ?? 50,
      ),
    );
  } catch (error) {
    return fail(response, error);
  }
}
module.exports = { listar, historico };
