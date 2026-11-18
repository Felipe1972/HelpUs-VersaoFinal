# Funcionalidades reais do Help Us

Concluídas com backend e interface: cadastro/login JWT, perfil consultável, troca de senha, exclusão de conta, lista pública sem contatos, papéis não exclusivos, pedidos imediatos/agendados, GPS e endereço confirmado, endereço próprio versionado, oportunidades, recusa/reversão, aceite, acompanhamento, consentimento revogável, cancelamento/desistência/reabertura, conclusão confirmada, avaliações e média, avisos privados persistentes e chat WebSocket com histórico. Home organizada por perfil, menu e navegação inferior.

Parcialmente validadas: mapas nativos, responsividade, teclado e geocodificação. Testes automatizados simulam serviços nativos; falta confirmação Samsung/iPhone. UF/endereço podem precisar de preenchimento manual. Avisos mostram os últimos 100, sem paginação; ocorrências usam consultas auxiliares por registro, adequadas à pequena demonstração, não validadas para escala.

Demonstrativas/informativas: SOS não aciona serviços oficiais; recuperação por email não envia mensagens; antigas telas de alertas comunitários são identificadas como exemplo e não substituem avisos privados reais. Não há botões de favoritos.

Futuras/opcionais: edição de nome/telefone, contatos de emergência com interface CRUD, push, recuperação por email, moderação e paginação. A tabela de contatos existe, mas isso não significa funcionalidade pronta. Não implementados Google Login, Firebase Authentication, rotas de direção ou rastreamento contínuo. O indicador de não lidos na barra inferior ficou opcional; a lista já distingue novos/lidos.

Tecnologias: Expo SDK58, React19.3, React Native0.88, React Navigation, Axios, AsyncStorage, expo-location, react-native-maps, Ionicons; Express, mysql2/MySQL help_us2, bcryptjs, JWT e ws. Node portátil22 no mobile, Node global20 no backend. Requer MySQL configurado, .env locais, mesma rede do celular e Expo Go SDK58. Não publicar credenciais.

Segurança: servidor relê usuário e papel; comum só consulta pedidos próprios; consentimento exige vínculo ativo único; dados privados são removidos na consulta após revogação. Textos públicos e mensagens podem conter dados digitados pelo usuário: não existe anonimização automática desses textos. Vínculos legados ambíguos são preservados sem nova liberação privada. Testes não equivalem a auditoria externa de segurança.

Execução e evidências detalhadas: RELATORIO-FINAL-HELPUS.md, AUDITORIA-FINAL-HELPUS.md e CHECKLIST-TESTES-FINAIS.md.


## Complementos — checkpoint prioridade 1

Como chegar e copiar endereço com autorização atual; deslocamento declarado e previsão persistida, sem rastreamento.

## Entrega de complementos — 18/11/2026
Concluídos: lembretes locais, leitura por destinatário/IDs visíveis, disponibilidade independente, distância 2/5/10/25km/Todos e ordenação, perfil público contextual com avaliações reais, edição nome/telefone, contatos privados CRUD.
Testes: 8 backend, 13 mobile, renderização/24 rotas, sintaxe/36 arquivos; integrações finalização, chat, permissões, atendimento e notificações aprovadas. Dados anteriores preservados. Bundles Android/iOS gerados. Doctor 19/20: patch esperado 58.0.26 versus 58.0.25, preservado. API Desktop reiniciada e /status confirmado na porta3000.
Pendente físico Samsung/iPhone: teclado/fontes, GPS/filtro/mapa/polling, lembrete com tela bloqueada e toque, mensagens visíveis/badge, logout/troca de conta, edição e contatos. Testes nativos simulados.
Limites: distância em linha reta, GPS até2min/precisão100m; sem GPS adequado mostra Todos. Notificações não filtradas geograficamente. Lembrete pode tocar após cancelamento com app fechado sem push; toque reautoriza na API. Badge usa polling.
Sem atualização Expo/Node global, sem OneDrive, sem push. Checkpoint anterior 5a1b7e8.

## Ajustes de interface, perfil e SOS — 18/11/2026
Contatos: cartões com espaçamento, ações lado a lado, remoção discreta vermelha com confirmação, telefone formatado, rótulos e título Adicionar/Editar. Salvamento atualiza a lista automaticamente. Perfil: nome/telefone/e-mail, senha atual obrigatória para mudar e-mail, validação e duplicidade protegidas pelo servidor; sessão atualizada; seção Segurança abre troca de senha existente. Não existe confirmação externa de titularidade do e-mail. Recuperação demonstrativa removida da navegação/login. SOS carrega contatos próprios e abre discador tel: para contatos e 192/193/190; nenhuma chamada automática ou confirmação fictícia de atendimento.
Testes: integração real com usuários novos114–117 (senha errada, duplicado, inválido, troca de e-mail, novo login, senha existente, isolamento CRUD), registros anteriores preservados. 14 testes mobile + renderização/23 rotas; atualização automática, SOS e discador simulados sem chamadas reais; sintaxe38 arquivos. Expo Doctor19/20 somente patch58.0.26 esperado, mantido58.0.25. BundlesAndroid/iOS aprovados. API Desktop reiniciada/confirmada3000. Sem migrações, OneDrive ou push.
Pendências físicas: layout Samsung/iPhone com teclado/fontes ampliadas; abrir discador e cancelar SEM ligar aos serviços; salvar perfil e entrar novamente com novo e-mail; CRUD contatos e retorno à SOS.
Arquivos: contaComplementosRoutes.js, ContaComplementosScreen.js, SOSScreen.js, CommunityScreens.js, LoginScreen.js, AppNavigator.js, NotificationsContext.js, services/phone.js, testes frontend-smoke/phone/finalizacao, package.json.
