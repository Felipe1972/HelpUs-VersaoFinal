# Entrega final do Help Us

Validação em 16/11/2026, concluída na madrugada de 17/11. Pasta exclusiva: `C:\Users\Usuario\Desktop\HelpUsTeste`. Branch `codex/expo-sdk58`. Nenhum push.

## 1. Estado executivo

O ciclo real está implementado: pedido com endereço confirmado → conversa anônima → aceite → acompanhamento → consentimento explícito → conclusão confirmada → avaliação. Cancelamento, recusa/reversão e desistência possuem regras próprias. A Home foi reorganizada conforme o desenho. Integrações HTTP/WebSocket/MySQL e validações do mobile passaram. A entrega ainda exige teste físico no Samsung/iPhone; exportar o bundle não comprova renderização nativa, GPS, teclado ou estabilidade de tiles.

## 2–3. Backup e checkpoints

- `7db0621`: estado local anterior preservado, incluindo SDK 58 e todas as alterações anteriores. Tag local `backup-sdk58-pre-finalizacao`.
- `cde6f60`: ciclo transacional, consentimento, endereço e notificações.
- `8e727f6`: Home compacta, acompanhamento, endereço, avisos e testes de interface.
- O commit de documentação/validação final pode ser consultado com `git log -1 --oneline`.
- Tag `backup-sdk54` preservada, sem alteração remota.
- Dump completo: `.private-backups/help_us2-pre-finalizacao-1794882076495.sql`, 31.290 bytes, criado com mysqldump antes do DDL.
- Snapshot de conferência: `.private-backups/rows-before.local.json`. Ambos estão ignorados pelo Git, assim como `.env` e `*.local.json`. Contêm dados privados e não devem ser enviados.

## 4–6. Concluído, parcial e pendente

Concluídos no código e na validação automatizada: ciclo de atendimento; autorização no servidor; consentimento histórico por vínculo; notificações privadas; avaliação única; endereço salvo versionado e snapshot por pedido; Home por perfil; agrupamento de pontos coincidentes; contexto do pedido no chat; preservação da câmera durante polling; regressões de autenticação e chat.

Parcialmente validado: responsividade, geocodificação e mapa nativo. Os testes usam serviços nativos simulados; não foi feito teste visual em aparelho. A geocodificação pode não fornecer UF abreviada ou bairro: o usuário preenche/confirma manualmente. Nenhum número de residência é aceito automaticamente.

Pendentes externos: roteiro físico em dois aparelhos e eventual ajuste de rede/permissões do Expo Go. SOS e recuperação de senha por email continuam explicitamente indisponíveis, conforme escopo anterior. Não há push, rotas de direção, rastreamento contínuo nem moderação automática de texto público. Não foi prometido envio de serviços de emergência.

## 7–9. Arquivos e SQL

Inventário dos arquivos encontra-se ao final deste relatório. `database/finalizacao.sql` já foi aplicado **uma única vez** ao `help_us2`. Não reaplicar: o arquivo não é idempotente.

Acrescentados: estados `cancelado`/`desistiu` e data de solicitação de conclusão no atendimento; espera de reabertura e endereço JSON na ocorrência; UF/referência/sem número/ativo no endereço; vínculo único de avaliação ao atendimento; tabelas `consentimento_localizacao` e `notificacao_privada`; request_id nullable e índice único por remetente na mensagem. A coluna nova de idempotência preserva mensagens antigas com NULL. Sem exclusão, preenchimento de endereços antigos ou migração de usuários. Os 128 registros anteriores foram comparados por todas as colunas originais: nenhum alterado/removido.

## 10–11. Contratos HTTP

Todos os recursos privados exigem JWT e usuário ativo no banco.

