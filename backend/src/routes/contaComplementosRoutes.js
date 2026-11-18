const router = require('express').Router(),
  auth = require('../middlewares/authMiddleware'),
  pool = require('../config/database'),
  occ = require('../services/ocorrenciaService');
const handle = (fn) => async (req, res) => {
  try {
    await occ.usuarioAtivo(req.usuario.id_usuario);
    res.json(await fn(req, req.usuario.id_usuario));
  } catch (e) {
    res
      .status(e.status || 500)
      .json({ mensagem: e.status ? e.message : 'Não foi possível concluir.' });
  }
};
// Valida os campos permitidos e rejeita alterações de propriedades protegidas.
function fields(body, contact = false) {
  const keys = contact
    ? ['nome', 'telefone', 'parentesco']
    : ['nome', 'telefone', 'email', 'senhaAtual'];
  if (!body || Object.keys(body).some((k) => !keys.includes(k)))
    throw new occ.OcorrenciaError('Campos não permitidos.');
  if (
    typeof body.nome !== 'string' ||
    typeof body.telefone !== 'string' ||
    (contact && typeof body.parentesco !== 'string')
  )
    throw new occ.OcorrenciaError('Campos inválidos.');
  const nome = body.nome?.trim(),
    telefone = body.telefone?.trim() || '',
    parentesco = body.parentesco?.trim() || '';
  if (
    typeof nome !== 'string' ||
    nome.length < 2 ||
    nome.length > 120 ||
    typeof body.telefone !== 'string' ||
    telefone.length > 20 ||
    (telefone && !/^[+()\d -]{7,20}$/.test(telefone)) ||
    (contact && (!telefone || !parentesco || parentesco.length > 60))
  )
    throw new occ.OcorrenciaError('Confira nome, telefone e parentesco.');
  return contact ? [nome, telefone, parentesco] : [nome, telefone];
}
// Altera somente a própria conta; novo e-mail exige senha atual e unicidade.
router.put(
  '/meu-perfil',
  auth,
  handle(async (r, uid) => {
    const v = fields(r.body);
    const db = await pool.getConnection();
    try {
      await db.beginTransaction();
      const [[u]] = await db.execute(
        'SELECT email,senha_hash FROM usuario WHERE id_usuario=? FOR UPDATE',
        [uid],
      );
      let email = u.email;
      if (r.body.email !== undefined) {
        if (
          typeof r.body.email !== 'string' ||
          r.body.email.length > 120 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.body.email.trim())
        )
          throw new occ.OcorrenciaError('E-mail inválido.');
        email = r.body.email.trim().toLowerCase();
        if (email !== u.email) {
          if (
            typeof r.body.senhaAtual !== 'string' ||
            !(await require('bcryptjs').compare(r.body.senhaAtual, u.senha_hash))
          )
            throw new occ.OcorrenciaError('Senha atual incorreta.', 400);
          const [[other]] = await db.execute(
            'SELECT id_usuario FROM usuario WHERE email=? AND id_usuario<>?',
            [email, uid],
          );
          if (other) throw new occ.OcorrenciaError('E-mail já utilizado.', 409);
        }
      }
      await db.execute(
        'UPDATE usuario SET nome=?,telefone=?,email=? WHERE id_usuario=?',
        [...v, email, uid],
      );
      await db.commit();
    } catch (e) {
      await db.rollback();
      if (e.code === 'ER_DUP_ENTRY')
        throw new occ.OcorrenciaError('E-mail já utilizado.', 409);
      throw e;
    } finally {
      db.release();
    }
    return { usuario: await require('../services/usuarioService').buscarPorId(uid) };
  }),
);
// Restringe a operação ao proprietário obtido do JWT, nunca ao ID enviado no corpo.
router.get(
  '/meus-contatos',
  auth,
  handle(async (r, uid) => ({
    contatos: (
      await pool.execute(
        'SELECT id_contato,nome,telefone,parentesco FROM contato_emergencia WHERE id_usuario=? ORDER BY id_contato',
        [uid],
      )
    )[0],
  })),
);
// Restringe a operação ao proprietário obtido do JWT, nunca ao ID enviado no corpo.
router.post(
  '/meus-contatos',
  auth,
  handle(async (r, uid) => {
    const v = fields(r.body, true);
    const [x] = await pool.execute(
      'INSERT INTO contato_emergencia(nome,telefone,parentesco,id_usuario,principal) VALUES(?,?,?,?,0)',
      [...v, uid],
    );
    return { id_contato: x.insertId };
  }),
);
// Restringe a operação ao proprietário obtido do JWT, nunca ao ID enviado no corpo.
router.put(
  '/meus-contatos/:id',
  auth,
  handle(async (r, uid) => {
    const v = fields(r.body, true);
    const [x] = await pool.execute(
      'UPDATE contato_emergencia SET nome=?,telefone=?,parentesco=? WHERE id_contato=? AND id_usuario=?',
      [...v, r.params.id, uid],
    );
    if (!x.affectedRows) throw new occ.OcorrenciaError('Contato não encontrado.', 404);
    return { ok: true };
  }),
);
// Restringe a operação ao proprietário obtido do JWT, nunca ao ID enviado no corpo.
router.delete(
  '/meus-contatos/:id',
  auth,
  handle(async (r, uid) => {
    const [x] = await pool.execute(
      'DELETE FROM contato_emergencia WHERE id_contato=? AND id_usuario=?',
      [r.params.id, uid],
    );
    if (!x.affectedRows) throw new occ.OcorrenciaError('Contato não encontrado.', 404);
    return { ok: true };
  }),
);
module.exports = router;
