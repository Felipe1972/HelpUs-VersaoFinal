import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { TOKEN_KEY, limparSessao } from '../services/authStorage';
import { connectChat, mergeMessages, websocketUrl } from '../services/chatProtocol';

// Mantém histórico, conexão autenticada e rascunho até a confirmação do envio.
export default function useChat(navigation, conversationId) {
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const [attempt, setAttempt] = useState(0);
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState('Conectando…');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const connection = useRef(null);
  const pending = useRef(null);
  const refresh = useRef(null);
  const counter = useRef(0);
  const uncertainty = useRef(false);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (value) =>
      setAppActive(value === 'active'),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    setMessages([]);
    setConversation(null);
    setCursor(null);
    setDraft('');
    uncertainty.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!focused || !appActive) {
      setStatus('Desconectado');
      return undefined;
    }
    let active = true;
    let expired = false;
    let loadingHistory = false;
    let liveDuringRefresh = null;
    const abort = new AbortController();
    // Encerra a sessão inválida e retorna ao login.
    async function endSession() {
      if (!active || expired) return;
      expired = true;
      connection.current?.close();
      try {
        await limparSessao();
      } finally {
        if (active) navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
    // Carrega o histórico autorizado com paginação.
    async function history(before) {
      if (!active || loadingHistory) return;
      loadingHistory = true;
      setLoading(true);
      liveDuringRefresh = before ? null : [];
      try {
        const { data } = await api.get(`/conversas/${conversationId}/mensagens`, {
          params: { limite: 50, ...(before ? { antes_de: before } : {}) },
          signal: abort.signal,
        });
        if (!active) return;
        setConversation(data.conversa);
        // Reabrir carrega uma janela contínua de 50 mensagens. Eventos recebidos
        // durante a consulta são preservados; páginas antigas entram sob demanda.
        const live = liveDuringRefresh || [];
        setMessages((old) =>
          before
            ? mergeMessages(old, data.mensagens)
            : mergeMessages(data.mensagens, live),
        );
        setCursor(data.proximo_cursor);
      } catch (failure) {
        if (!active) return;
        if (failure.response?.status === 401) {
          await endSession();
          return;
        }
        if (failure.response?.status === 403) {
          setConversation(null);
          setMessages([]);
          setCursor(null);
          connection.current?.close();
          setStatus('Sem acesso');
        }
        setError(
          failure.response?.data?.mensagem ||
            'Não foi possível carregar o histórico. Tente novamente.',
        );
      } finally {
        loadingHistory = false;
        liveDuringRefresh = null;
        if (active) setLoading(false);
      }
    }
    refresh.current = history;
    function uncertain() {
      if (!pending.current) return;
      clearTimeout(pending.current.timer);
      pending.current = null;
      uncertainty.current = true;
      if (active) {
        setSending(false);
        setError(
          'Envio não confirmado. Confira o histórico antes de tentar novamente; seu texto foi mantido.',
        );
        history();
      }
    }
    setError(
      uncertainty.current
        ? 'Envio anterior não confirmado. Confira o histórico antes de tentar novamente.'
        : '',
    );
    setLoading(true);
    setStatus('Conectando…');
    async function start() {
      try {
        if (typeof conversationId !== 'string') throw new Error('Conversa inválida.');
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!active) return;
        if (!token) {
          await endSession();
          return;
        }
        connection.current = connectChat({
          url: websocketUrl(api.defaults.baseURL),
          token,
          WebSocketImpl: WebSocket,
          onStatus: (value) => {
            if (active) setStatus(value);
          },
          onAuthError: () => {
            endSession().catch(() => {});
          },
          onDisconnect: () => {
            if (active) {
              setLoading(false);
              uncertain();
            }
          },
          onEvent: (event) => {
            if (!active) return;
            if (event.type === 'auth_ok') {
              setUserId(event.id_usuario);
              history();
              return;
            }
            if (event.type === 'chat_error') {
              if (event.request_id === pending.current?.id) {
                clearTimeout(pending.current.timer);
                pending.current = null;
                setSending(false);
              }
              if (event.codigo === 'READ_ONLY')
                setConversation((old) => (old ? { ...old, somente_leitura: true } : old));
              if (['FORBIDDEN', 'USER_UNAVAILABLE'].includes(event.codigo)) history();
              setError(event.mensagem || 'Não foi possível enviar.');
              return;
            }
            const message = event.mensagem;
            if (
              !['chat_ack', 'chat_message'].includes(event.type) ||
              !message ||
              message.id_conversa !== conversationId
            )
              return;
            liveDuringRefresh?.push(message);
            setMessages((old) => mergeMessages(old, [message]));
            if (event.type === 'chat_ack' && event.request_id === pending.current?.id) {
              const sent = pending.current.text;
              clearTimeout(pending.current.timer);
              pending.current = null;
              uncertainty.current = false;
              setDraft((old) => (old.trim() === sent ? '' : old));
              setSending(false);
              setError('');
            }
          },
        });
      } catch {
        if (active) {
          setLoading(false);
          setStatus('Erro de conexão');
          setError('Confira o endereço da API e tente novamente.');
        }
      }
    }
    start();
    const poll = setInterval(() => {
      if (active && connection.current?.ready()) history();
    }, 15000);
    return () => {
      clearInterval(poll);
      active = false;
      abort.abort();
      refresh.current = null;
      connection.current?.close();
      connection.current = null;
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current = null;
        uncertainty.current = true;
        setSending(false);
      }
    };
  }, [focused, appActive, attempt, conversationId, navigation]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (
      !text ||
      text.length > 1000 ||
      pending.current ||
      !conversation ||
      conversation.somente_leitura
    )
      return;
    if (!connection.current?.ready()) {
      setError('Aguarde uma conexão autenticada.');
      return;
    }
    const id = `${Date.now()}-${++counter.current}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      connection.current.send({
        type: 'chat_message',
        request_id: id,
        id_conversa: conversationId,
        text,
      });
      const timer = setTimeout(() => {
        if (pending.current?.id !== id) return;
        pending.current = null;
        uncertainty.current = true;
        setSending(false);
        setError(
          'Envio não confirmado. Confira o histórico antes de tentar novamente; seu texto foi mantido.',
        );
        refresh.current?.();
      }, 15000);
      pending.current = { id, text, timer };
      setSending(true);
      setError('');
    } catch {
      setError('Não foi possível enviar. Seu texto foi mantido.');
    }
  }, [draft, conversation, conversationId]);

  return {
    messages,
    conversation,
    userId,
    status,
    loading,
    error,
    cursor,
    draft,
    setDraft,
    sending,
    send,
    retry: () => setAttempt((value) => value + 1),
    loadOlder: () => refresh.current?.(cursor),
  };
}
