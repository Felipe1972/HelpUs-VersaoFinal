const router=require('express').Router();
const auth=require('../middlewares/authMiddleware');
const pool=require('../config/database');
const occurrence=require('../services/ocorrenciaService');
const address=require('../services/enderecoService');
function handle(fn){return async(req,res)=>{try{const user=await occurrence.usuarioAtivo(req.usuario.id_usuario);res.json(await fn(req,user.id_usuario))}catch(e){res.status(e instanceof occurrence.OcorrenciaError?e.status:500).json({mensagem:e instanceof occurrence.OcorrenciaError?e.message:'Não foi possível concluir a operação.'})}}}
router.get('/meu-endereco',auth,handle(async(req,uid)=>({endereco:await address.get(uid)})));
router.put('/meu-endereco',auth,handle(async(req,uid)=>({endereco:await address.save(uid,req.body)})));
router.delete('/meu-endereco',auth,handle(async(req,uid)=>{await address.remove(uid);return{ok:true}}));
router.get('/notificacoes',auth,handle(async(req,uid)=>require('../services/notificacaoService').list(uid)));
router.get('/notificacoes/:id/abrir',auth,handle(async(req,uid)=>require('../services/notificacaoService').open(uid,req.params.id)));
router.post('/notificacoes/:id/lida',auth,handle(async(req,uid)=>{if(!/^[1-9]\d*$/.test(req.params.id))throw new occurrence.OcorrenciaError('Aviso inválido.');const[r]=await pool.execute('UPDATE notificacao_privada SET lida_em=COALESCE(lida_em,NOW()) WHERE id_notificacao=? AND id_usuario=?',[req.params.id,uid]);if(!r.affectedRows)throw new occurrence.OcorrenciaError('Aviso não encontrado.',404);return{ok:true}}));
router.get('/ocorrencias/:id/destino',auth,handle(async(req,uid)=>{
 const u=await occurrence.usuarioAtivo(uid),o=await occurrence.detalhe(req.params.id,u);
 if(o.meu_pedido||!o.acompanhamento?.pode_desistir||!o.endereco_disponivel||!o.acompanhamento?.compartilhado||!Number.isFinite(o.latitude)||!Number.isFinite(o.longitude))throw new occurrence.OcorrenciaError('Localização não autorizada neste atendimento.',403);
 return{latitude:o.latitude,longitude:o.longitude,endereco:o.endereco};
}));
router.get('/lembretes',auth,handle(async(req,uid)=>{const [rows]=await pool.execute("SELECT a.id_atendimento,o.id_ocorrencia,DATE_FORMAT(o.necessaria_em_utc,'%Y-%m-%dT%H:%i:%s.000Z') AS horario FROM atendimento a JOIN ocorrencia o ON o.id_ocorrencia=a.id_ocorrencia JOIN usuario u ON u.id_usuario=? WHERE a.status='aceito' AND o.status='em_atendimento' AND o.modalidade_horario='agendado' AND o.necessaria_em_utc>UTC_TIMESTAMP() AND (o.id_solicitante=? OR (a.id_voluntario=? AND u.eh_voluntario=1)) AND (SELECT COUNT(*) FROM atendimento x WHERE x.id_ocorrencia=o.id_ocorrencia AND x.status='aceito')=1",[uid,uid,uid]);return{lembretes:rows}}));
router.get('/lembretes/:id/abrir',auth,handle(async(req,uid)=>{if(!/^[1-9]\d*$/.test(req.params.id))throw new occurrence.OcorrenciaError('Lembrete inválido.');const [[a]]=await pool.execute('SELECT a.*,o.id_solicitante FROM atendimento a JOIN ocorrencia o ON o.id_ocorrencia=a.id_ocorrencia WHERE a.id_atendimento=?',[req.params.id]);if(!a||![a.id_solicitante,a.id_voluntario].includes(uid))throw new occurrence.OcorrenciaError('Lembrete indisponível.',404);await occurrence.detalhe(a.id_ocorrencia,await occurrence.usuarioAtivo(uid));return{tela:'Acompanhamento',params:{id_ocorrencia:a.id_ocorrencia}}}));
router.put('/minha-disponibilidade',auth,handle(async(req,uid)=>{if(typeof req.body.disponivel!=='boolean'||Object.keys(req.body).length!==1)throw new occurrence.OcorrenciaError('Disponibilidade inválida.');const u=await occurrence.usuarioAtivo(uid);if(!Number(u.eh_voluntario))throw new occurrence.OcorrenciaError('Apenas voluntários podem definir disponibilidade.',403);await pool.execute('UPDATE usuario SET disponivel=? WHERE id_usuario=?',[req.body.disponivel?1:0,uid]);return{disponivel:req.body.disponivel}}));
module.exports=router;
