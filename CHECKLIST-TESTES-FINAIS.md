# Teste físico — Samsung e iPhone

Status: **pendente nos dois aparelhos**. Marcar separadamente por aparelho. Usar o projeto Desktop/HelpUsTeste, QR novo, SDK 58, mesma rede e API /status = helpus-finalizacao-v1. Não reaplicar SQL.

Abra `backend/.final-test.local.json` no editor. Copie email e senha para o login do app; não use `cd` no arquivo. Solicitante = 51; Voluntario_A = 52; Voluntario_B = 53; Terceiro = 54. O arquivo contém a senha local e não deve ser publicado. O pedido 60 está disponível para iniciar a demonstração; se seu horário passar, crie outro pedido identificado “TESTE MANUAL”.

1. [ ] Login como Solicitante. Home mostra somente pedidos próprios; nenhum botão de oportunidades. Menu, perfil, endereço, avisos e chat abrem. Logout e login como voluntário mostram Disponíveis / Atend. / Pedidos, sem dados da sessão anterior.
2. [ ] Conceder GPS. Mapa abre na posição real. Zoom/movimento permanecem durante três ciclos de 15 s, ida ao chat e retorno. Centralizar em mim funciona; nenhum salto para São Paulo. Testar segundo plano por 30 s e retorno.
3. [ ] Negar permissão/desligar GPS: aviso claro e nova tentativa. Restaurar permissão. Desligar Wi-Fi: o mapa existente permanece, erro é informado, atualização não trava. Reconectar.
4. [ ] Na tela normal, verificar mapa, Solicitar ajuda e SOS visíveis. Aumentar fonte, girar aparelho e testar rolagem sem cortar botões. Verificar safe areas, menu, voltar, teclado e barra inferior. Marcadores coincidentes abrem lista de escolha; testar cada pedido.
5. [ ] Perfil → Meu endereço → localização atual. Conferir rua/bairro/cidade/UF; informar número. Sem número exige referência. Tocar ponto correto no mapa e confirmar. Salvar. Carregar endereço salvo; editar; remover do uso; pedidos antigos mantêm o endereço original.
6. [ ] Solicitante cria pedido imediato com resumo sem dados privados e descrição privada. Confirmar endereço e marcador. Depois criar agendado com horário futuro. Verificar hora em ambos aparelhos. Alterar rua deve invalidar confirmação do ponto. Falha de geocodificação deve permitir preenchimento manual com GPS válido.
7. [ ] Voluntário A abre oportunidade do solicitante: posição aproximada e nenhum endereço/descrição privada. Iniciar conversa: solicitante aparece Anônimo para o voluntário. Enviar mensagens nos dois sentidos. Voluntário B não lê conversa A.
8. [ ] Recusar e desfazer recusa. Aceitar como A: abre acompanhamento. Solicitante recebe aviso em até 15 s, toca e vê responsável, horário e chat. B perde oportunidade. Antes do consentimento, A ainda não vê endereço exato.
9. [ ] Solicitante autoriza compartilhamento com A. A atualiza: endereço, descrição privada e destino exato aparecem. Conferir marcador pessoal, distância em linha reta e Centralizar no destino. Revogar: A atualiza e perde dados exatos; chat permanece aberto. B continua sem dados privados.
10. [ ] Compartilhar novamente. A informa conclusão; solicitante escolhe “Ainda não foi concluído”, depois confirma conclusão. Chat somente leitura e histórico preservado. Avaliar 1–5 estrelas; segundo envio não cria outra avaliação. Perfil do voluntário mostra média e quantidade corretas.
11. [ ] Em novo pedido, testar cancelamento pelo dono antes e após aceite. Confirmar aviso, retirada das oportunidades, revogação de endereço e chat histórico. Não cancelar pedidos antigos de outros testes.
12. [ ] Em novo pedido agendado futuro, A aceita e desiste. B pode aceitar, sem herdar consentimento. A mantém histórico somente leitura. Em pedido imediato cujo horário passou, desistência exige reabertura explícita do solicitante antes de B aceitar.
13. [ ] Na conta Terceiro, conferir ausência de pedidos/conversas/avisos alheios. Se usar Pedro, ele deve ver apenas pedidos próprios (9,11,26,27,28 na conferência final; novos pedidos próprios podem aumentar esse total).
14. [ ] Interromper rede durante envio de mensagem/pedido. Rascunho preservado e nenhuma confirmação fictícia. Conferir histórico/mapa antes de repetir. Testar reconexão e retorno de sessão.
15. [ ] SOS informa que não aciona emergência; recuperação por email não promete envio. Sem favoritos/corações. Não interpretar demonstrações sinalizadas como funções reais.

Registrar aparelho, versão do Expo Go, horário, ação, resultado e captura se houver falha. Testar o ciclo com dois aparelhos ao mesmo tempo; alternar contas num único telefone não comprova entrega em tempo real entre dispositivos. Não apagar registros: identificar todos os dados manuais como TESTE.

Verificações da auditoria: acompanhar mapa por três ciclos sem desmontagem; revogar e confirmar remoção do endereço; aviso de conversa deve abrir conversas do pedido correto e permitir Ver todas; rótulos devem ser naturais (Aguardando ajuda, Concluído, Cancelado). Em falha temporária dos avisos, a lista carregada permanece; logout deve removê-la.


## Complementos — checkpoint prioridade 1

Prioridade 1 dos complementos: integração/API e mobile passaram. Pendente teste físico de Linking/Clipboard e notificações de a-caminho, cheguei e previsao. As etapas restantes estão em COMPLEMENTOS-FINAIS.md.

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
