-- Aditiva: executar uma vez, após conferir as colunas existentes.
ALTER TABLE ocorrencia ADD descricao_publica VARCHAR(500) NULL, ADD necessaria_em_utc DATETIME(3) NULL, ADD fuso_horario VARCHAR(100) NULL, ADD modalidade_horario ENUM('agora','agendado') NULL;
ALTER TABLE atendimento ADD recusado_em DATETIME NULL, ADD recusa_desfeita_em DATETIME NULL;
CREATE TABLE conversa (
 id_conversa CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 id_ocorrencia INT NOT NULL, id_solicitante INT NOT NULL, id_voluntario INT NOT NULL,
 criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY par (id_ocorrencia,id_solicitante,id_voluntario),
 FOREIGN KEY (id_ocorrencia) REFERENCES ocorrencia(id_ocorrencia) ON DELETE CASCADE,
 FOREIGN KEY (id_solicitante) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
 FOREIGN KEY (id_voluntario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
INSERT INTO conversa (id_conversa,id_ocorrencia,id_solicitante,id_voluntario)
SELECT UUID(),o.id_ocorrencia,o.id_solicitante,a.id_voluntario FROM ocorrencia o JOIN atendimento a USING(id_ocorrencia)
WHERE a.status IN ('aceito','finalizado') AND a.id_voluntario<>o.id_solicitante
GROUP BY o.id_ocorrencia,o.id_solicitante,a.id_voluntario;
