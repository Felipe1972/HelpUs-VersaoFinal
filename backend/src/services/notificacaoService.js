const pool=require('../config/database');
const occurrence=require('./ocorrenciaService');
async function create(db,uid,oid,type,title,conversation=null){
 await db.execute('INSERT INTO notificacao_privada(id_usuario,id_ocorrencia,tipo,titulo,id_conversa) VALUES(?,?,?,?,?)',[uid,oid,type,title,conversation]);
}
async function opportunities(db,oid,author){
 // Não há região confiável de atuação de todos os voluntários. Sem GPS contínuo.
 await db.execute("INSERT INTO notificacao_privada(id_usuario,id_ocorrencia,tipo,titulo) SELECT id_usuario,?,'novo_pedido','Novo pedido de ajuda' FROM usuario WHERE eh_voluntario=1 AND status_verificacao<>'bloqueado' AND id_usuario<>?",[oid,author]);
}
const visible="n.id_usuario=? AND (n.tipo<>'novo_pedido' OR (u.eh_voluntario=1 AND o.id_solicitante<>u.id_usuario AND o.status='aberta' AND o.aguarda_reabertura=0 AND NOT EXISTS(SELECT 1 FROM atendimento a WHERE a.id_ocorrencia=o.id_ocorrencia AND a.id_voluntario=u.id_usuario AND a.id_atendimento=(SELECT MAX(last_a.id_atendimento) FROM atendimento last_a WHERE last_a.id_ocorrencia=o.id_ocorrencia AND last_a.id_voluntario=u.id_usuario) AND (a.status='desistiu' OR (a.status='recusado' AND a.recusa_desfeita_em IS NULL)))))";
const from=' FROM notificacao_privada n JOIN usuario u ON u.id_usuario=n.id_usuario JOIN ocorrencia o ON o.id_ocorrencia=n.id_ocorrencia WHERE '+visible;
async function list(uid){
 const [rows]=await pool.execute('SELECT n.id_notificacao,n.id_ocorrencia,n.id_conversa,n.tipo,n.titulo,n.lida_em,n.criada_em'+from+' ORDER BY (n.lida_em IS NULL) DESC,n.id_notificacao DESC LIMIT 100',[uid]);
 const [[count]]=await pool.execute('SELECT COUNT(*) AS total'+from+' AND n.lida_em IS NULL',[uid]);
 return{notificacoes:rows,nao_lidas:Number(count.total)};
}
async function open(uid,id){
 if(!/^[1-9]\d*$/.test(String(id)))throw new occurrence.OcorrenciaError('Aviso inválido.');
 const [[n]]=await pool.execute('SELECT * FROM notificacao_privada WHERE id_notificacao=? AND id_usuario=?',[id,uid]);
 if(!n)throw new occurrence.OcorrenciaError('Aviso não encontrado.',404);
 const user=await occurrence.usuarioAtivo(uid);
 // O aviso não concede permissão: consultar sempre o recurso atual.
 if(n.id_conversa){
  const chat=require('./chatService');
  try{const pair=await chat.resolveConversation(uid,n.id_conversa);await chat.authorize(uid,pair.occurrenceId,pair.otherId)}catch(e){throw new occurrence.OcorrenciaError('Conversa indisponível para esta conta.',404)}
  return{tela:'Chat',params:{id_conversa:n.id_conversa}};
 }
 await occurrence.detalhe(n.id_ocorrencia,user);
 return{tela:n.tipo==='novo_pedido'?'OcorrenciaDetalhes':n.tipo==='conversa'?'Conversas':'Acompanhamento',params:{id_ocorrencia:n.id_ocorrencia}};
}
module.exports={create,opportunities,list,open};