| Rotas | Corpo/comportamento |
| --- | --- |
| POST /ocorrencias/:id/cancelar | Dono; cancela pedido e vínculos ativos |
| POST /ocorrencias/:id/desistir | Responsável; encerra seu vínculo e avalia reabertura |
| POST /ocorrencias/:id/reabrir | Dono confirma que ainda precisa da ajuda após horário passado |
| POST /ocorrencias/:id/compartilhar e /revogar | `{id_atendimento}` deve coincidir com vínculo ativo único |
| POST /ocorrencias/:id/solicitar-conclusao | Responsável sinaliza término |
| POST /ocorrencias/:id/rejeitar-conclusao | Dono mantém atendimento ativo |
| POST /ocorrencias/:id/finalizar | Dono confirma término, inclusive sem sinalização prévia |
| POST /ocorrencias/:id/avaliar | `{nota:1..5, comentario?:string até 500}`; somente dono após término |
| GET, PUT, DELETE /meu-endereco | Endereço próprio; PUT versiona, DELETE desativa sem apagar histórico |
| GET /notificacoes | Últimos 100 avisos do usuário |
| POST /notificacoes/:id/lida | Marca somente aviso próprio como lido |

Alterados: POST /ocorrencias exige `endereco` estruturado coerente com latitude/longitude; GETs de ocorrências retornam acompanhamento e snapshot somente quando autorizado. Aceitar mantém a conversa existente e notifica o solicitante. GET /usuarios/me acrescenta média/quantidade de avaliações. Chat mantém evento `auth` e UUID de conversa; acrescenta status/motivo somente leitura. `/status` informa `helpus-finalizacao-v1` sem credenciais ou caminhos privados.

Endereço: rua, número ou sem_numero com referência, bairro, cidade, UF, CEP opcional, complemento opcional, referência opcional, latitude e longitude. Coordenadas são numéricas finitas; o servidor rejeita ponto diferente do endereço. O marcador deve ser confirmado após alteração do texto. Não há verificação oficial de existência do endereço.

## 12–13. Permissões e localização

Usuário comum consulta exclusivamente seus pedidos. Voluntário continua podendo solicitar ajuda, mas não aceita pedido próprio. Perfil é relido do MySQL; JWT ou campos do cliente não promovem usuário. Pedro, id 10, foi explicitamente testado também na API da LAN: somente pedidos 9, 11, 26, 27 e 28; detalhes alheios 404; oportunidades 403.

Aceite sozinho **não libera** coordenadas exatas, endereço, complemento, título livre privado ou descrição privada. A autorização exige dono, ocorrência ativa, único responsável e consentimento para aquele id_atendimento. Revogar não cancela o atendimento. Novo responsável nunca herda consentimento. Cancelar, desistir e concluir revogam. A próxima consulta remove dados privados da interface; atualização ocorre em até 15 s em primeiro plano. Dados já vistos/capturados não podem ser recolhidos. Resumo público e mensagens são conteúdo compartilhado voluntariamente; não incluir informações privadas nesses campos.

Ocorrências legadas 3 e 12 têm vínculos simultâneos: nenhum responsável foi escolhido arbitrariamente; histórico permanece, novas liberações privadas ficam bloqueadas. A correção futura dessa ambiguidade exige decisão explícita do dono/administrador fora desta migração.

## 14–18. Regras do ciclo

Aceitar bloqueia a ocorrência em transação, impede segundo responsável e gera aviso ao dono uma vez. O voluntário é levado ao acompanhamento, onde encontra horário, status, chat e situação do compartilhamento.

Cancelar: exclusivo do dono em pedido aberto/em atendimento; todos os vínculos ativos são encerrados como cancelados, há aviso aos responsáveis, chat histórico e nenhuma oportunidade nova.

Desistir: exclusivo do responsável ativo único. Vínculo fica `desistiu`, sem herdar as regras de recusa. Conversa anterior fica somente leitura. Pedido futuro/sem horário reabre; horário passado exige botão do dono para reabrir. Horário original é preservado e aparece como passado; para outro horário, o dono pode criar novo pedido. O mesmo voluntário desistente não reassume esse pedido.

Finalizar: voluntário solicita; dono confirma diretamente ou rejeita a sinalização. Confirmação grava datas e estados finais, revoga consentimento e fecha escrita no chat. Concluídos saem da aba de atendimentos ativos e permanecem no histórico.

Avaliar: apenas dono de atendimento finalizado, sem autoavaliação, nota inteira de 1 a 5. Índice único por atendimento e transação impedem duplicação. Repetição retorna sucesso sem segunda avaliação. Comentário não é público. Média/quantidade aparecem no perfil do voluntário e no acompanhamento quando há responsável; ausência é “sem avaliações”, nunca nota zero inventada.

