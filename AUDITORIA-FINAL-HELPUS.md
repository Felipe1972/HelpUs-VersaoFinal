# Auditoria final — 17/11/2026

Escopo executado somente em Desktop/HelpUsTeste. Estado anterior preservado nos commits 7db0621, cde6f60, 8e727f6 e 7adc497. Sem push, DDL, alterações de dependências ou OneDrive. Não há ferramenta disponível para consultar a porcentagem de uso da conta; execução delimitada ao escopo prioritário.

## Achados e correções

1. Acompanhamento removia item no cleanup dependente do contador de polling: desmontava o MapView a cada atualização. A limpeza agora ocorre ao sair da tela; cancelamento de requisição não apaga o item durante atualização. Em falha, dados privados continuam sendo removidos por precaução; revogação substitui projeção privada pela pública.
2. Home, detalhes, histórico, acompanhamento e chat mostravam estados internos. Novo statusLabels centraliza textos naturais, sem alterar contratos ou regras de autorização.
3. Avisos limpavam a lista em todo polling/falha temporária. Agora preservam lista durante consulta/erro de rede e limpam na saída ou acesso negado.
4. Aviso de início de conversa abria lista geral sem contexto. Lista de conversas agora respeita o pedido indicado pelo aviso e oferece retorno a todas as conversas.

Commit de código: 7d61933. Arquivos: mobile/src/services/statusLabels.js; screens/AcompanhamentoScreen.js, ChatScreens.js, HomeScreen.js, PedidosScreen.js e NotificacoesReaisScreen.js. Documentação adicionada: FUNCIONALIDADES-IMPLEMENTADAS.md, BANCO-DADOS-ATUAL.md (DDL real e DER), ROTEIRO-APRESENTACAO.md e este relatório; checklist atualizado. Commit documental consultável com git log -1.

## Comparação com o plano anterior

Ciclo principal com interface e persistência: cadastro, login, pedidos, agendamento, endereço, conversa anônima, aceite/recusa/reversão, acompanhamento, consentimento/revogação, cancelamento/desistência/reabertura, conclusão, avaliação e histórico. Endereço salvo e notificações privados persistem. Não foi identificada lacuna impeditiva no ciclo exercitado. A segurança não depende de esconder marcadores: integrações verificaram diretamente os endpoints e o chat.

Parcial: testes físicos da apresentação, GPS, mapa, fonte ampliada e teclado; escalabilidade/paginação. Ausente/futuro: push, recuperação por email, serviço real de SOS. As telas respectivas são informativas. CRUD de contatos e edição de nome/telefone são opcionais e ficaram futuros para evitar ampliar a superfície de autorização nesta rodada. Indicador de não lidos na barra inferior também não implementado; lista já distingue estados. Não houve reconstrução visual nem substituição de bibliotecas.

## Validações desta rodada

- Backend: 8 testes aprovados.
- Integração real finalização: ciclo completo, Pedro/terceiro bloqueados, endereço versionado, privacidade, concorrência, consentimento, chat histórico, avaliações e notificações aprovados. Todos os registros preexistentes à rodada comparados e preservados. Somente contas novas 51–54 e pedidos 54–60; credenciais em arquivo local ignorado. Pedido60 disponível para demonstração.
- API3000 em execução: teste somente leitura aprovado; Pedro10 só recebeu seus pedidos 9,11,26,27,28; detalhe alheio404, oportunidades403, histórico e autenticação WS aprovados. Nenhuma alteração backend exigiu reinicialização.
- Mobile: smoke de20rotas e6testes aprovados, incluindo geocodificação com erro, confirmação do ponto, remoção de dados revogados, câmera/polling, sessão e GPS simulados.
- Sintaxe:28arquivos aprovados. Expo Doctor20/20. Bundles Android/iOS em mobile/dist/auditoria aprovados. git diff --check sem erros.

## Riscos e prioridades antes da entrega

Sem teste físico realizado. Primeiro ensaiar ROTEIRO-APRESENTACAO em dois aparelhos, depois teclado/fonte ampliada/segundo plano/GPS negado. Não declarar segurança absoluta: resumo público e mensagens contêm conteúdo voluntariamente digitado; dados já vistos não podem ser recolhidos. Vínculos antigos ambíguos continuam sem nova liberação privada. Há consultas auxiliares por ocorrência e limite de100avisos, sem validação de grande volume. Dados mockados em antigas telas demonstrativas permanecem sinalizados; SOS não realiza chamada. Recomenda-se usar contas novas da apresentação, não alterar os históricos anteriores.

A API funcional e os testes não substituem o ensaio no Samsung/iPhone. Confira rede e /status se o celular falhar, sem iniciar APIs concorrentes. Nenhuma migração deve ser reaplicada.
