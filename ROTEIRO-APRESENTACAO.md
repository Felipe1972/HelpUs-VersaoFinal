# Demonstração em dois celulares

Preparação: API /status deve responder helpus-finalizacao-v1 na porta3000. Iniciar mobile na pasta Desktop/HelpUsTeste/mobile, source ./scripts/use-node.sh e npx expo start --clear. Ambos na mesma rede, Expo Go SDK58 e QR novo. Credenciais estão exclusivamente em backend/.final-test.local.json: solicitante51, voluntários52/53, terceiro54. Pedido60 disponível para demonstração; se necessário criar novo pedido de teste, sem apagar antigos.

1. Celular A: solicitante. Mostrar Home somente com pedidos próprios e perfil comum. Celular B: voluntário, mostrar Disponíveis/Atend./Pedidos; ele também pode solicitar ajuda.
2. A cria pedido identificado TESTE APRESENTAÇÃO: tipo, urgência, resumo público sem contato, descrição privada. Mostrar Agora e depois escolher agendamento futuro. Usar GPS, conferir endereço, número e ponto; confirmar e enviar.
3. B atualiza oportunidades, abre pedido, mostra distância aproximada em linha reta e endereço protegido. Inicia chat; A aparece Anônimo antes do aceite. Trocar uma mensagem nos dois sentidos.
4. B aceita. A abre o aviso do aceite, confere responsável/horário. B ainda não vê endereço exato. A autoriza explicitamente compartilhamento; B atualiza e mostra destino/endereço. Revogar e atualizar para demonstrar privacidade; compartilhar novamente se desejado.
5. Mostrar acompanhamento e chat. B informa conclusão; A confirma. Chat passa a histórico somente leitura. A avalia; B mostra média/quantidade no perfil. Demonstrar histórico em ambos.
6. Alternativa curta em outro pedido novo: B recusa, mostra Recusados, desfaz; A cancela com confirmação. Mostrar que saiu das oportunidades. Não cancelar registros de demonstrações anteriores.

Se falhar: confira /status, terminal da API, Wi-Fi e IP do .env mobile. EADDRINUSE significa porta ocupada: não abrir segunda API nem matar todos os processos Node. GPS negado: restaurar permissão e tentar novamente; geocodificação indisponível: preencher manualmente preservando ponto real. Timeout de criação/envio: conferir mapa/histórico antes de repetir. Nunca simular sucesso para contornar indisponibilidade. SOS é informativo e não deve ser apresentado como emergência real. Contas Expo (para abrir projeto) são diferentes das contas Help Us.

Ensaiar em ambos aparelhos com fonte ampliada, teclado e segundo plano. A validação física ainda está pendente; não afirmar que exportação do bundle a substitui.