Todas as transições serializam pelo bloqueio da ocorrência. Foram exercitadas disputas de dois aceites, aceite/cancelamento, compartilhamento/cancelamento, compartilhar/revogar e desistir/finalizar. Estados terminais são idempotentes. Mensagens com o mesmo request_id são deduplicadas no banco inclusive entre conexões; reenviar manualmente um novo texto/identificador é uma nova mensagem. O aplicativo orienta conferir histórico após timeout.

## 19–20. Home e endereço

Voluntário: Disponíveis (mapa), Atend. (ativos, com acesso a recusados e histórico), Pedidos (próprios). Comum: próprio mapa e pedidos/histórico. Header compacto sem coração, menu preservado e quatro abas inferiores. Solicitar ajuda e SOS permanecem separados.

Mapa ocupa o espaço flexível; atualização e localização ficam sobre ele; legenda é recolhível. O total corresponde aos registros carregados, não apenas à área visível. Pontos idênticos abrem escolha de pedido sem deslocar coordenadas. O mapa não é controlado pela resposta da API nem recentralizado no polling. Fonte ampliada/tela pequena permitem rolagem. Nenhum fallback de São Paulo ou posição fictícia representa o aparelho.

Perfil → Meu endereço permite carregar, cadastrar, editar e remover do uso. Alteração cria versão, não apaga endereço antigo. Pedido pode usar GPS/geocodificação ou endereço salvo, com confirmação explícita; salvar também no perfil é opcional. O snapshot garante que mudar o perfil não modifica pedidos já criados.

## 21–23. Validação, problemas e limites

| Verificação | Resultado |
| --- | --- |
| Backend npm test | 8 testes aprovados |
| Chat real HTTP/WS/MySQL | Aprovado; bilateral, anonimato, acesso negado, paginação, reconexão, identidade e persistência |
| Ocorrências reais | Aprovado; validações, JWT, autoria, tipos, horário e conferência SQL |
| Permissões reais | Aprovado; comum, voluntário, bloqueado, perfil alterado com mesmo JWT, sem contatos públicos |
| Atendimento e finalização | Aprovado; ciclo, consentimento, concorrência, avaliações, endereço e notificações |
| API efetivamente usada na LAN | Aprovada em 192.168.1.10:3000, inclusive Pedro e WebSocket |
| Mobile | Smoke de 20 rotas + 6 testes; GPS, polling, troca de sessão, endereço/geocodificação e remoção de dados revogados |
| Sintaxe | 27 arquivos mobile; módulos backend carregados pelas integrações |
| Dependências / Expo Doctor | Compatíveis; 20/20 |
| Bundles | Android 992 módulos; iOS 997; mobile/dist/finalizacao |
| Registros anteriores | 128 preservados |

Testes antigos ainda esperavam IDs pessoais no chat e liberação automática após aceite. Foram atualizados para o contrato UUID e consentimento explícito, mantendo as verificações de autorização. A validação detectou e corrigiu sintaxe de JSX e atualizou testes de navegação para as novas rotas. Nenhum teste foi desativado.

Limites reais: testes de UI usam mocks, sem Yoga/tiles/GPS nativos; não houve build de loja/Gradle/Xcode. Consultas de ocorrências fazem consultas auxiliares por registro: adequado à demonstração pequena, precisa paginação/otimização para escala. Avisos limitados aos últimos 100, sem push e sem paginação de avisos antigos nesta entrega. Não foi realizada auditoria de segurança externa nem correção geral de dependências fora do SDK 58.

## 24. Dados de teste

Integração atendimento: usuários 32–35; pedidos 29–30. Finalização inicial: usuários 36–39; pedidos 31–36. Chat: usuários 40–43; pedidos 37–41; mensagens 22–25. Pedido API: 42. Permissões: usuários 44–46; pedidos 43–46. Finalização ampliada: usuários 47–50; pedidos 47–53. Todos permanecem identificados, sem limpeza.

