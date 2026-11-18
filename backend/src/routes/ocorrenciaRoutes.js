const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/ocorrenciaController');
router.get('/tipos-ocorrencia', auth, controller.tipos);
router.get('/ocorrencias', auth, controller.listar);
router.post('/ocorrencias', auth, controller.criar);
router.get('/ocorrencias/:id', auth, controller.detalhe);
const atendimento = require('../services/atendimentoService');
for (const action of ['aceitar', 'recusar', 'desfazer-recusa', 'conversas'])
  router.post('/ocorrencias/:id/' + action, auth, async (req, res) => {
    try {
      res.json(await atendimento.action(req.usuario.id_usuario, req.params.id, action));
    } catch (e) {
      res
        .status(e instanceof atendimento.AtendimentoError ? e.status : 500)
        .json({
          mensagem:
            e instanceof atendimento.AtendimentoError
              ? e.message
              : 'Não foi possível concluir a ação.',
        });
    }
  });
for (const action of [
  'cancelar',
  'compartilhar',
  'revogar',
  'desistir',
  'solicitar-conclusao',
  'finalizar',
  'rejeitar-conclusao',
  'reabrir',
  'avaliar',
])
  router.post('/ocorrencias/:id/' + action, auth, async (req, res) => {
    try {
      res.json(
        await require('../services/acompanhamentoService').action(
          req.usuario.id_usuario,
          req.params.id,
          action,
          req.body,
        ),
      );
    } catch (e) {
      res
        .status(e instanceof atendimento.AtendimentoError ? e.status : 500)
        .json({
          mensagem:
            e instanceof atendimento.AtendimentoError
              ? e.message
              : 'Não foi possível concluir a ação.',
        });
    }
  });
for (const kind of ['a-caminho', 'cheguei', 'previsao'])
  router.post('/ocorrencias/:id/' + kind, auth, async (req, res) => {
    try {
      res.json(
        await require('../services/deslocamentoService').action(
          req.usuario.id_usuario,
          req.params.id,
          kind,
          req.body,
        ),
      );
    } catch (e) {
      res
        .status(e instanceof atendimento.AtendimentoError ? e.status : 500)
        .json({
          mensagem:
            e instanceof atendimento.AtendimentoError
              ? e.message
              : 'Não foi possível registrar o deslocamento.',
        });
    }
  });
module.exports = router;
