const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioService = require('../services/usuarioService');

async function cadastrar(request, response) {
  try {
    const {
      nome,
      email,
      senha,
      confirmarSenha,
      telefone,
      eh_voluntario: ehVoluntario = false,
    } = request.body;

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return response.status(400).json({ mensagem: 'Nome é obrigatório' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return response.status(400).json({ mensagem: 'E-mail é obrigatório' });
    }

    if (!senha || typeof senha !== 'string') {
      return response.status(400).json({ mensagem: 'Senha é obrigatória' });
    }

    if (!confirmarSenha || typeof confirmarSenha !== 'string') {
      return response.status(400).json({ mensagem: 'Confirmação de senha é obrigatória' });
    }

    if (senha !== confirmarSenha) {
      return response.status(400).json({ mensagem: 'As senhas não coincidem' });
    }

    if (typeof ehVoluntario !== 'boolean') {
      return response.status(400).json({
        mensagem: 'O campo eh_voluntario deve ser true ou false',
      });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuarioExistente = await usuarioService.buscarPorEmail(emailNormalizado);

    if (usuarioExistente) {
      return response.status(409).json({ mensagem: 'E-mail já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const usuario = await usuarioService.criarUsuario({
      nome: nome.trim(),
      email: emailNormalizado,
      senhaHash,
      telefone: telefone ? String(telefone).trim() : null,
      ehVoluntario,
    });

    return response.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso',
      usuario,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({ mensagem: 'E-mail já cadastrado' });
    }

    console.error('Erro ao cadastrar usuário:', error.message);
    return response.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
}

async function login(request, response) {
  try {
    const { email, senha } = request.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return response.status(400).json({ mensagem: 'E-mail é obrigatório' });
    }

    if (!senha || typeof senha !== 'string') {
      return response.status(400).json({ mensagem: 'Senha é obrigatória' });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuario = await usuarioService.buscarPorEmail(emailNormalizado);

    if (!usuario) {
      return response.status(401).json({ mensagem: 'E-mail ou senha inválidos' });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaCorreta) {
      return response.status(401).json({ mensagem: 'E-mail ou senha inválidos' });
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    const { senha_hash: senhaHash, ...dadosUsuario } = usuario;

    return response.status(200).json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        ...dadosUsuario,
        eh_voluntario: Boolean(dadosUsuario.eh_voluntario),
      },
    });
  } catch (error) {
    console.error('Erro ao realizar login:', error.message);
    return response.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
}

async function obterUsuarioLogado(request, response) {
  try {
    const usuario = await usuarioService.buscarPorId(request.usuario.id_usuario);

    if (!usuario) {
      return response.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    return response.status(200).json({ usuario });
  } catch (error) {
    console.error('Erro ao buscar usuário logado:', error.message);
    return response.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
}

async function listar(request, response) {
  try {
    const usuarios = await usuarioService.listarUsuarios();

    return response.status(200).json({ usuarios });
  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
    return response.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
}

async function trocarSenha(request, response) {
  try {
    const { senhaAtual, novaSenha, confirmarNovaSenha } = request.body;

    if (!senhaAtual || typeof senhaAtual !== 'string') {
      return response.status(400).json({ mensagem: 'Senha atual é obrigatória' });
    }

    if (!novaSenha || typeof novaSenha !== 'string') {
      return response.status(400).json({ mensagem: 'Nova senha é obrigatória' });
    }

    if (!confirmarNovaSenha || typeof confirmarNovaSenha !== 'string') {
      return response.status(400).json({
        mensagem: 'Confirmação da nova senha é obrigatória',
      });
    }

    if (novaSenha !== confirmarNovaSenha) {
      return response.status(400).json({ mensagem: 'As novas senhas não coincidem' });
    }

    const usuario = await usuarioService.buscarCompletoPorId(
      request.usuario.id_usuario,
    );

    if (!usuario) {
      return response.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    const senhaAtualCorreta = await bcrypt.compare(
      senhaAtual,
      usuario.senha_hash,
    );

    if (!senhaAtualCorreta) {
      return response.status(401).json({ mensagem: 'Senha atual incorreta' });
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);
    const senhaAtualizada = await usuarioService.atualizarSenha(
      usuario.id_usuario,
      novaSenhaHash,
    );

    if (!senhaAtualizada) {
      return response.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    return response.status(200).json({
      mensagem: 'Senha alterada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao trocar senha:', error.message);
    return response.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
}

async function excluirConta(request, response) {
  try {
    const idUsuario = request.usuario.id_usuario;
    const usuario = await usuarioService.buscarPorId(idUsuario);

    if (!usuario) {
      return response.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    const usuarioExcluido = await usuarioService.deletarPorId(idUsuario);

    if (!usuarioExcluido) {
      return response.status(404).json({ mensagem: 'Usuário não encontrado' });
    }

    return response.status(200).json({
      mensagem: 'Conta excluída com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir conta:', error.message);
    return response.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
}

module.exports = {
  cadastrar,
  login,
  obterUsuarioLogado,
  listar,
  trocarSenha,
  excluirConta,
};
