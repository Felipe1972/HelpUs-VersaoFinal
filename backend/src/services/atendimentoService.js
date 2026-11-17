const pool=require('../config/database');
const {randomUUID}=require('crypto');
class AtendimentoError extends Error {constructor(message,status=400){super(message);this.status=status}}
async function context(db,id,uid,lock=false){
 const [[o]]=await db.execute('SELECT * FROM ocorrencia WHERE id_ocorrencia=?'+(lock?' FOR UPDATE':''),[id]);
 const [[u]]=await db.execute('SELECT id_usuario,eh_voluntario,status_verificacao FROM usuario WHERE id_usuario=?',[uid]);
 if(!u||u.status_verificacao==='bloqueado')throw new AtendimentoError('Usuário indisponível.',403);
 if(!o)throw new AtendimentoError('Pedido não encontrado.',404);
 const [a]=await db.execute('SELECT * FROM atendimento WHERE id_ocorrencia=? ORDER BY id_atendimento DESC',[id]);
 const latest=a.find(x=>x.id_voluntario===uid);
 const refused=latest?.status==='recusado'&&!latest.recusa_desfeita_em;
 const accepted=a.filter((x,i)=>x.status==='aceito'&&!a.slice(0,i).some(y=>y.id_voluntario===x.id_voluntario));
 return {o,u,a,latest,refused,accepted};
}
async function ensureConversation(db,o,vid){
 await db.execute('INSERT IGNORE INTO conversa (id_conversa,id_ocorrencia,id_solicitante,id_voluntario) VALUES (?,?,?,?)',[randomUUID(),o.id_ocorrencia,o.id_solicitante,vid]);
 const [[c]]=await db.execute('SELECT id_conversa FROM conversa WHERE id_ocorrencia=? AND id_voluntario=?',[o.id_ocorrencia,vid]);return c;
}
const attempts=new Map();
function rate(uid){const now=Date.now();let t=(attempts.get(uid)||[]).filter(x=>now-x<60000);if(t.length>=10)throw new AtendimentoError('Aguarde antes de abrir outra conversa.',429);t.push(now);attempts.set(uid,t);if(attempts.size>5000)for(const[k,v]of attempts)if(now-v.at(-1)>60000)attempts.delete(k)}
async function action(uid,id,kind){
 if(!/^[1-9]\d*$/.test(String(id))||!Number.isSafeInteger(Number(id)))throw new AtendimentoError('Pedido inválido.');
 if(kind==='conversas')rate(uid);
 const db=await pool.getConnection();try{await db.beginTransaction();const c=await context(db,id,uid,true);const {o,u,latest,refused,accepted}=c;
 if(Number(u.eh_voluntario)!==1||o.id_solicitante===uid)throw new AtendimentoError('Ação exclusiva de voluntários em pedidos de terceiros.',403);
 const mine=accepted.find(x=>x.id_voluntario===uid);
 if(kind==='aceitar'&&mine&&o.status==='em_atendimento'){const r=await ensureConversation(db,o,uid);await db.commit();return r}
 if(kind==='conversas'&&mine&&['aberta','em_atendimento'].includes(o.status)){const r=await ensureConversation(db,o,uid);await db.commit();return r}
 if(o.status!=='aberta'||accepted.length||o.aguarda_reabertura)throw new AtendimentoError('Pedido indisponível ou já assumido. Atualize a lista.',409);
 if(latest?.status==='desistiu')throw new AtendimentoError('Você desistiu deste pedido. O histórico permanece disponível.',409);
 if(refused&&!['recusar','desfazer-recusa'].includes(kind))throw new AtendimentoError('Desfaça a recusa antes de continuar.',403);
 let result={};
 if(kind==='aceitar'){
 await db.execute("INSERT INTO atendimento (id_ocorrencia,id_voluntario,status,aceito_em) VALUES (?,?,'aceito',CURRENT_TIMESTAMP)",[id,uid]);
 await db.execute("UPDATE ocorrencia SET status='em_atendimento' WHERE id_ocorrencia=?",[id]);result=await ensureConversation(db,o,uid);
 await require('./acompanhamentoService').notify(db,o.id_solicitante,id,'aceite','Um voluntário assumiu seu pedido. Acompanhe e escolha se deseja compartilhar o local');
 }else if(kind==='recusar'){
 if(!refused)await db.execute("INSERT INTO atendimento (id_ocorrencia,id_voluntario,status,aceito_em,recusado_em) VALUES (?,?,'recusado',NULL,CURRENT_TIMESTAMP)",[id,uid]);
 }else if(kind==='desfazer-recusa'){
 if(refused)await db.execute('UPDATE atendimento SET recusa_desfeita_em=CURRENT_TIMESTAMP WHERE id_atendimento=?',[latest.id_atendimento]);
 }else if(kind==='conversas'){
 const [[old]]=await db.execute('SELECT id_conversa FROM conversa WHERE id_ocorrencia=? AND id_voluntario=?',[id,uid]);
 if(!old){const [[count]]=await db.execute('SELECT COUNT(*) n FROM conversa WHERE id_voluntario=? AND criada_em>DATE_SUB(NOW(),INTERVAL 1 HOUR)',[uid]);if(count.n>=20)throw new AtendimentoError('Limite de novas conversas atingido. Tente mais tarde.',429)}
 result=old||await ensureConversation(db,o,uid);
 if(!old)await require('./acompanhamentoService').notify(db,o.id_solicitante,id,'conversa','Um voluntário iniciou uma conversa sobre seu pedido');
 }else throw new AtendimentoError('Ação inválida.');
 await db.commit();return result;
 }catch(e){await db.rollback();throw e}finally{db.release()}
}
module.exports={context,action,AtendimentoError};
