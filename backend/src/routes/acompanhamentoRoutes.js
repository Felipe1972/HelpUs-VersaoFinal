const router=require('express').Router();
const auth=require('../middlewares/authMiddleware');
const pool=require('../config/database');
const occurrence=require('../services/ocorrenciaService');
const address=require('../services/enderecoService');
function handle(fn){return async(req,res)=>{try{const user=await occurrence.usuarioAtivo(req.usuario.id_usuario);res.json(await fn(req,user.id_usuario))}catch(e){res.status(e instanceof occurrence.OcorrenciaError?e.status:500).json({mensagem:e instanceof occurrence.OcorrenciaError?e.message:'Não foi possível concluir a operação.'})}}}
router.get('/meu-endereco',auth,handle(async(req,uid)=>({endereco:await address.get(uid)})));
router.put('/meu-endereco',auth,handle(async(req,uid)=>({endereco:await address.save(uid,req.body)})));
router.delete('/meu-endereco',auth,handle(async(req,uid)=>{await address.remove(uid);return{ok:true}}));
router.get('/notificacoes',auth,handle(async(req,uid)=>{const[rows]=await pool.execute('SELECT id_notificacao,id_ocorrencia,tipo,titulo,lida_em,criada_em FROM notificacao_privada WHERE id_usuario=? ORDER BY id_notificacao DESC LIMIT 100',[uid]);return{notificacoes:rows}}));
router.post('/notificacoes/:id/lida',auth,handle(async(req,uid)=>{if(!/^[1-9]\d*$/.test(req.params.id))throw new occurrence.OcorrenciaError('Aviso inválido.');const[r]=await pool.execute('UPDATE notificacao_privada SET lida_em=COALESCE(lida_em,NOW()) WHERE id_notificacao=? AND id_usuario=?',[req.params.id,uid]);if(!r.affectedRows)throw new occurrence.OcorrenciaError('Aviso não encontrado.',404);return{ok:true}}));
module.exports=router;
