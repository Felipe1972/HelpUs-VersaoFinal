// Resultados e credenciais de integração ficam fora da raiz do backend e do Git.
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(
  __dirname,
  '../../.private-backups/execucoes-testes/backend',
);
module.exports = function testArtifact(name) {
  if (path.basename(name) !== name || !name.endsWith('.local.json'))
    throw new Error('Nome de artefato inválido.');
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, name);
};
