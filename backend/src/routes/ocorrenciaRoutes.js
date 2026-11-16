const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/ocorrenciaController');
router.get('/tipos-ocorrencia', auth, controller.tipos);
router.get('/ocorrencias', auth, controller.listar);
router.post('/ocorrencias', auth, controller.criar);
router.get('/ocorrencias/:id', auth, controller.detalhe);
module.exports = router;
