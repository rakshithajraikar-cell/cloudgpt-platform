// Normalize API_BASE_URL: works in dev, production Vercel, and with or without custom env vars
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    let base = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    if (!base.endsWith("/api")) {
      base = `${base}/api`;
    }
    return base;
  }
  // If running in production browser on Vercel, automatically target live Render backend
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://cloudgpt-platform.onrender.com/api";
  }
  return "http://localhost:8000/api";
}


export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Citation {
  source: string;
  page: number;
  similarity_score: number;
  snippet: string;
}

export interface Message {
  id: string;
  conversation_id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens?: number;
  citations?: Citation[];
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_preview?: string;
  message_count?: number;
}

export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  num_chunks: number;
  created_at: string;
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("cloudgpt_token");
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("cloudgpt_token", token);
  }
}

export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("cloudgpt_token");
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(`${baseUrl}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = "An error occurred";
    try {
      const errData = await response.json();
      errMsg = errData.detail || errMsg;
    } catch {
      errMsg = response.statusText;
    }
    throw new Error(errMsg);
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  google: (credential: string) =>
    request("/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  getMe: () => request("/auth/me"),
};

// Chats API
export const chatsApi = {
  list: (searchQuery?: string): Promise<Conversation[]> =>
    request(`/chats/?${searchQuery ? `q=${encodeURIComponent(searchQuery)}` : ""}`),
  create: (title?: string): Promise<Conversation> =>
    request("/chats/", { method: "POST", body: JSON.stringify({ title: title || "New Chat" }) }),
  get: (chatId: string): Promise<{ id: string; title: string; messages: Message[] }> =>
    request(`/chats/${chatId}`),
  rename: (chatId: string, title: string): Promise<Conversation> =>
    request(`/chats/${chatId}`, { method: "PUT", body: JSON.stringify({ title }) }),
  delete: (chatId: string): Promise<{ message: string }> =>
    request(`/chats/${chatId}`, { method: "DELETE" }),
  getModels: () => request("/chats/models/available"),

  // SSE Streaming for Sending a Message
  sendMessageStream: async (
    chatId: string,
    payload: {
      content: string;
      provider?: string;
      model?: string;
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      system_prompt?: string;
      api_key?: string;
      use_rag?: boolean;
    },
    onToken: (token: string) => void,
    onCitations?: (citations: Citation[]) => void,
    onError?: (err: string) => void,
    onDone?: () => void
  ) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/chats/${chatId}/message`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Stream request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.slice(6);
          if (dataStr === "[DONE]") {
            if (onDone) onDone();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error && onError) {
              onError(parsed.error);
            }
            if (parsed.citations && onCitations) {
              onCitations(parsed.citations);
            }
            if (parsed.token) {
              onToken(parsed.token);
            }
          } catch {
            // ignore partial JSON parse errors
          }
        }
      }

      if (onDone) onDone();
    } catch (err: any) {
      if (onError) onError(err.message || "Failed to stream response");
    }
  },
};

// Documents API (RAG)
export const documentsApi = {
  list: (): Promise<{ documents: DocumentItem[]; total_active_chunks: number }> =>
    request("/documents/"),
  upload: async (file: File) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/documents/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "File upload failed");
    }
    return res.json();
  },
  delete: (docId: string) => request(`/documents/${docId}`, { method: "DELETE" }),
};
