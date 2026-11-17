const pool = require('../config/database');
const permissoes = require('./ocorrenciaPermissoes');
const urgencias = ['baixa', 'media', 'alta'];
class OcorrenciaError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
async function usuarioAtivo(id) {
  const [rows] = await pool.execute('SELECT id_usuario, eh_voluntario, status_verificacao FROM usuario WHERE id_usuario=?', [id]);
  if (!rows.length || rows[0].status_verificacao === 'bloqueado') throw new OcorrenciaError('Usuário indisponível.', 403);
  return rows[0];
}
function validar(body) {
  const keys = ['id_tipo', 'descricao', 'nivel_urgencia', 'latitude', 'longitude', 'endereco_referencia','descricao_publica','modalidade_horario','necessaria_em','fuso_horario','endereco'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !keys.includes(k))) throw new OcorrenciaError('Envie somente os campos do pedido.');
  if (!Number.isInteger(body.id_tipo) || body.id_tipo <= 0) throw new OcorrenciaError('Tipo de ajuda inválido.');
  if (typeof body.descricao !== 'string' || !body.descricao.trim() || body.descricao.trim().length > 2000) throw new OcorrenciaError('Descreva a situação em até 2.000 caracteres.');
  if (!urgencias.includes(body.nivel_urgencia)) throw new OcorrenciaError('Urgência inválida.');
  for (const [key, max] of [['latitude', 90], ['longitude', 180]]) {
    if (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || Math.abs(body[key]) > max) throw new OcorrenciaError('Localização inválida.');
  }
  if (body.endereco_referencia != null && (typeof body.endereco_referencia !== 'string' || body.endereco_referencia.trim().length > 255)) throw new OcorrenciaError('Endereço ou referência deve ter até 255 caracteres.');
  if(typeof body.descricao_publica!=='string'||!body.descricao_publica.trim()||body.descricao_publica.trim().length>500)throw new OcorrenciaError('Informe um resumo público de até 500 caracteres.');
  if(!['agora','agendado'].includes(body.modalidade_horario))throw new OcorrenciaError('Escolha quando precisa de ajuda.');
  try {if(typeof body.fuso_horario!=='string'||body.fuso_horario.length>100)throw Error();new Intl.DateTimeFormat('pt-BR',{timeZone:body.fuso_horario}).format()}catch{throw new OcorrenciaError('Fuso horário inválido.')}
  if(body.modalidade_horario==='agendado'&&(typeof body.necessaria_em!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(body.necessaria_em)||!Number.isFinite(Date.parse(body.necessaria_em))||Date.parse(body.necessaria_em)<=Date.now()))throw new OcorrenciaError('Escolha uma data e hora futuras.');
  if(body.modalidade_horario==='agendado'&&new Date(body.necessaria_em).toISOString()!==body.necessaria_em.replace(/Z$/,body.necessaria_em.includes('.')?'Z':'.000Z'))throw new OcorrenciaError('Data inválida.');
  return { ...body, descricao: body.descricao.trim(), endereco_referencia: body.endereco_referencia?.trim() || null };
}
const select = `SELECT o.id_ocorrencia,o.id_solicitante,o.id_tipo,o.titulo,o.descricao,
 o.endereco_snapshot,o.aguarda_reabertura,o.nivel_urgencia,o.status,o.latitude,o.longitude,o.endereco_referencia,o.criada_em,o.atualizada_em,o.descricao_publica,o.modalidade_horario,o.fuso_horario,DATE_FORMAT(o.necessaria_em_utc,'%Y-%m-%dT%H:%i:%s.000Z') AS necessaria_em,
 t.nome AS nome_tipo,
 (SELECT a.status FROM atendimento a WHERE a.id_ocorrencia=o.id_ocorrencia AND a.id_voluntario=?
 ORDER BY a.id_atendimento DESC LIMIT 1) AS atendimento_status
 FROM ocorrencia o JOIN tipo_ocorrencia t ON t.id_tipo=o.id_tipo`;
