const router = require('express').Router();
const autenticar = require('../middlewares/authMiddleware');
const controller = require('../controllers/chatController');
router.get('/conversas', autenticar, controller.listar);
router.get('/mensagens/ocorrencia/:id_ocorrencia', autenticar, controller.historico);
router.get('/conversas/:id/mensagens',autenticar,async(req,res)=>{
 const service=require('../services/chatService');try{const pair=await service.resolveConversation(req.usuario.id_usuario,req.params.id);res.json(await service.history(req.usuario.id_usuario,pair.occurrenceId,pair.otherId,req.query.antes_de,req.query.limite??50))}catch(e){res.status(e.status||500).json({mensagem:e.status?e.message:'Falha ao carregar conversa.'})}
});
module.exports = router;
