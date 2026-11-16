-- Executar somente se a coluna ainda não existir. Preserva registros anteriores.
ALTER TABLE help_us2.ocorrencia ADD COLUMN endereco_referencia VARCHAR(255) NULL;
