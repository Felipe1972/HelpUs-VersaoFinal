# Complemento ao DER
Relações existentes mantidas: usuario 1:N contato_emergencia; usuario 1:N mensagem como remetente/destinatário; ocorrencia 1:N mensagem/atendimento. Atributos novos: usuario.disponivel TINYINT(1) DEFAULT 1; mensagem.lida_em DATETIME NULL. Atendimento mantém os quatro campos opcionais de deslocamento já aplicados.
