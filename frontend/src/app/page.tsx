"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { DocumentModal } from "@/components/ui/DocumentModal";
import { AuthModal } from "@/components/ui/AuthModal";
import {
  Conversation,
  Message,
  Citation,
  chatsApi,
  documentsApi,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, token } = useAuth();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingToken, setStreamingToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDocCount, setActiveDocCount] = useState(0);
  const [useRag, setUseRag] = useState(true);

  // Settings
  const [selectedModel, setSelectedModel] = useState("GPT-OSS 20B");
  const [modelId, setModelId] = useState("openai/gpt-oss-20b");
  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an intelligent, helpful, and concise AI assistant running on CloudGPT."
  );

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Load conversations and documents on mount or auth change
  const refreshData = async () => {
    try {
      const convList = await chatsApi.list();
      setConversations(convList);
      if (!activeChatId && convList.length > 0) {
        selectChat(convList[0].id);
      }
    } catch {
      // ignore
    }

    try {
      const docData = await documentsApi.list();
      setActiveDocCount(docData.documents?.length || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshData();
  }, [token]);

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = localStorage.getItem("cloudgpt_provider") || "groq";
      let m = localStorage.getItem("cloudgpt_model") || "openai/gpt-oss-20b";
      // Auto-migrate if user was previously on decommissioned models
      if (
        m === "llama-3.3-70b-versatile" ||
        m === "llama-3.1-8b-instant" ||
        m === "llama3-8b-8192" ||
        m === "llama3-70b-8192"
      ) {
        m = "openai/gpt-oss-20b";
        localStorage.setItem("cloudgpt_model", m);
      }
      const k = localStorage.getItem("cloudgpt_api_key") || "";
      const t = parseFloat(localStorage.getItem("cloudgpt_temp") || "0.7");
      const s = localStorage.getItem("cloudgpt_system_prompt") || systemPrompt;

      setProvider(p);
      setModelId(m);
      setApiKey(k);
      setTemperature(t);
      setSystemPrompt(s);
      setSelectedModel(m.split("/").pop() || m);
    }
  }, []);

  const selectChat = async (id: string) => {
    setActiveChatId(id);
    setStreamingToken("");
    try {
      const detail = await chatsApi.get(id);
      setMessages(detail.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConv = await chatsApi.create("New Chat");
      setConversations((prev) => [newConv, ...prev]);
      setActiveChatId(newConv.id);
      setMessages([]);
      setStreamingToken("");
    } catch {
      setIsAuthOpen(true);
    }
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    try {
      const updated = await chatsApi.rename(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
    } catch (err: any) {
      alert(err.message || "Failed to rename chat");
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await chatsApi.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        if (remaining.length > 0) {
          selectChat(remaining[0].id);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete chat");
    }
  };

  const handleSendMessage = async (content: string) => {
    let currentId = activeChatId;

    // Create a chat if none is active
    if (!currentId) {
      try {
        const newConv = await chatsApi.create(content.slice(0, 30));
        setConversations((prev) => [newConv, ...prev]);
        currentId = newConv.id;
        setActiveChatId(newConv.id);
      } catch {
        setIsAuthOpen(true);
        return;
      }
    }

    // Append user message immediately to state
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingToken("");

    let accumulated = "";
    let receivedCitations: Citation[] = [];

    await chatsApi.sendMessageStream(
      currentId,
      {
        content,
        provider,
        model: modelId,
        api_key: apiKey,
        temperature,
        system_prompt: systemPrompt,
        use_rag: useRag,
      },
      (token) => {
        accumulated += token;
        setStreamingToken(accumulated);
      },
      (citations) => {
        receivedCitations = citations;
      },
      (error) => {
        accumulated += `\n\n⚠️ **Error:** ${error}`;
        setStreamingToken(accumulated);
      },
      () => {
        // Stream finished
        const finalContent =
          accumulated.trim() ||
          "⚠️ No response was received from the hosted endpoint. Please verify your API key in ⚙️ Settings.";
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: finalContent,
          citations: receivedCitations,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingToken("");
        setIsLoading(false);
        // Refresh conversations to update preview and title
        chatsApi.list().then(setConversations).catch(() => {});
      }
    );
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isLoading) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[copy.length - 1].role === "assistant") {
          copy.pop();
        }
        return copy;
      });
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleEditMessage = (index: number, newContent: string) => {
    // Truncate messages to this turn and send edited prompt
    const truncated = messages.slice(0, index);
    setMessages(truncated);
    handleSendMessage(newContent);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onOpenDocuments={() => setIsDocModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeDocCount={activeDocCount}
      />

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 relative">
        <ChatWindow
          messages={messages}
          streamingToken={streamingToken}
          isLoading={isLoading}
          onSelectPrompt={handleSendMessage}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
        />

        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          onOpenDocuments={() => setIsDocModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          selectedModel={selectedModel}
          useRag={useRag}
          onToggleRag={() => setUseRag(!useRag)}
          activeDocCount={activeDocCount}
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={(newSettings) => {
          setProvider(newSettings.provider);
          setModelId(newSettings.model);
          setSelectedModel(newSettings.model.split("/").pop() || newSettings.model);
          setApiKey(newSettings.apiKey);
          setTemperature(newSettings.temperature);
          setSystemPrompt(newSettings.systemPrompt);
        }}
      />

      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onDocumentsUpdated={refreshData}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
