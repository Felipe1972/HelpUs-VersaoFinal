const pool = require('../config/database');
const urgencias = ['baixa', 'media', 'alta'];
class OcorrenciaError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
async function usuarioAtivo(id) {
  const [rows] = await pool.execute('SELECT status_verificacao FROM usuario WHERE id_usuario=?', [id]);
  if (!rows.length || rows[0].status_verificacao === 'bloqueado') throw new OcorrenciaError('Usuário indisponível.', 403);
}
function validar(body) {
  const keys = ['id_tipo', 'descricao', 'nivel_urgencia', 'latitude', 'longitude', 'endereco_referencia'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !keys.includes(k))) throw new OcorrenciaError('Envie somente os campos do pedido.');
  if (!Number.isInteger(body.id_tipo) || body.id_tipo <= 0) throw new OcorrenciaError('Tipo de ajuda inválido.');
  if (typeof body.descricao !== 'string' || !body.descricao.trim() || body.descricao.trim().length > 2000) throw new OcorrenciaError('Descreva a situação em até 2.000 caracteres.');
  if (!urgencias.includes(body.nivel_urgencia)) throw new OcorrenciaError('Urgência inválida.');
  for (const [key, max] of [['latitude', 90], ['longitude', 180]]) {
    if (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || Math.abs(body[key]) > max) throw new OcorrenciaError('Localização inválida.');
  }
  if (body.endereco_referencia != null && (typeof body.endereco_referencia !== 'string' || body.endereco_referencia.trim().length > 255)) throw new OcorrenciaError('Endereço ou referência deve ter até 255 caracteres.');
  return { ...body, descricao: body.descricao.trim(), endereco_referencia: body.endereco_referencia?.trim() || null };
}
const select = `SELECT o.*, t.nome AS nome_tipo FROM ocorrencia o JOIN tipo_ocorrencia t ON t.id_tipo=o.id_tipo`;
function dto(row) {
  return { ...row, latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude) };
}
async function tipos() {
  const [tipos] = await pool.query('SELECT id_tipo,nome,descricao FROM tipo_ocorrencia ORDER BY id_tipo');
  return { tipos, urgencias };
}
async function detalhe(id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw new OcorrenciaError('Ocorrência inválida.');
  const [rows] = await pool.execute(select + ' WHERE o.id_ocorrencia=?', [id]);
  if (!rows.length) throw new OcorrenciaError('Pedido não encontrado.', 404);
  return dto(rows[0]);
}
async function listar() {
  const [rows] = await pool.query(select + " WHERE o.status IN ('aberta','em_atendimento') AND o.latitude BETWEEN -90 AND 90 AND o.longitude BETWEEN -180 AND 180 ORDER BY o.criada_em DESC,o.id_ocorrencia DESC");
  return rows.map(dto);
}
async function criar(userId, body) {
  const data = validar(body);
  const [types] = await pool.execute('SELECT nome FROM tipo_ocorrencia WHERE id_tipo=?', [data.id_tipo]);
  if (!types.length) throw new OcorrenciaError('Tipo de ajuda inexistente.');
  const [result] = await pool.execute(`INSERT INTO ocorrencia (id_solicitante,id_tipo,titulo,descricao,nivel_urgencia,status,latitude,longitude,endereco_referencia) VALUES (?,?,?,?,?,'aberta',?,?,?)`,
    [userId, data.id_tipo, `Pedido de ajuda: ${types[0].nome}`, data.descricao, data.nivel_urgencia, data.latitude, data.longitude, data.endereco_referencia]);
  return detalhe(result.insertId);
}
module.exports = { OcorrenciaError, usuarioAtivo, validar, tipos, detalhe, listar, criar };
