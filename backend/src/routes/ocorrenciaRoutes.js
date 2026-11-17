const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/ocorrenciaController');
router.get('/tipos-ocorrencia', auth, controller.tipos);
router.get('/ocorrencias', auth, controller.listar);
router.post('/ocorrencias', auth, controller.criar);
router.get('/ocorrencias/:id', auth, controller.detalhe);
const atendimento = require('../services/atendimentoService');
for (const action of ['aceitar','recusar','desfazer-recusa','conversas']) router.post('/ocorrencias/:id/'+action,auth,async(req,res)=>{
 try {res.json(await atendimento.action(req.usuario.id_usuario,req.params.id,action))}
 catch(e){res.status(e instanceof atendimento.AtendimentoError?e.status:500).json({mensagem:e instanceof atendimento.AtendimentoError?e.message:'Não foi possível concluir a ação.'})}
});
module.exports = router;
