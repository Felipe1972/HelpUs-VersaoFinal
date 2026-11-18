const jwt = require('jsonwebtoken');

// Valida o JWT antes de disponibilizar a identidade às rotas protegidas.
function autenticar(request, response, next) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return response.status(401).json({ mensagem: 'Token não enviado' });
  }

  const partes = authorization.trim().split(/\s+/);

  if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1]) {
    return response.status(401).json({
      mensagem: 'Token deve ser enviado no formato Bearer TOKEN',
    });
  }

  try {
    request.usuario = jwt.verify(partes[1], process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return response.status(401).json({ mensagem: 'Token inválido ou expirado' });
  }
}

module.exports = autenticar;
