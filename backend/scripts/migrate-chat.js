// Migração aprovada: node scripts/migrate-chat.js --apply
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath, quiet: true });

async function main() {
  if (!process.argv.includes('--apply'))
    throw new Error('Use --apply para aplicar a migração aprovada.');
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'help_us2',
  });
  try {
    const [lock] = await db.query(
      "SELECT GET_LOCK('help_us2_chat_migration', 10) AS acquired",
    );
    if (lock[0].acquired !== 1) throw new Error('Outra migração está em andamento.');
    const [columns] = await db.query("SHOW COLUMNS FROM usuario LIKE 'eh_voluntario'");
    // DDL tem commit implícito. O preenchimento inicial só ocorre ao adicionar a coluna.
    if (!columns.length) {
      await db.query(
        'ALTER TABLE usuario ADD COLUMN eh_voluntario TINYINT(1) NOT NULL DEFAULT 0',
      );
      await db.query(
        "UPDATE usuario SET eh_voluntario = 1 WHERE tipo_usuario = 'voluntario'",
      );
      console.log('Adicionado eh_voluntario e preenchidos voluntários existentes.');
    } else if (!/^tinyint/i.test(columns[0].Type))
      throw new Error('Tipo inesperado em eh_voluntario.');
    await db.beginTransaction();
    const [before] = await db.query('SELECT COUNT(*) AS total FROM usuario');
    const [insert] = await db.query(`INSERT INTO help_us2.usuario
      (nome,email,senha_hash,telefone,tipo_usuario,eh_voluntario,status_verificacao,criado_em)
      SELECT u.nome,u.email,u.senha_hash,u.telefone,
        CASE WHEN u.tipo_usuario = 'administrador' THEN 'administrador' ELSE 'solicitante' END,
        COALESCE(u.eh_voluntario,0),u.status_verificacao,u.criado_em
      FROM help_us.usuario u WHERE NOT EXISTS (SELECT 1 FROM help_us2.usuario d WHERE d.email=u.email)`);
    const [check] = await db.query(`SELECT COUNT(*) AS missing FROM help_us.usuario u
      WHERE NOT EXISTS (SELECT 1 FROM help_us2.usuario d WHERE d.email=u.email)`);
    if (check[0].missing !== 0) throw new Error('Conferência de contas falhou.');
    await db.commit();
    console.log(
      JSON.stringify({
        usuarios_antes: before[0].total,
        contas_copiadas: insert.affectedRows,
      }),
    );
    if (process.env.DB_NAME !== 'help_us2') {
      let env = fs.readFileSync(envPath, 'utf8');
      env = env.replace(/^DB_NAME=.*$/m, 'DB_NAME=help_us2');
      const secret = crypto.randomBytes(48).toString('hex');
      if (/^JWT_SECRET=/m.test(env))
        env = env.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
      else env += `\nJWT_SECRET=${secret}\n`;
      fs.writeFileSync(envPath, env);
      console.log('DB_NAME atualizado; segredo JWT renovado. Faça novo login.');
    }
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.query("SELECT RELEASE_LOCK('help_us2_chat_migration')");
    await db.end();
  }
}
main().catch((error) => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});