Para demonstração: `backend/.final-test.local.json`, contas Solicitante 47, Voluntario_A 48, Voluntario_B 49 e Terceiro 50. Pedido 53 disponível/agendado. Credenciais somente nesse arquivo local ignorado. Não publicar nem copiar para este relatório.

## 25–27. Iniciar e conferir

API ficou executando, PID observado 19276, comando com caminho absoluto de `Desktop\HelpUsTeste\backend\server.js`. `/status` confirma `helpus-finalizacao-v1`; LAN testada. Não iniciar uma segunda API na porta 3000. O PID pode mudar em reinicialização.

```bash
# Se a API estiver parada, Git Bash, terminal 1:
cd /c/Users/Usuario/Desktop/HelpUsTeste/backend
npm start
# Mobile, terminal 2:
cd /c/Users/Usuario/Desktop/HelpUsTeste/mobile
source ./scripts/use-node.sh
npx expo start --clear
```

Usar o QR novo e Expo Go compatível com SDK 58. Computador/celulares na mesma rede. `mobile/.env` aponta para http://192.168.1.10:3000; conferir ipconfig se mudar a rede. Não trocar para localhost no aparelho.

Pendências físicas detalhadas em CHECKLIST-TESTES-FINAIS.md. Não declarar conclusão de validação física com base nos testes automatizados.

## 28. Recuperação sem destruir trabalho

```bash
cd /c/Users/Usuario/Desktop/HelpUsTeste
git worktree add --detach ../HelpUsSDK58Backup backup-sdk58-pre-finalizacao
```

Isso abre outra cópia de código sem resetar a atual. Não executar migrações novamente nem restaurar dump sobre help_us2 automaticamente. O código anterior possui regras de privacidade anteriores; não o utilizar como API pública do banco atual. O dump é para recuperação assistida, com avaliação explícita antes de qualquer restauração. O backup SDK54 permanece disponível na tag original.

## 29. Lista para documentação acadêmica

Autenticação JWT; papéis não exclusivos; autorização baseada no banco; pedidos imediatos/agendados; mapa/GPS; endereço confirmado e versionado; projeção geográfica aproximada; conversa anônima com WebSocket autenticado; aceite concorrente protegido; recusa e reversão; acompanhamento; consentimento granular e revogável; cancelamento/desistência/reabertura; conclusão confirmada; avaliação única; avisos privados; histórico; testes automatizados de regressão, integração e concorrência.

## Inventário de arquivos (relativo à pasta do projeto)

A = criado; M = alterado.

```text
A	PLANO-FINAL.md
M	backend/package.json
M	backend/src/app.js
A	backend/src/routes/acompanhamentoRoutes.js
M	backend/src/routes/ocorrenciaRoutes.js
A	backend/src/services/acompanhamentoService.js
M	backend/src/services/atendimentoService.js
M	backend/src/services/chatService.js
A	backend/src/services/enderecoService.js
M	backend/src/services/ocorrenciaPermissoes.js
M	backend/src/services/ocorrenciaService.js
M	backend/src/services/usuarioService.js
M	backend/tests/api-authorization-running.js
M	backend/tests/atendimento-integration.js
M	backend/tests/chat-integration.js
A	backend/tests/finalizacao-integration.js
M	backend/tests/ocorrencias-integration.js
M	backend/tests/permissoes-integration.js
M	backend/tests/permissoes.test.js
A	database/finalizacao.sql
A	mobile/src/components/AddressEditor.js
M	mobile/src/components/SchedulePicker.js
M	mobile/src/navigation/AppNavigator.js
A	mobile/src/screens/AcompanhamentoScreen.js
M	mobile/src/screens/ChatScreens.js
M	mobile/src/screens/CommunityScreens.js
M	mobile/src/screens/HomeScreen.js
A	mobile/src/screens/MeuEnderecoScreen.js
A	mobile/src/screens/NotificacoesReaisScreen.js
M	mobile/src/screens/PedidosScreen.js
M	mobile/src/screens/PerfilScreen.js
M	mobile/tests/frontend-smoke.cjs
A	backend/tests/endereco.test.js
A	RELATORIO-FINAL-HELPUS.md
A	CHECKLIST-TESTES-FINAIS.md
```
