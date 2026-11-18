const pool = require('../config/database');
const chat = require('./chatService');
// Retorna apenas reputação e dados públicos da interação autorizada.
async function get(uid, id) {
  const pair = await chat.resolveConversation(uid, id);
  await chat.authorize(uid, pair.occurrenceId, pair.otherId);
  const [[c]] = await pool.execute(
    'SELECT id_voluntario FROM conversa WHERE id_conversa=? AND id_solicitante=?',
    [id, uid],
  );
  if (!c)
    throw new chat.ChatError('FORBIDDEN', 'Perfil indisponível neste contexto.', 403);
  const [[user]] = await pool.execute(
    'SELECT nome,criado_em FROM usuario WHERE id_usuario=?',
    [c.id_voluntario],
  );
  const [[rating]] = await pool.execute(
    'SELECT AVG(nota) media,COUNT(*) quantidade FROM avaliacao WHERE id_avaliado=?',
    [c.id_voluntario],
  );
  const [[done]] = await pool.execute(
    "SELECT COUNT(DISTINCT a.id_ocorrencia) quantidade FROM atendimento a JOIN ocorrencia o ON o.id_ocorrencia=a.id_ocorrencia WHERE a.id_voluntario=? AND a.status='finalizado' AND o.status='finalizada'",
    [c.id_voluntario],
  );
  return {
    primeiro_nome: user.nome.trim().split(/\s+/)[0],
    participa_desde: user.criado_em,
    avaliacoes: Number(rating.quantidade),
    media: rating.quantidade ? Number(rating.media) : null,
    atendimentos_concluidos: Number(done.quantidade),
  };
}
module.exports = { get };
