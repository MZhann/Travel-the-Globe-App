import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AuthUser } from '../api/auth';

interface ChatMsg {
  _id: string;
  userId: string;
  displayName: string;
  message: string;
  createdAt: string;
}

interface GlobalChatProps {
  getToken: () => string | null;
  user: AuthUser;
}

function getSocketUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '');
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return window.location.origin;
}

export default function GlobalChat({ getToken, user }: GlobalChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [online, setOnline] = useState(0);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);

  openRef.current = open;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:history', (msgs: ChatMsg[]) => {
      setMessages(msgs);
    });

    socket.on('chat:message', (msg: ChatMsg) => {
      setMessages((prev) => [...prev, msg]);
      if (!openRef.current) {
        setUnread((n) => n + 1);
      }
    });

    socket.on('chat:online', (count: number) => {
      setOnline(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [getToken]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || !socketRef.current) return;
    socketRef.current.emit('chat:send', {
      message: trimmed,
      displayName: user.displayName || user.email.split('@')[0],
    });
    setInput('');
  }, [input, user]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitial = (name: string) => name[0]?.toUpperCase() ?? '?';

  const avatarColors = [
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-amber-500',
    'from-red-500 to-rose-500',
    'from-teal-500 to-green-500',
    'from-indigo-500 to-violet-500',
    'from-yellow-500 to-orange-500',
  ];

  const getAvatarColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  let lastDateLabel = '';

  return (
    <>
      {/* Chat toggle button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        title="Global Chat"
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-4 z-30 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-globe-ocean/95 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Global Chat</h3>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
                  />
                  <span className="text-xs text-slate-400">
                    {connected ? `${online} online` : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">No messages yet</p>
                <p className="mt-1 text-xs text-slate-500">Be the first to say hello!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.userId === user.id;
              const dateLabel = formatDate(msg.createdAt);
              let showDateSeparator = false;
              if (dateLabel !== lastDateLabel) {
                showDateSeparator = true;
                lastDateLabel = dateLabel;
              }

              const prevMsg = i > 0 ? messages[i - 1] : null;
              const isConsecutive = prevMsg?.userId === msg.userId && !showDateSeparator;

              return (
                <div key={msg._id}>
                  {showDateSeparator && (
                    <div className="my-3 flex items-center gap-3">
                      <div className="flex-1 border-t border-white/5" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                        {dateLabel}
                      </span>
                      <div className="flex-1 border-t border-white/5" />
                    </div>
                  )}
                  <div
                    className={`flex gap-2.5 ${isConsecutive ? 'mt-0.5' : 'mt-3'} ${
                      isOwn ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {!isConsecutive ? (
                      <div
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${getAvatarColor(
                          msg.userId
                        )}`}
                        title={msg.displayName}
                      >
                        {getInitial(msg.displayName)}
                      </div>
                    ) : (
                      <div className="w-7 flex-shrink-0" />
                    )}
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isConsecutive && (
                        <div
                          className={`mb-0.5 flex items-center gap-2 text-[11px] ${
                            isOwn ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span className={`font-medium ${isOwn ? 'text-blue-400' : 'text-slate-300'}`}>
                            {isOwn ? 'You' : msg.displayName}
                          </span>
                          <span className="text-slate-600">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                          isOwn
                            ? 'rounded-tr-md bg-blue-600/80 text-white'
                            : 'rounded-tl-md bg-white/10 text-slate-200'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                maxLength={1000}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500/50 focus:bg-white/10"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || !connected}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      )}
    </>
  );
}
