require('dotenv').config();

const app = require('./src/app');
const http = require('http');
const attachChatServer = require('./src/websocket/chatServer');
const pool = require('./src/config/database');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const chat = attachChatServer(server);
server.listen(PORT, () => {
  console.log(`Servidor Help Us executando na porta ${PORT}`);
});

// Encerra conexões e libera o servidor e o pool de banco.
function shutdown() {
  chat.close();
  server.close(() => pool.end().finally(() => process.exit(0)));
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
