const express = require('express');
const usuarioController = require('../controllers/usuarioController');
const autenticar = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/cadastro', usuarioController.cadastrar);
router.post('/login', usuarioController.login);
router.get('/me', autenticar, usuarioController.obterUsuarioLogado);
router.put('/me/senha', autenticar, usuarioController.trocarSenha);
router.delete('/me', autenticar, usuarioController.excluirConta);
router.get('/', autenticar, usuarioController.listar);

module.exports = router;
