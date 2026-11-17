# Funcionalidades reais do Help Us

Concluídas com backend e interface: cadastro/login JWT, perfil consultável, troca de senha, exclusão de conta, lista pública sem contatos, papéis não exclusivos, pedidos imediatos/agendados, GPS e endereço confirmado, endereço próprio versionado, oportunidades, recusa/reversão, aceite, acompanhamento, consentimento revogável, cancelamento/desistência/reabertura, conclusão confirmada, avaliações e média, avisos privados persistentes e chat WebSocket com histórico. Home organizada por perfil, menu e navegação inferior.

Parcialmente validadas: mapas nativos, responsividade, teclado e geocodificação. Testes automatizados simulam serviços nativos; falta confirmação Samsung/iPhone. UF/endereço podem precisar de preenchimento manual. Avisos mostram os últimos 100, sem paginação; ocorrências usam consultas auxiliares por registro, adequadas à pequena demonstração, não validadas para escala.

Demonstrativas/informativas: SOS não aciona serviços oficiais; recuperação por email não envia mensagens; antigas telas de alertas comunitários são identificadas como exemplo e não substituem avisos privados reais. Não há botões de favoritos.

Futuras/opcionais: edição de nome/telefone, contatos de emergência com interface CRUD, push, recuperação por email, moderação e paginação. A tabela de contatos existe, mas isso não significa funcionalidade pronta. Não implementados Google Login, Firebase Authentication, rotas de direção ou rastreamento contínuo. O indicador de não lidos na barra inferior ficou opcional; a lista já distingue novos/lidos.

Tecnologias: Expo SDK58, React19.3, React Native0.88, React Navigation, Axios, AsyncStorage, expo-location, react-native-maps, Ionicons; Express, mysql2/MySQL help_us2, bcryptjs, JWT e ws. Node portátil22 no mobile, Node global20 no backend. Requer MySQL configurado, .env locais, mesma rede do celular e Expo Go SDK58. Não publicar credenciais.

Segurança: servidor relê usuário e papel; comum só consulta pedidos próprios; consentimento exige vínculo ativo único; dados privados são removidos na consulta após revogação. Textos públicos e mensagens podem conter dados digitados pelo usuário: não existe anonimização automática desses textos. Vínculos legados ambíguos são preservados sem nova liberação privada. Testes não equivalem a auditoria externa de segurança.

Execução e evidências detalhadas: RELATORIO-FINAL-HELPUS.md, AUDITORIA-FINAL-HELPUS.md e CHECKLIST-TESTES-FINAIS.md.
