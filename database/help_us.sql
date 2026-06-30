USE help_us;

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  tipo_usuario ENUM('usuario', 'administrador') DEFAULT 'usuario',
  eh_voluntario BOOLEAN DEFAULT FALSE,
  status_verificacao ENUM('pendente', 'verificado', 'bloqueado') DEFAULT 'pendente',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

