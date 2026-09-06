"use client";

import React, { useRef, useEffect } from "react";
import { Message } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { Sparkles, Code2, BookOpen, Lightbulb } from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
  streamingToken: string;
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
  onRegenerate: () => void;
  onEditMessage: (index: number, newContent: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  streamingToken,
  isLoading,
  onSelectPrompt,
  onRegenerate,
  onEditMessage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages or streaming tokens arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingToken]);

  const starterCards = [
    {
      icon: BookOpen,
      title: "Document Knowledge RAG",
      desc: "Upload a PDF, TXT, or DOCX and ask questions with citations",
      prompt: "What are the core concepts covered in my uploaded documents?",
    },
    {
      icon: Code2,
      title: "Full-Stack Development",
      desc: "Write, review, or debug modern TypeScript, Python, and React code",
      prompt: "Write a high-performance Python function to debounce API calls with async/await",
    },
    {
      icon: Lightbulb,
      title: "Architectural Reasoning",
      desc: "Compare scalable cloud patterns, microservices, and databases",
      prompt: "Compare PostgreSQL pgvector vs Pinecone vs FAISS for high-throughput RAG",
    },
    {
      icon: Sparkles,
      title: "Creative Synthesis",
      desc: "Draft executive summaries, essays, or complex explanations",
      prompt: "Explain how Transformers and Self-Attention work using a vivid real-world analogy",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {messages.length === 0 && !streamingToken ? (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/20 mb-6">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">
            What can I help you discover today?
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Powered by hosted LLM inference & multi-format Document RAG.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
            {starterCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <button
                  key={i}
                  onClick={() => onSelectPrompt(card.prompt)}
                  className="p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-xl text-left transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-2.5 text-indigo-400 font-semibold text-sm mb-1 group-hover:text-indigo-300">
                    <Icon className="w-4 h-4" />
                    <span>{card.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{card.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {messages.map((msg, index) => {
            const isLatestAssistant =
              msg.role === "assistant" &&
              index === messages.length - 1 &&
              !isLoading &&
              !streamingToken;

            return (
              <MessageBubble
                key={msg.id || index}
                message={msg}
                isLatestAssistant={isLatestAssistant}
                onRegenerate={onRegenerate}
                onEdit={(newContent) => onEditMessage(index, newContent)}
              />
            );
          })}

          {/* Live Streaming Response Bubble */}
          {streamingToken && (
            <MessageBubble
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingToken,
              }}
            />
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      )}
    </div>
  );
};
