const pool = require('../config/database');
const jwt = require('jsonwebtoken');

class ChatError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Rejeita identificadores ausentes ou fora do intervalo aceito.
function positiveId(value, field) {
  const number =
    typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number <= 0 || number > 2147483647) {
    throw new ChatError('INVALID_ID', `${field} inválido.`);
  }
  return number;
}

// Rejeita contas inexistentes ou bloqueadas antes de acessar dados privados.
async function activeUser(id, db = pool) {
  const [rows] = await db.execute(
    'SELECT id_usuario, nome, eh_voluntario, status_verificacao FROM usuario WHERE id_usuario = ?',
    [id],
  );
  if (!rows[0] || rows[0].status_verificacao === 'bloqueado') {
    throw new ChatError('USER_UNAVAILABLE', 'Usuário indisponível.', 403);
  }
  return rows[0];
}

// Valida assinatura, expiração e existência da conta do token WebSocket.
async function authenticate(token) {
  let claims;
  try {
    if (typeof token !== 'string' || token.length > 4096) throw new Error('token');
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    positiveId(claims.id_usuario, 'Usuário');
    if (!Number.isInteger(claims.exp)) throw new Error('expiration');
  } catch {
    throw new ChatError('UNAUTHORIZED', 'Token inválido ou expirado.', 401);
  }
  await activeUser(claims.id_usuario);
  return claims;
}

// Confere participantes e estado atual para autorizar leitura e envio na conversa.
async function authorize(userId, occurrenceId, otherId, db = pool, lock = false) {
  userId = positiveId(userId, 'Usuário');
  otherId = positiveId(otherId, 'Interlocutor');
  occurrenceId = positiveId(occurrenceId, 'Ocorrência');
  const c = await require('./atendimentoService').context(db, occurrenceId, userId, lock);
  if (userId === otherId || ![userId, otherId].includes(c.o.id_solicitante))
    throw new ChatError('FORBIDDEN', 'Conversa não autorizada.', 403);
  const vid = c.o.id_solicitante === userId ? otherId : userId;
  const [[conv]] = await db.execute(
    'SELECT id_conversa FROM conversa WHERE id_ocorrencia=? AND id_voluntario=?',
    [occurrenceId, vid],
  );
  if (!conv) throw new ChatError('FORBIDDEN', 'Conversa não autorizada.', 403);
  const viewer = await activeUser(userId, db),
    other = await activeUser(otherId, db);
  const volunteer = vid === userId ? viewer : other,
    latest = c.a.find((x) => x.id_voluntario === vid);
  const accepted = latest?.status === 'aceito',
    refused = latest?.status === 'recusado' && !latest.recusa_desfeita_em;
  const active = ['aberta', 'em_atendimento'].includes(c.o.status);
  const ended = ['desistiu', 'cancelado', 'finalizado'].includes(latest?.status);
  const writable =
    !ended &&
    !c.o.aguarda_reabertura &&
    Number(volunteer.eh_voluntario) === 1 &&
    active &&
    (accepted || (!refused && c.o.status === 'aberta' && !c.accepted.length));
  const anonymous =
    userId === vid && !(accepted && active && Number(volunteer.eh_voluntario) === 1);
  const privateAccess =
    userId === c.o.id_solicitante ||
    (accepted &&
      active &&
      c.accepted.length === 1 &&
      Number(volunteer.eh_voluntario) === 1 &&
      (await require('./acompanhamentoService').shared(db, latest)));
  return {
    pode_ver_perfil_voluntario: userId === c.o.id_solicitante,
    status: c.o.status,
    motivo_somente_leitura: writable
      ? null
      : c.o.status === 'cancelada'
        ? 'Pedido cancelado. Histórico preservado.'
        : c.o.status === 'finalizada'
          ? 'Atendimento concluído. Histórico preservado.'
          : ended
            ? 'Seu atendimento foi encerrado. Histórico preservado.'
            : c.accepted.length
              ? 'Outro voluntário assumiu este pedido.'
              : 'Pedido indisponível para novas mensagens.',
    id_conversa: conv.id_conversa,
    id_ocorrencia: occurrenceId,
    titulo: privateAccess ? c.o.titulo : 'Pedido de ajuda',
    interlocutor: { nome: anonymous ? 'Anônimo' : other.nome },
    somente_leitura: !writable,
  };
}
// Resolve o interlocutor somente dentro de uma conversa do usuário.
async function resolveConversation(userId, id, db = pool) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
    throw new ChatError('INVALID_ID', 'Conversa inválida.');
  const [[c]] = await db.execute(
    'SELECT * FROM conversa WHERE id_conversa=? AND (id_solicitante=? OR id_voluntario=?)',
    [id, userId, userId],
  );
  if (!c) throw new ChatError('FORBIDDEN', 'Conversa não autorizada.', 403);
  return {
    occurrenceId: c.id_ocorrencia,
    otherId: c.id_solicitante === userId ? c.id_voluntario : c.id_solicitante,
  };
}
// Projeta a mensagem para o participante sem expor identidades desnecessárias.
function publicMessage(row, userId, id) {
  return {
    id_mensagem: row.id_mensagem,
    id_conversa: id,
    texto: row.texto,
    enviada_em: row.enviada_em,
    minha: row.id_remetente === userId,
  };
}

const messageColumns = `id_mensagem, id_ocorrencia, id_remetente, id_destinatario, texto,
  UNIX_TIMESTAMP(enviada_em) AS enviada_epoch`;
function messageDTO(row) {
  return {
    id_mensagem: row.id_mensagem,
    id_ocorrencia: row.id_ocorrencia,
    id_remetente: row.id_remetente,
    id_destinatario: row.id_destinatario,
    texto: row.texto,
    enviada_em:
      row.enviada_epoch == null
        ? null
        : new Date(Number(row.enviada_epoch) * 1000).toISOString(),
  };
}

