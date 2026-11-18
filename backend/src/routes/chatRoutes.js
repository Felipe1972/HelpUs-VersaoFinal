const router = require('express').Router();
const autenticar = require('../middlewares/authMiddleware');
const controller = require('../controllers/chatController');
router.get('/conversas', autenticar, controller.listar);
router.get('/mensagens/ocorrencia/:id_ocorrencia', autenticar, controller.historico);
router.get('/conversas/:id/mensagens', autenticar, async (req, res) => {
  const service = require('../services/chatService');
  try {
    const pair = await service.resolveConversation(req.usuario.id_usuario, req.params.id);
    res.json(
      await service.history(
        req.usuario.id_usuario,
        pair.occurrenceId,
        pair.otherId,
        req.query.antes_de,
        req.query.limite ?? 50,
      ),
    );
  } catch (e) {
    res
      .status(e.status || 500)
      .json({ mensagem: e.status ? e.message : 'Falha ao carregar conversa.' });
  }
});
// Registra leitura somente de mensagens recebidas na conversa autorizada.
router.post('/conversas/:id/lidas', autenticar, async (req, res) => {
  const s = require('../services/chatService');
  try {
    const uid = req.usuario.id_usuario,
      pair = await s.resolveConversation(uid, req.params.id);
    await s.authorize(uid, pair.occurrenceId, pair.otherId);
    const ids = req.body.ids;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.length > 100 ||
      ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
    )
      throw new s.ChatError('INVALID', 'IDs inválidos.');
    await require('../config/database').execute(
      'UPDATE mensagem SET lida_em=COALESCE(lida_em,NOW()) WHERE id_ocorrencia=? AND id_destinatario=? AND id_remetente=? AND id_mensagem IN (' +
        ids.map(() => '?').join(',') +
        ')',
      [pair.occurrenceId, uid, pair.otherId, ...ids],
    );
    res.json({ ok: true });
  } catch (e) {
    res
      .status(e.status || 500)
      .json({ mensagem: e.status ? e.message : 'Falha ao registrar leitura.' });
  }
});
router.get('/conversas/:id/perfil-voluntario', autenticar, async (req, res) => {
  try {
    res.json({
      perfil: await require('../services/perfilPublicoService').get(
        req.usuario.id_usuario,
        req.params.id,
      ),
    });
  } catch (e) {
    res
      .status(e.status || 500)
      .json({ mensagem: e.status ? e.message : 'Não foi possível carregar o perfil.' });
  }
});
module.exports = router;
