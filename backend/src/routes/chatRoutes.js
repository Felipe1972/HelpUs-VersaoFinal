const router = require('express').Router();
const autenticar = require('../middlewares/authMiddleware');
const controller = require('../controllers/chatController');
router.get('/conversas', autenticar, controller.listar);
router.get('/mensagens/ocorrencia/:id_ocorrencia', autenticar, controller.historico);
module.exports = router;
