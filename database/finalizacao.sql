-- Aplicar uma única vez em help_us2 após backup. Migração aditiva; não altera registros anteriores.
USE help_us2;
ALTER TABLE atendimento MODIFY status ENUM('aceito','recusado','finalizado','cancelado','desistiu') DEFAULT 'aceito',
 ADD conclusao_solicitada_em DATETIME NULL;
ALTER TABLE ocorrencia ADD aguarda_reabertura TINYINT(1) NOT NULL DEFAULT 0,
 ADD endereco_snapshot JSON NULL;
ALTER TABLE endereco ADD estado VARCHAR(2) NULL, ADD referencia VARCHAR(255) NULL,
 ADD sem_numero TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE avaliacao ADD id_atendimento INT NULL,
 ADD UNIQUE KEY uq_avaliacao_atendimento(id_atendimento),
 ADD CONSTRAINT fk_avaliacao_atendimento FOREIGN KEY(id_atendimento) REFERENCES atendimento(id_atendimento) ON DELETE CASCADE;
CREATE TABLE consentimento_localizacao (
 id_consentimento INT AUTO_INCREMENT PRIMARY KEY,
 id_atendimento INT NOT NULL, id_autor INT NOT NULL,
 acao ENUM('compartilhar','revogar') NOT NULL,
 criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(id_atendimento) REFERENCES atendimento(id_atendimento) ON DELETE CASCADE,
 FOREIGN KEY(id_autor) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
 INDEX idx_consentimento_vinculo(id_atendimento,id_consentimento)
) ENGINE=InnoDB;
CREATE TABLE notificacao_privada (
 id_notificacao INT AUTO_INCREMENT PRIMARY KEY,
 id_usuario INT NOT NULL, id_ocorrencia INT NOT NULL,
 tipo VARCHAR(50) NOT NULL, titulo VARCHAR(160) NOT NULL,
 lida_em DATETIME NULL, criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
 FOREIGN KEY(id_ocorrencia) REFERENCES ocorrencia(id_ocorrencia) ON DELETE CASCADE,
 INDEX idx_notificacao_usuario(id_usuario,id_notificacao)
) ENGINE=InnoDB;

ALTER TABLE endereco ADD ativo TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE mensagem ADD request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL, ADD UNIQUE KEY uq_mensagem_envio(id_remetente,request_id);
