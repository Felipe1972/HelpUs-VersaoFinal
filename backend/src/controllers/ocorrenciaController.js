const service = require('../services/ocorrenciaService');
function handler(action, status = 200) {
  return async (req, res) => {
    try {
      await service.usuarioAtivo(req.usuario.id_usuario);
      return res.status(status).json(await action(req));
    } catch (error) {
      if (error instanceof service.OcorrenciaError) return res.status(error.status).json({ mensagem: error.message });
      console.error('Falha em ocorrências:', error.code || error.name);
      return res.status(500).json({ mensagem: 'Não foi possível concluir a operação.' });
    }
  };
}
module.exports = {
  tipos: handler(() => service.tipos()),
  listar: handler(async () => ({ ocorrencias: await service.listar() })),
  detalhe: handler(async req => ({ ocorrencia: await service.detalhe(req.params.id) })),
  criar: handler(async req => ({ ocorrencia: await service.criar(req.usuario.id_usuario, req.body) }), 201),
};
