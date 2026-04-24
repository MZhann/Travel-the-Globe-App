import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AuthUser } from '../api/auth';
import type { Conversation, DirectMessage, DMUser } from '../api/messages';
import {
  getConversations,
  getMessagesWith,
  markConversationRead,
  sendDirectMessage,
} from '../api/messages';

interface Props {
  getToken: () => string | null;
  user: AuthUser;
  initialPeerId?: string | null;
  initialPeerName?: string | null;
  onViewProfile?: (userId: string) => void;
  onClose: () => void;
}

function getSocketUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return window.location.origin;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-amber-500',
  'from-red-500 to-rose-500',
  'from-teal-500 to-green-500',
  'from-indigo-500 to-violet-500',
  'from-yellow-500 to-orange-500',
];

function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function displayNameOf(u: DMUser | null | undefined, fallbackId = ''): string {
  if (!u) return 'User';
  return u.displayName || u.email?.split('@')[0] || fallbackId.slice(0, 6) || 'User';
}

export default function DirectMessages({
  getToken,
  user,
  initialPeerId,
  initialPeerName,
  onViewProfile,
  onClose,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [activePeerId, setActivePeerId] = useState<string | null>(initialPeerId ?? null);
  const [activePeer, setActivePeer] = useState<DMUser | null>(
    initialPeerId
      ? { _id: initialPeerId, email: '', displayName: initialPeerName ?? undefined }
      : null
  );
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activePeerRef = useRef<string | null>(activePeerId);
  activePeerRef.current = activePeerId;

  const loadConversations = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await getConversations(token);
      setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConv(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const openThread = useCallback(
    async (peerId: string, peerUser?: DMUser | null) => {
      setActivePeerId(peerId);
      setActivePeer(peerUser ?? null);
      setLoadingMsgs(true);
      setMessages([]);
      const token = getToken();
      if (!token) return;
      try {
        const data = await getMessagesWith(token, peerId);
        setMessages(data.messages);
        if (data.otherUser) setActivePeer(data.otherUser);
        setConversations((prev) =>
          prev.map((c) => (c.otherUserId === peerId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMsgs(false);
      }
    },
    [getToken]
  );

  // Auto-open thread if a peer was requested on mount
  useEffect(() => {
    if (initialPeerId) {
      openThread(initialPeerId, activePeer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPeerId]);

  // Real-time socket handling
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = io(getSocketUrl(), { auth: { token } });
    socketRef.current = socket;

    socket.on('dm:message', (msg: DirectMessage) => {
      const activeId = activePeerRef.current;
      const peerId = msg.senderId === user.id ? msg.recipientId : msg.senderId;

      if (peerId === activeId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        // Mark as read if I'm the recipient
        if (msg.recipientId === user.id) {
          markConversationRead(token, peerId).catch(() => {});
        }
      }

      // Update conversation list in-place
      setConversations((prev) => {
        const existing = prev.find((c) => c.otherUserId === peerId);
        if (existing) {
          const unreadDelta =
            msg.recipientId === user.id && peerId !== activeId ? 1 : 0;
          const updated: Conversation = {
            ...existing,
            lastMessage: msg.message,
            lastMessageAt: msg.createdAt,
            lastSenderId: msg.senderId,
            unreadCount: existing.unreadCount + unreadDelta,
          };
          return [updated, ...prev.filter((c) => c.otherUserId !== peerId)];
        }
        // New conversation: refresh from server to get user details
        loadConversations();
        return prev;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [getToken, user.id, loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activePeerId || sending) return;
    const token = getToken();
    if (!token) return;
    setSending(true);
    try {
      await sendDirectMessage(token, activePeerId, text);
      setInput('');
      // The socket event will append the message; no optimistic append needed
    } catch (err) {
      console.error('Failed to send DM:', err);
    } finally {
      setSending(false);
    }
  }, [input, activePeerId, sending, getToken]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  let lastDateLabel = '';

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch bg-black/70 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-5xl flex-col border-l border-white/10 bg-globe-ocean/95 shadow-2xl md:flex-row">
        {/* Sidebar: conversation list */}
        <aside className="flex w-full flex-col border-b border-white/10 md:w-80 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">Direct Messages</h2>
              <p className="text-xs text-slate-400">Private 1-on-1 chats</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : conversations.length === 0 && !activePeerId ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center text-slate-500">
                <span className="text-4xl">✉️</span>
                <p className="mt-2 text-sm">No conversations yet</p>
                <p className="mt-1 text-xs">
                  Open any user's profile and click "Message" to start chatting.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {/* If a peer was opened from an external entry point but no conversation exists yet, show placeholder row */}
                {activePeerId &&
                  !conversations.some((c) => c.otherUserId === activePeerId) && (
                    <li>
                      <button
                        onClick={() => {
                          if (activePeerId) openThread(activePeerId, activePeer);
                        }}
                        className="w-full bg-blue-500/10 px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${getAvatarGradient(
                              activePeerId
                            )}`}
                          >
                            {displayNameOf(activePeer, activePeerId)[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {displayNameOf(activePeer, activePeerId)}
                            </p>
                            <p className="truncate text-xs text-slate-500">New conversation</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )}
                {conversations.map((c) => {
                  const active = c.otherUserId === activePeerId;
                  const isMineLast = c.lastSenderId === user.id;
                  return (
                    <li key={c.otherUserId}>
                      <button
                        onClick={() => openThread(c.otherUserId, c.otherUser)}
                        className={`w-full px-4 py-3 text-left transition ${
                          active ? 'bg-blue-500/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${getAvatarGradient(
                              c.otherUserId
                            )}`}
                          >
                            {displayNameOf(c.otherUser, c.otherUserId)[0]?.toUpperCase()}
                            {c.unreadCount > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-white">
                                {displayNameOf(c.otherUser, c.otherUserId)}
                              </p>
                              <span className="flex-shrink-0 text-[10px] text-slate-500">
                                {formatTime(c.lastMessageAt)}
                              </span>
                            </div>
                            <p
                              className={`truncate text-xs ${
                                c.unreadCount > 0 && !isMineLast
                                  ? 'font-medium text-slate-200'
                                  : 'text-slate-500'
                              }`}
                            >
                              {isMineLast ? 'You: ' : ''}
                              {c.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Main: thread */}
        <section className="flex min-h-0 flex-1 flex-col bg-globe-bg/30">
          {/* Thread header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-5 py-4 backdrop-blur">
            {activePeerId ? (
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${getAvatarGradient(
                    activePeerId
                  )}`}
                >
                  {displayNameOf(activePeer, activePeerId)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {displayNameOf(activePeer, activePeerId)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activePeer?.email || 'Private conversation'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a conversation</p>
            )}
            <div className="flex items-center gap-2">
              {activePeerId && onViewProfile && (
                <button
                  onClick={() => onViewProfile(activePeerId)}
                  className="hidden rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 md:block"
                >
                  View profile
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close direct messages"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!activePeerId ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="text-5xl">💬</span>
                <p className="mt-3 text-slate-400">Your messages will appear here</p>
                <p className="mt-1 text-sm text-slate-600">
                  Pick a conversation on the left to continue chatting.
                </p>
              </div>
            ) : loadingMsgs ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="text-5xl">👋</span>
                <p className="mt-3 text-slate-300">
                  Say hi to {displayNameOf(activePeer, activePeerId)}!
                </p>
                <p className="mt-1 text-sm text-slate-500">No messages yet.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isOwn = msg.senderId === user.id;
                const label = formatDateGroup(msg.createdAt);
                let showSep = false;
                if (label !== lastDateLabel) {
                  showSep = true;
                  lastDateLabel = label;
                }
                const prev = i > 0 ? messages[i - 1] : null;
                const consecutive = prev?.senderId === msg.senderId && !showSep;
                return (
                  <div key={msg._id}>
                    {showSep && (
                      <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 border-t border-white/5" />
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                          {label}
                        </span>
                        <div className="flex-1 border-t border-white/5" />
                      </div>
                    )}
                    <div
                      className={`flex ${consecutive ? 'mt-0.5' : 'mt-3'} ${
                        isOwn ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? 'rounded-tr-md bg-blue-600 text-white'
                            : 'rounded-tl-md bg-white/10 text-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className="mt-0.5 text-right text-[10px] opacity-60">
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          {activePeerId && (
            <div className="border-t border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={`Message ${displayNameOf(activePeer, activePeerId)}…`}
                  maxLength={2000}
                  disabled={sending}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500/50 focus:bg-white/10 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40"
                  aria-label="Send"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
