// Política compartilhável com o futuro serviço de atendimentos. Não grava aceite.
const ativos = ['aberta', 'em_atendimento'];
const voluntario = user => Number(user.eh_voluntario) === 1;
const proprio = (user, row) => Number(row.id_solicitante) === Number(user.id_usuario);
function podeConsultar(user, row) {
  return proprio(user, row) || (voluntario(user) && (ativos.includes(row.status) || ['aceito', 'finalizado', 'desistiu', 'cancelado'].includes(row.atendimento_status)));
}
function podeVerPrivado(user, row) {
  return proprio(user, row) || (voluntario(user) && row.privado_autorizado === true && row.atendimento_status === 'aceito' && ativos.includes(row.status));
}
function elegivelParaAceitar(user, row) {
  return voluntario(user) && !proprio(user, row) && row.status === 'aberta';
}
function coordenada(value, max, aproximada) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > max) return null;
  // Grade fixa de 0,01 grau (~1 km). Nunca enviar o ponto exato como campo auxiliar.
  return aproximada ? Number((Math.round(number * 100) / 100).toFixed(2)) : number;
}
function dto(user, row) {
  const privado = podeVerPrivado(user, row);
  return {
    id_ocorrencia: row.id_ocorrencia, id_tipo: row.id_tipo, nome_tipo: row.nome_tipo,
    ...(privado ? { id_solicitante: row.id_solicitante } : {}),
    titulo: privado ? row.titulo : 'Pedido de ajuda: ' + row.nome_tipo,
    descricao: privado ? row.descricao : null,
    endereco_referencia: privado ? row.endereco_referencia : null,
    nivel_urgencia: row.nivel_urgencia, status: row.status,
    latitude: coordenada(row.latitude, 90, !privado), longitude: coordenada(row.longitude, 180, !privado),
    criada_em: row.criada_em, atualizada_em: row.atualizada_em,
    meu_pedido: proprio(user, row), localizacao_aproximada: !privado,
    endereco_disponivel: privado, descricao_restrita: !privado,
    elegivel_para_aceite_futuro: elegivelParaAceitar(user, row),
  };
}
module.exports = { ativos, voluntario, proprio, podeConsultar, podeVerPrivado, elegivelParaAceitar, dto };
