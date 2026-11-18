// Aditiva e idempotente. Não altera registros anteriores.
require('dotenv').config({ quiet: true });
const fs = require('fs'),
  pool = require('../src/config/database');
(async () => {
  try {
    if (process.env.DB_NAME !== 'help_us2') throw Error('Banco inesperado');
    const [cols] = await pool.query(
      "SHOW COLUMNS FROM notificacao_privada LIKE 'id_conversa'",
    );
    if (cols.length) {
      console.log('Campo já existe; nenhuma migração reaplicada.');
      return;
    }
    const [rows] = await pool.query('SELECT * FROM notificacao_privada');
    fs.mkdirSync('../.private-backups', { recursive: true });
    fs.writeFileSync(
      '../.private-backups/notificacoes-before-' + Date.now() + '.local.json',
      JSON.stringify(rows),
    );
    await pool.query(
      'ALTER TABLE notificacao_privada ADD COLUMN id_conversa CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL, ADD CONSTRAINT fk_notificacao_conversa FOREIGN KEY (id_conversa) REFERENCES conversa(id_conversa) ON DELETE SET NULL',
    );
    const [after] = await pool.query('SELECT * FROM notificacao_privada');
    if (JSON.stringify(after.map(({ id_conversa, ...r }) => r)) !== JSON.stringify(rows))
      throw Error('Verificar registros');
    console.log('Campo opcional e FK criados; ' + rows.length + ' avisos preservados.');
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