// Carrega o histórico autorizado com paginação.
async function history(userId, occurrenceId, otherId, before, limit = 50) {
  const conversation = await authorize(userId, occurrenceId, otherId);
  const params = [occurrenceId, userId, otherId, otherId, userId];
  if (before != null) params.push(positiveId(before, 'Cursor'));
  const pageSize = Math.min(positiveId(limit, 'Limite'), 100);
  const [rows] = await pool.execute(
    `SELECT ${messageColumns} FROM mensagem WHERE id_ocorrencia = ?
     AND ((id_remetente = ? AND id_destinatario = ?) OR (id_remetente = ? AND id_destinatario = ?))
     ${before != null ? 'AND id_mensagem < ?' : ''}
     ORDER BY id_mensagem DESC LIMIT ${pageSize + 1}`,
    params,
  );
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  const next = hasMore ? page[page.length - 1].id_mensagem : null;
  return {
    conversa: conversation,
    mensagens: page
      .map((row) => publicMessage(messageDTO(row), userId, conversation.id_conversa))
      .sort(
        (a, b) =>
          (a.enviada_em || '').localeCompare(b.enviada_em || '') ||
          a.id_mensagem - b.id_mensagem,
      ),
    proximo_cursor: next,
  };
}

// Lista apenas conversas autorizadas e conta mensagens recebidas não lidas.
async function conversations(userId) {
  await activeUser(userId);
  const [rows] = await pool.execute(
    'SELECT * FROM conversa WHERE id_solicitante=? OR id_voluntario=?',
    [userId, userId],
  );
  const out = [];
  for (const c of rows) {
    try {
      const other = c.id_solicitante === userId ? c.id_voluntario : c.id_solicitante;
      const h = await history(userId, c.id_ocorrencia, other, null, 1);
      const [[unread]] = await pool.execute(
        'SELECT COUNT(*) total FROM mensagem WHERE id_ocorrencia=? AND id_destinatario=? AND id_remetente=? AND lida_em IS NULL',
        [c.id_ocorrencia, userId, other],
      );
      out.push({
        ...h.conversa,
        nao_lidas: Number(unread.total),
        ultima_mensagem: h.mensagens.at(-1) || null,
      });
    } catch (e) {
      if (!(e instanceof ChatError) && e.status !== 403) throw e;
    }
  }
  return out.sort(
    (a, b) =>
      (b.ultima_mensagem?.id_mensagem || 0) - (a.ultima_mensagem?.id_mensagem || 0),
  );
}
// Valida conteúdo e identificador do envio, sem aceitar autoria livre.
function validateMessage(event) {
  if (event.type !== 'chat_message')
    throw new ChatError('INVALID_EVENT', 'Evento desconhecido.');
  if (Object.hasOwn(event, 'id_remetente'))
    throw new ChatError('INVALID_SENDER', 'O remetente é definido pela sessão.');
  const occurrenceId = positiveId(event.id_ocorrencia, 'Ocorrência');
  const otherId = positiveId(event.id_destinatario, 'Destinatário');
  if (
    typeof event.request_id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(event.request_id)
  ) {
    throw new ChatError('INVALID_REQUEST', 'Identificador de envio inválido.');
  }
  if (
    typeof event.text !== 'string' ||
    !event.text.trim() ||
    event.text.trim().length > 1000
  ) {
    throw new ChatError('INVALID_TEXT', 'Escreva entre 1 e 1.000 caracteres.');
  }
  return { occurrenceId, otherId, text: event.text.trim() };
}

// Persiste a mensagem autorizada e evita duplicação pelo identificador de envio.
async function saveMessage(claims, event) {
  const { occurrenceId, otherId, text } = validateMessage(event);
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const conversation = await authorize(
      claims.id_usuario,
      occurrenceId,
      otherId,
      db,
      true,
    );
    if (conversation.somente_leitura)
      throw new ChatError(
        'READ_ONLY',
        'Conversa encerrada. O histórico continua disponível.',
        403,
      );
    if (claims.exp * 1000 <= Date.now())
      throw new ChatError('UNAUTHORIZED', 'Sessão expirada.', 401);
    const [[previous]] = await db.execute(
      'SELECT ' + messageColumns + ' FROM mensagem WHERE id_remetente=? AND request_id=?',
      [claims.id_usuario, event.request_id],
    );
    if (previous) {
      if (
        previous.id_ocorrencia !== occurrenceId ||
        previous.id_destinatario !== otherId ||
        previous.texto !== text
      )
        throw new ChatError(
          'INVALID_REQUEST',
          'Identificador já utilizado para outro envio.',
        );
      await db.commit();
      return messageDTO(previous);
    }
    const [insert] = await db.execute(
      'INSERT INTO mensagem (id_ocorrencia, id_remetente, id_destinatario, texto, enviada_em,request_id) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP,?)',
      [occurrenceId, claims.id_usuario, otherId, text, event.request_id],
    );
    const [rows] = await db.execute(
      `SELECT ${messageColumns} FROM mensagem WHERE id_mensagem = ?`,
      [insert.insertId],
    );
    await require('./notificacaoService').create(
      db,
      otherId,
      occurrenceId,
      'mensagem',
      'Nova mensagem recebida',
      conversation.id_conversa,
    );
    await db.commit();
    return messageDTO(rows[0]);
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

module.exports = {
  resolveConversation,
  publicMessage,
  ChatError,
  positiveId,
  activeUser,
  authenticate,
  authorize,
  history,
  conversations,
  validateMessage,
  saveMessage,
};
