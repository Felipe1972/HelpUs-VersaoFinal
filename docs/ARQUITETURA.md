# Arquitetura

Consolidação documental de 18/11/2026; baseada nos relatórios existentes, sem nova auditoria ou execução de migrações.

## Camadas
| Local | Responsabilidade |
| --- | --- |
| mobile/src/screens e components | Telas e componentes reutilizáveis |
| mobile/src/navigation, context e hooks | Navegação, sessão, notificações e ciclos de atualização |
| mobile/src/services | HTTP, armazenamento local, localização e utilitários |
| backend/src/routes e controllers | Contratos HTTP e tratamento das requisições |
| backend/src/services | Regras, autorização, transações e persistência |
| backend/src/middlewares e config | JWT e conexão MySQL |
| backend/src/websocket | Autenticação da conexão e mensagens em tempo real |
| database e backend/scripts | SQL e migrações preservadas |
| backend/tests e mobile/tests | Testes automatizados |

## Tecnologias e ambiente
React Native0.88, React19.3, Expo SDK58, React Navigation, Axios, AsyncStorage, expo-location, react-native-maps e expo-notifications. Backend Express, mysql2, bcryptjs, jsonwebtoken e ws. Lockfiles são a referência exata das versões.
Mobile utiliza Node portátil22.23.5 em %LOCALAPPDATA%/HelpUsTools/node-v22.23.5-win-x64; ativação pelos scripts use-node.sh ou use-node.ps1. Node global não precisa ser substituído. Execução e rede estão no [README](../README.md).

## Comunicação e autorização
REST e WebSocket compartilham porta3000. JWT identifica a conta; o backend consulta existência, bloqueio e permissões atuais. O usuário comum consulta seus próprios pedidos; voluntários consultam oportunidades conforme elegibilidade e disponibilidade. Não existe diretório geral de usuários; GET /usuarios está desabilitado com403.
WebSocket /ws/chat recebe primeiro evento auth com JWT. Somente após validação aceita mensagens. O servidor resolve participantes; request_id permite deduplicação. Histórico persiste no MySQL e conversas encerradas ficam somente leitura.
Aceite usa transação e bloqueio da ocorrência, revalidando elegibilidade; um segundo candidato recebe conflito. Vínculos legados ambíguos não recebem nova liberação privada.

## Localização e privacidade
GPS é obtido em primeiro plano. Polling de pedidos não deve remontar o mapa nem recentralizar a câmera. Proximidade é aproximada, em linha reta, usando posição recente e precisa; não há rastreamento contínuo.
Antes do consentimento, voluntários veem projeção pública e coordenadas aproximadas. O responsável ativo recebe dados privados somente após autorização específica. Revogação, cancelamento, desistência e conclusão encerram novos acessos; cópias externas não podem ser recolhidas.
Contatos de emergência são exclusivos do proprietário. Perfil público é contextual e não retorna telefone, e-mail ou endereço. Textos digitados pelos usuários não têm anonimização automática.

## Notificações e limites
Avisos privados persistentes são consultados por polling em primeiro plano; mensagens chegam pelo WebSocket. Notificações locais respeitam permissão e conta atual. Toque reautoriza o destino no servidor. Lembretes de atendimentos aceitos/agendados são programados cerca de30min antes e reconciliados ao retornar ao app. Sem push remoto, um cancelamento com app fechado pode não chegar antes do lembrete.
Testes automatizados simulam serviços nativos. GPS, discador, teclado, acessibilidade e notificações na tela bloqueada exigem teste físico. Consultas auxiliares por ocorrência e listas limitadas não foram validadas para grande escala.

## Histórico e manutenção
Originais íntegros e manifesto SHA256: .private-backups/documentacao-historica/2026-11-18, preservando subpastas de origem. A pasta é privada e ignorada pelo Git; inclui relatórios, roteiro acadêmico, evidências de limpeza e migração. Resultados/credenciais de testes ficam em .private-backups/execucoes-testes. Integrações criam dados e não devem ser executadas na base de apresentação sem planejamento de backup/limpeza.
