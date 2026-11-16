const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const usuarioRoutes = require('./routes/usuarioRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/usuarios', usuarioRoutes);
app.use(chatRoutes);
app.use(require('./routes/ocorrenciaRoutes'));

app.get('/status', (request, response) => {
  return response.status(200).json({
    status: 'ok',
    mensagem: 'Backend Help Us funcionando',
  });
});

app.get('/status/db', async (request, response) => {
  try {
    const [resultado] = await pool.query('SELECT 1 AS conectado');

    return response.status(200).json({
      status: 'ok',
      mensagem: 'Conexão com o MySQL funcionando',
      banco: process.env.DB_NAME,
      conectado: resultado[0].conectado === 1,
    });
  } catch (error) {
    console.error('Erro ao conectar com o MySQL:', error.message);

    return response.status(500).json({
      status: 'erro',
      mensagem: 'Não foi possível conectar com o MySQL',
    });
  }
});

module.exports = app;
