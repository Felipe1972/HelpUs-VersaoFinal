const service = require('../services/ocorrenciaService');
function handler(action, status = 200) {
  return async (req, res) => {
    try {
      const user = await service.usuarioAtivo(req.usuario.id_usuario);
      return res.status(status).json(await action(req, user));
    } catch (error) {
      if (error instanceof service.OcorrenciaError)
        return res.status(error.status).json({ mensagem: error.message });
      console.error('Falha em ocorrências:', error.code || error.name);
      return res.status(500).json({ mensagem: 'Não foi possível concluir a operação.' });
    }
  };
}
module.exports = {
  tipos: handler(() => service.tipos()),
  listar: handler(async (req, user) => ({
    ocorrencias: await service.listar(user, req.query.escopo),
    perfil: { eh_voluntario: Number(user.eh_voluntario) === 1 },
  })),
  detalhe: handler(async (req, user) => ({
    ocorrencia: await service.detalhe(req.params.id, user),
  })),
  criar: handler(
    async (req, user) => ({ ocorrencia: await service.criar(user, req.body) }),
    201,
  ),
};
