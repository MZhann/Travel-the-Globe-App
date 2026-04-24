import { API_BASE } from './config';

export interface DirectMessage {
  _id: string;
  senderId: string;
  recipientId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DMUser {
  _id: string;
  email: string;
  displayName?: string;
}

export interface Conversation {
  otherUserId: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderId: string;
  unreadCount: number;
  otherUser: DMUser | null;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error('[messages] Invalid JSON:', text.slice(0, 200));
    throw new Error('Invalid response from server');
  }
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function getConversations(
  token: string
): Promise<{ conversations: Conversation[] }> {
  const res = await fetch(`${API_BASE}/messages/conversations`, {
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to fetch conversations');
  return json as unknown as { conversations: Conversation[] };
}

export async function getUnreadCount(token: string): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/messages/unread-count`, {
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to fetch unread count');
  return json as unknown as { count: number };
}

export async function getMessagesWith(
  token: string,
  userId: string
): Promise<{ messages: DirectMessage[]; otherUser: DMUser | null }> {
  const res = await fetch(`${API_BASE}/messages/${userId}`, {
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to fetch messages');
  return json as unknown as { messages: DirectMessage[]; otherUser: DMUser | null };
}

export async function sendDirectMessage(
  token: string,
  userId: string,
  message: string
): Promise<{ message: DirectMessage }> {
  const res = await fetch(`${API_BASE}/messages/${userId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message }),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to send message');
  return json as unknown as { message: DirectMessage };
}

export async function markConversationRead(
  token: string,
  userId: string
): Promise<{ modifiedCount: number }> {
  const res = await fetch(`${API_BASE}/messages/${userId}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  const json = await parseJson(res);
  if (!res.ok) throw new Error((json.error as string) || 'Failed to mark read');
  return json as unknown as { modifiedCount: number };
}
