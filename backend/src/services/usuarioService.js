const pool = require('../config/database');

// Busca a conta pelo e-mail para autenticação e controle de duplicidade.
async function buscarPorEmail(email) {
  const [usuarios] = await pool.execute(
    `SELECT id_usuario, nome, email, senha_hash, telefone, tipo_usuario,
            eh_voluntario, disponivel, status_verificacao, criado_em
       FROM usuario
      WHERE email = ?
      LIMIT 1`,
    [email],
  );

  return usuarios[0] || null;
}

// Obtém o perfil individual e sua reputação calculada.
async function buscarPorId(idUsuario) {
  const [usuarios] = await pool.execute(
    `SELECT id_usuario, nome, email, telefone, tipo_usuario,
            eh_voluntario, disponivel, status_verificacao, criado_em
       FROM usuario
      WHERE id_usuario = ?
      LIMIT 1`,
    [idUsuario],
  );

  const usuario = usuarios[0];

  if (!usuario) {
    return null;
  }

  const [[rating]] = await pool.execute(
    'SELECT AVG(nota) media,COUNT(*) quantidade FROM avaliacao WHERE id_avaliado=?',
    [idUsuario],
  );
  return {
    reputacao: rating.quantidade
      ? { media: Number(rating.media), quantidade: Number(rating.quantidade) }
      : null,
    ...usuario,
    eh_voluntario: Boolean(usuario.eh_voluntario),
  };
}

// Obtém os dados necessários à validação da senha atual.
async function buscarCompletoPorId(idUsuario) {
  const [usuarios] = await pool.execute(
    `SELECT id_usuario, nome, email, senha_hash, telefone, tipo_usuario,
            eh_voluntario, disponivel, status_verificacao, criado_em
       FROM usuario
      WHERE id_usuario = ?
      LIMIT 1`,
    [idUsuario],
  );

  return usuarios[0] || null;
}

// Persiste o hash da nova senha para a conta indicada.
async function atualizarSenha(idUsuario, novaSenhaHash) {
  const [resultado] = await pool.execute(
    'UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?',
    [novaSenhaHash, idUsuario],
  );

  return resultado.affectedRows === 1;
}

// Exclui somente a conta identificada pelo fluxo autenticado.
async function deletarPorId(idUsuario) {
  const [resultado] = await pool.execute('DELETE FROM usuario WHERE id_usuario = ?', [
    idUsuario,
  ]);

  return resultado.affectedRows === 1;
}

// Cadastra a conta preservando a independência do voluntariado.
async function criarUsuario({ nome, email, senhaHash, telefone, ehVoluntario }) {
  const [resultado] = await pool.execute(
    `INSERT INTO usuario (nome, email, senha_hash, telefone, eh_voluntario, tipo_usuario)
     VALUES (?, ?, ?, ?, ?, 'solicitante')`,
    [nome, email, senhaHash, telefone, ehVoluntario],
  );

  const [usuarios] = await pool.execute(
    `SELECT id_usuario, nome, email, telefone, tipo_usuario,
            eh_voluntario, disponivel, status_verificacao, criado_em
       FROM usuario
      WHERE id_usuario = ?`,
    [resultado.insertId],
  );

  const usuario = usuarios[0];

  return {
    ...usuario,
    eh_voluntario: Boolean(usuario.eh_voluntario),
  };
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  buscarCompletoPorId,

  criarUsuario,
  atualizarSenha,
  deletarPorId,
};
