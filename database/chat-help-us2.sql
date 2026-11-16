-- Migração aprovada. Não executa exclusões nem altera help_us.
-- Execute ALTER/UPDATE somente se eh_voluntario ainda não existir.
ALTER TABLE help_us2.usuario
  ADD COLUMN eh_voluntario TINYINT(1) NOT NULL DEFAULT 0;
UPDATE help_us2.usuario SET eh_voluntario = 1 WHERE tipo_usuario = 'voluntario';

START TRANSACTION;
INSERT INTO help_us2.usuario
  (nome, email, senha_hash, telefone, tipo_usuario, eh_voluntario, status_verificacao, criado_em)
SELECT u.nome, u.email, u.senha_hash, u.telefone,
  CASE WHEN u.tipo_usuario = 'administrador' THEN 'administrador' ELSE 'solicitante' END,
  COALESCE(u.eh_voluntario, 0), u.status_verificacao, u.criado_em
FROM help_us.usuario u
WHERE NOT EXISTS (SELECT 1 FROM help_us2.usuario destino WHERE destino.email = u.email);
COMMIT;

-- Conferência sem expor hashes/senhas:
SELECT id_usuario, nome, tipo_usuario, eh_voluntario FROM help_us2.usuario;
SELECT id_mensagem, id_ocorrencia, id_remetente, id_destinatario, texto, enviada_em
FROM help_us2.mensagem ORDER BY id_mensagem;
