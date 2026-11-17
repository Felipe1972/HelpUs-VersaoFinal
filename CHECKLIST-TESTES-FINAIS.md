# Teste físico — Samsung e iPhone

Status: **pendente nos dois aparelhos**. Marcar separadamente por aparelho. Usar o projeto Desktop/HelpUsTeste, QR novo, SDK 58, mesma rede e API /status = helpus-finalizacao-v1. Não reaplicar SQL.

Abra `backend/.final-test.local.json` no editor. Copie email e senha para o login do app; não use `cd` no arquivo. Solicitante = 47; Voluntario_A = 48; Voluntario_B = 49; Terceiro = 50. O arquivo contém a senha local e não deve ser publicado. O pedido 53 está disponível para iniciar a demonstração; se seu horário passar, crie outro pedido identificado “TESTE MANUAL”.

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