async function tipos() {
  const [tipos] = await pool.query('SELECT id_tipo,nome,descricao FROM tipo_ocorrencia ORDER BY id_tipo');
  return { tipos, urgencias };
}
async function detalhe(id, user) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) throw new OcorrenciaError('Ocorrência inválida.');
  const [rows] = await pool.execute(select + ' WHERE o.id_ocorrencia=?', [user.id_usuario, id]);
  if (!rows.length || !permissoes.podeConsultar(user, rows[0])) throw new OcorrenciaError('Pedido não encontrado ou sem acesso.', 404);
  return decorate(user,rows[0]);
}
async function decorate(user,row){
 const c=await require('./atendimentoService').context(pool,row.id_ocorrencia,user.id_usuario);
 const meta=await require('./acompanhamentoService').metadata(pool,c,user.id_usuario);
 const result=permissoes.dto(user,{...row,privado_autorizado:meta.privado}),mine=c.accepted.some(a=>a.id_voluntario===user.id_usuario);
 const eligible=permissoes.voluntario(user)&&!result.meu_pedido&&row.status==='aberta'&&!c.accepted.length&&!row.aguarda_reabertura&&c.latest?.status!=='desistiu';
 return {...result,acompanhamento:meta.acompanhamento,endereco:meta.privado?row.endereco_snapshot:null,descricao_publica:row.descricao_publica||'Pedido de ajuda: '+row.nome_tipo,modalidade_horario:row.modalidade_horario,necessaria_em:row.necessaria_em,fuso_horario:row.fuso_horario,recusado:!!c.refused,pode_aceitar:eligible&&!c.refused,pode_recusar:eligible&&!c.refused,pode_desfazer_recusa:eligible&&!!c.refused,pode_conversar:mine||eligible&&!c.refused,assumido:mine,elegivel_para_aceite_futuro:eligible&&!c.refused};
}
async function listar(user,escopo='mapa'){
 if(!['mapa','meus','disponiveis','recusados','assumidos'].includes(escopo))throw new OcorrenciaError('Filtro inválido.');
 if(!['mapa','meus'].includes(escopo)&&!permissoes.voluntario(user))throw new OcorrenciaError('Acesso exclusivo para voluntários.',403);
 const [rows]=await pool.execute(select+' ORDER BY o.criada_em DESC,o.id_ocorrencia DESC',[user.id_usuario]);const result=[];
 for(const row of rows){if(!permissoes.podeConsultar(user,row))continue;const item=await decorate(user,row);
 if(escopo==='meus'){if(item.meu_pedido)result.push(item);continue}
 if(escopo==='assumidos'){if(item.assumido||['finalizado','cancelado','desistiu'].includes(row.atendimento_status))result.push(item);continue}
 if(escopo==='recusados'){if(item.recusado)result.push(item);continue}
 if(!['aberta','em_atendimento'].includes(row.status)||item.latitude==null||item.longitude==null)continue;
 if(escopo==='disponiveis'?item.pode_aceitar:(item.meu_pedido||item.assumido||item.pode_aceitar))result.push(item);
 }return result;
}
// O futuro aceite deve chamar esta guarda dentro da transação, com a ocorrência bloqueada.
function exigirElegibilidadeParaAtendimento(user, row) {
  if (!permissoes.elegivelParaAceitar(user, row)) throw new OcorrenciaError('Não é permitido aceitar este pedido.', 403);
}
async function criar(user, body) {
  const data = validar(body);
  const endereco=require('./enderecoService').validar(body.endereco);
  if(endereco.latitude!==data.latitude||endereco.longitude!==data.longitude)throw new OcorrenciaError('O endereço e o ponto do pedido devem coincidir.');
  const [types] = await pool.execute('SELECT nome FROM tipo_ocorrencia WHERE id_tipo=?', [data.id_tipo]);
  if (!types.length) throw new OcorrenciaError('Tipo de ajuda inexistente.');
  const [result] = await pool.execute(`INSERT INTO ocorrencia (id_solicitante,id_tipo,titulo,descricao,nivel_urgencia,status,latitude,longitude,endereco_referencia,descricao_publica,modalidade_horario,necessaria_em_utc,fuso_horario,endereco_snapshot) VALUES (?,?,?,?,?,'aberta',?,?,?,?,?,?,?,?)`,
    [user.id_usuario, data.id_tipo, `Pedido de ajuda: ${types[0].nome}`, data.descricao, data.nivel_urgencia, data.latitude, data.longitude, data.endereco_referencia,data.descricao_publica.trim(),data.modalidade_horario,new Date(data.modalidade_horario==='agora'?Date.now():data.necessaria_em).toISOString().replace('T',' ').replace('Z',''),data.fuso_horario,JSON.stringify(endereco)]);
  return detalhe(result.insertId, user);
}
module.exports = { OcorrenciaError, usuarioAtivo, validar, tipos, detalhe, listar, criar, exigirElegibilidadeParaAtendimento };
