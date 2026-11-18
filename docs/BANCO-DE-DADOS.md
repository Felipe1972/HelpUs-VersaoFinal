# Banco de dados

Banco utilizado: help_us2, MySQL/InnoDB, utf8mb4. Resumo consolidado dos levantamentos anteriores; não houve nova consulta ou alteração no banco nesta organização.

## Entidades
| Tabela | Papel e relacionamentos principais |
| --- | --- |
| usuario | Identidade, senha_hash, contatos próprios, eh_voluntario e disponibilidade |
| endereco | Endereço privado vinculado ao usuário |
| contato_emergencia | Nome, telefone, parentesco e principal; proprietário por id_usuario |
| tipo_ocorrencia | Catálogo de tipos de ajuda |
| ocorrencia | Solicitante, tipo, descrição pública/privada, horário, posição e snapshot do endereço |
| atendimento | Vínculo da ocorrência com voluntário e eventos do atendimento |
| conversa | UUID e par solicitante/voluntário por ocorrência |
| mensagem | Ocorrência, remetente, destinatário, texto, envio e leitura |
| consentimento_localizacao | Histórico compartilhar/revogar por atendimento e autor |
| notificacao_privada | Aviso por destinatário, ocorrência, conversa opcional e leitura |
| avaliacao | Nota/comentário por ocorrência, avaliador, avaliado e atendimento |
| aviso_comunitario | Estrutura de avisos comunitários; não confundir com notificações privadas reais |

## Estados e restrições
Ocorrência: aberta, em_atendimento, finalizada, cancelada. Urgência: baixa, media, alta. Atendimento: aceito, recusado, finalizado, cancelado, desistiu. Horário: agora ou agendado, com instante UTC e fuso IANA; apresentação usa o horário do aparelho.
Latitude DECIMAL(10,8) e longitude DECIMAL(11,8), validadas pela aplicação. descricao_publica é separada da descrição privada; endereco_snapshot preserva o endereço do pedido apesar de mudanças posteriores no perfil.
Conversa tem unicidade por vínculo de participantes/ocorrência. Avaliação possui unicidade por id_atendimento. E-mail duplicado é impedido; senha é hash bcrypt. Identidade/autoria são obtidas do JWT, não do corpo enviado pelo cliente.

## Complementos incorporados ao DER
- usuario.disponivel: TINYINT(1) NOT NULL DEFAULT1, independente de eh_voluntario. Uma pessoa pode solicitar ajuda e também ser voluntária.
- mensagem.lida_em: DATETIME NULL, leitura pelo destinatário de mensagens efetivamente exibidas.
- atendimento.a_caminho_em, chegou_em e previsao_registrada_em: DATETIME NULL; previsao_minutos: SMALLINT UNSIGNED NULL. São complementos, não substituem status principal.
- usuario possui relações1:N com contato_emergencia e com mensagem em dois papéis (remetente/destinatário).
- ocorrencia possui relações1:N com atendimento e mensagem; atendimento se relaciona com consentimentos e avaliação.

## Migrações e preservação
Scripts SQL estão em [database](../database) e scripts controlados em [backend/scripts](../backend/scripts). Alguns scripts históricos não são idempotentes: não executar todos em sequência nem reaplicar na instalação já existente. O dump privado é a referência para restauração controlada do esquema completo; este resumo não é um script de criação.
FKs de vínculos usam predominantemente ON DELETE CASCADE; tipo de ocorrência é restrito e a referência opcional de notificação à conversa usa SET NULL. Qualquer limpeza deve calcular dependências, usar IDs comprovados, backup e transação, sem reiniciar AUTO_INCREMENT.
Backup de preparação: .private-backups/apresentacao-1795007726745, com SQL, snapshot, plano e resultado privados. A limpeza anterior removeu65 contas comprovadas e preservou61; documentos completos de IDs estão no histórico arquivado. Não divulgar backups nem credenciais.

[Arquitetura](ARQUITETURA.md) · [Funcionalidades](FUNCIONALIDADES.md)
