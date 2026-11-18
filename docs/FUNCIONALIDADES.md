# Funcionalidades

Estado consolidado da versão de apresentação em18/11/2026.

## Conta e privacidade
Cadastro/login com JWT, perfil individual, edição de nome/telefone/e-mail, troca de senha, logout e exclusão de conta. Alterar e-mail exige senha atual, formato válido e ausência de duplicidade; não há confirmação externa de titularidade. Recuperação de senha demonstrativa e diretório geral foram removidos. Perfil público do voluntário é acessível pela interação autorizada e mostra primeiro nome, avaliações reais, total concluído e ingresso na comunidade.
Contatos de emergência possuem CRUD privado, telefone formatado, confirmação de remoção e atualização automática. Não são compartilhados com voluntários nem exibidos em perfis públicos/notificações.

## Pedidos e Home
Pedidos imediatos/agendados com tipo, urgência, descrição, posição válida e endereço confirmado. Home com mapa, localização do aparelho, centralização manual e atualização em foco/primeiro plano. Usuário comum vê pedidos próprios; voluntário disponível vê oportunidades, atendimentos e histórico. Raio2/5/10/25km ou Todos e lista por proximidade usam coordenadas aproximadas, GPS até2min/precisão até100m. Sem posição adequada, mostra Todos. Próprios e assumidos não são escondidos pelo raio.
Disponibilidade temporária é independente do voluntariado: suspende novas oportunidades/aceites/avisos de novos pedidos, preservando pedidos próprios, atendimentos e chat.

## Atendimento
Fluxo: pedido, conversa anônima, aceite, consentimento, acompanhamento, deslocamento, chegada, conclusão e avaliação. Recusa é individual e reversível enquanto permitido. Solicitante cancela; responsável pode desistir. Pedido com horário passado pode exigir reabertura explícita. Voluntário solicita conclusão; solicitante confirma ou rejeita. Chegada é declaração, não conclusão automática nem comprovação GPS.
Como chegar e Copiar endereço consultam a autorização atual. Mapas externos têm fallback web. Previsão manual registra intervalo e instante; não calcula trânsito nem garante chegada. Horário agendado permanece distinto.

## Chat e notificações
Chat WebSocket autenticado com persistência, histórico paginado, isolamento entre participantes e deduplicação. Anonimato do solicitante antes do aceite; acesso privado depende de consentimento. Conversas encerradas ficam somente leitura. Badge específico do destinatário e leitura por IDs visíveis, sem apagar histórico ou limpar outras conversas.
Avisos privados para eventos de pedidos/atendimentos/mensagens, indicador não lido e navegação reautorizada. Lembretes locais para ambos os participantes de atendimento agendado aceito, aproximadamente30min antes, sem programar datas passadas; deduplicação, reconciliação e cancelamento no logout. Não há push remoto nem filtragem geográfica de todos os avisos.

## SOS e demonstrações
SOS é central de contatos: contatos próprios e SAMU192, Bombeiros193, Polícia190. Abre discador; não liga automaticamente nem afirma acionamento de equipes. Telas antigas de alertas comunitários identificadas como demonstração não representam notificações reais. Favoritos foram removidos.

## Validação e limites
Últimas evidências anteriores:8 testes backend,14 mobile, renderização22 rotas, sintaxe37 arquivos, integrações de chat/permissões e verificações somente leitura após limpeza. Bundles Android/iOS haviam sido gerados antes da última remoção do diretório; não são evidência de teste físico da versão atual. Expo Doctor anterior19/20: apenas patch58.0.26 esperado versus58.0.25 preservado. Nenhum teste reexecutado nesta consolidação documental.
Pendências físicas: layout/fontes/teclado, GPS/mapa, notificações com tela bloqueada, troca de conta e discador (cancelar sem chamadas reais). Cancelamento enquanto app fechado pode não chegar antes de lembrete local. Não há verificação documental de identidade, recuperação por e-mail, rastreamento contínuo ou navegação própria.

[Execução e testes](../README.md) · [Arquitetura](ARQUITETURA.md) · [Banco](BANCO-DE-DADOS.md)
