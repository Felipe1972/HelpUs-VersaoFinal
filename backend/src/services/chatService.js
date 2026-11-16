const pool = require('../config/database');
const jwt = require('jsonwebtoken');

class ChatError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function positiveId(value, field) {
  const number = typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number <= 0 || number > 2147483647) {
    throw new ChatError('INVALID_ID', `${field} inválido.`);
  }
  return number;
}

async function activeUser(id, db = pool) {
  const [rows] = await db.execute('SELECT id_usuario, nome, status_verificacao FROM usuario WHERE id_usuario = ?', [id]);
  if (!rows[0] || rows[0].status_verificacao === 'bloqueado') {
    throw new ChatError('USER_UNAVAILABLE', 'Usuário indisponível.', 403);
  }
  return rows[0];
}

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

async function authorize(userId, occurrenceId, otherId, db = pool, lock = false) {
  userId = positiveId(userId, 'Usuário');
  occurrenceId = positiveId(occurrenceId, 'Ocorrência');
  otherId = positiveId(otherId, 'Interlocutor');
  if (userId === otherId) throw new ChatError('FORBIDDEN', 'Conversa não autorizada.', 403);
  const [occurrences] = await db.execute(
    `SELECT id_ocorrencia, id_solicitante, titulo, status FROM ocorrencia WHERE id_ocorrencia = ?${lock ? ' FOR UPDATE' : ''}`,
    [occurrenceId],
  );
  const occurrence = occurrences[0];
  if (!occurrence || ![userId, otherId].includes(occurrence.id_solicitante)) {
    throw new ChatError('FORBIDDEN', 'Conversa não autorizada.', 403);
  }
  const volunteerId = occurrence.id_solicitante === userId ? otherId : userId;
  // O atendimento mais recente define o vínculo atual, mesmo se houver registros antigos.
  const [appointments] = await db.execute(
    `SELECT id_atendimento, status FROM atendimento WHERE id_ocorrencia = ? AND id_voluntario = ?
     ORDER BY id_atendimento DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [occurrenceId, volunteerId],
  );
  const appointment = appointments[0];
  if (!appointment || !['aceito', 'finalizado'].includes(appointment.status)) {
    throw new ChatError('FORBIDDEN', 'Conversa não autorizada.', 403);
  }
  await activeUser(userId, db);
  const other = await activeUser(otherId, db);
  return {
    id_ocorrencia: occurrenceId,
    titulo: occurrence.titulo,
    interlocutor: { id_usuario: other.id_usuario, nome: other.nome },
    somente_leitura: appointment.status !== 'aceito' || ['finalizada', 'cancelada'].includes(occurrence.status),
  };
}

const messageColumns = `id_mensagem, id_ocorrencia, id_remetente, id_destinatario, texto,
  UNIX_TIMESTAMP(enviada_em) AS enviada_epoch`;
function messageDTO(row) {
  return {
    id_mensagem: row.id_mensagem, id_ocorrencia: row.id_ocorrencia,
    id_remetente: row.id_remetente, id_destinatario: row.id_destinatario, texto: row.texto,
    enviada_em: row.enviada_epoch == null ? null : new Date(Number(row.enviada_epoch) * 1000).toISOString(),
  };
}

async function history(userId, occurrenceId, otherId, before, limit = 50) {
  const conversation = await authorize(userId, occurrenceId, otherId);
  const params = [occurrenceId, userId, otherId, otherId, userId];
  if (before != null) params.push(positiveId(before, 'Cursor'));
  const pageSize = Math.min(positiveId(limit, 'Limite'), 100);
  const [rows] = await pool.execute(
    `SELECT ${messageColumns} FROM mensagem WHERE id_ocorrencia = ?
     AND ((id_remetente = ? AND id_destinatario = ?) OR (id_remetente = ? AND id_destinatario = ?))
     ${before != null ? 'AND id_mensagem < ?' : ''}
     ORDER BY id_mensagem DESC LIMIT ${pageSize + 1}`, params,
  );
  const hasMore = rows.length > pageSize;
  const page = rows.slice(0, pageSize);
  const next = hasMore ? page[page.length - 1].id_mensagem : null;
  return { conversa: conversation, mensagens: page.map(messageDTO).sort((a, b) => (a.enviada_em || '').localeCompare(b.enviada_em || '') || a.id_mensagem - b.id_mensagem), proximo_cursor: next };
}

async function conversations(userId) {
  await activeUser(userId);
  const [pairs] = await pool.execute(
    `SELECT o.id_ocorrencia, IF(o.id_solicitante = ?, a.id_voluntario, o.id_solicitante) AS outro
     FROM ocorrencia o JOIN atendimento a ON a.id_ocorrencia = o.id_ocorrencia
     WHERE (o.id_solicitante = ? OR a.id_voluntario = ?) AND a.id_voluntario <> o.id_solicitante
     AND a.status IN ('aceito', 'finalizado') AND NOT EXISTS (
       SELECT 1 FROM atendimento novo WHERE novo.id_ocorrencia = a.id_ocorrencia
       AND novo.id_voluntario = a.id_voluntario AND novo.id_atendimento > a.id_atendimento)`,
    [userId, userId, userId],
  );
  const result = [];
  for (const pair of pairs) {
    try {
      const conversation = await authorize(userId, pair.id_ocorrencia, pair.outro);
      const [last] = await pool.execute(
        `SELECT ${messageColumns} FROM mensagem WHERE id_ocorrencia = ?
         AND ((id_remetente = ? AND id_destinatario = ?) OR (id_remetente = ? AND id_destinatario = ?))
         ORDER BY id_mensagem DESC LIMIT 1`, [pair.id_ocorrencia, userId, pair.outro, pair.outro, userId],
      );
      result.push({ ...conversation, ultima_mensagem: last[0] ? messageDTO(last[0]) : null });
    } catch (error) {
      if (!(error instanceof ChatError)) throw error;
    }
  }
  return result.sort((a, b) => (b.ultima_mensagem?.id_mensagem || 0) - (a.ultima_mensagem?.id_mensagem || 0) || b.id_ocorrencia - a.id_ocorrencia);
}

function validateMessage(event) {
  if (event.type !== 'chat_message') throw new ChatError('INVALID_EVENT', 'Evento desconhecido.');
  if (Object.hasOwn(event, 'id_remetente')) throw new ChatError('INVALID_SENDER', 'O remetente é definido pela sessão.');
  const occurrenceId = positiveId(event.id_ocorrencia, 'Ocorrência');
  const otherId = positiveId(event.id_destinatario, 'Destinatário');
  if (typeof event.request_id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(event.request_id)) {
    throw new ChatError('INVALID_REQUEST', 'Identificador de envio inválido.');
  }
  if (typeof event.text !== 'string' || !event.text.trim() || event.text.trim().length > 1000) {
    throw new ChatError('INVALID_TEXT', 'Escreva entre 1 e 1.000 caracteres.');
  }
  return { occurrenceId, otherId, text: event.text.trim() };
}

async function saveMessage(claims, event) {
  const { occurrenceId, otherId, text } = validateMessage(event);
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const conversation = await authorize(claims.id_usuario, occurrenceId, otherId, db, true);
    if (conversation.somente_leitura) throw new ChatError('READ_ONLY', 'Conversa encerrada. O histórico continua disponível.', 403);
    if (claims.exp * 1000 <= Date.now()) throw new ChatError('UNAUTHORIZED', 'Sessão expirada.', 401);
    const [insert] = await db.execute(
      'INSERT INTO mensagem (id_ocorrencia, id_remetente, id_destinatario, texto, enviada_em) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [occurrenceId, claims.id_usuario, otherId, text],
    );
    const [rows] = await db.execute(`SELECT ${messageColumns} FROM mensagem WHERE id_mensagem = ?`, [insert.insertId]);
    await db.commit();
    return messageDTO(rows[0]);
  } catch (error) {
    await db.rollback();
    throw error;
  } finally { db.release(); }
}

module.exports = { ChatError, positiveId, activeUser, authenticate, authorize, history, conversations, validateMessage, saveMessage };
