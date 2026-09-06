"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, Sparkles, BookOpen } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  onOpenDocuments: () => void;
  onOpenSettings: () => void;
  selectedModel: string;
  useRag: boolean;
  onToggleRag: () => void;
  activeDocCount: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading,
  onOpenDocuments,
  onOpenSettings,
  selectedModel,
  useRag,
  onToggleRag,
  activeDocCount,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Status Badges */}
      <div className="flex items-center justify-between gap-2 px-1 mb-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {/* Model badge */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-full transition-colors"
            title="Change model or settings"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="font-medium text-[11px] truncate max-w-[140px]">{selectedModel}</span>
          </button>

          {/* RAG Toggle */}
          <button
            onClick={onToggleRag}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
              useRag && activeDocCount > 0
                ? "bg-emerald-950/60 border-emerald-800/60 text-emerald-300"
                : "bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
            title="Toggle Document RAG Search"
          >
            <BookOpen className="w-3 h-3" />
            <span>RAG: {useRag && activeDocCount > 0 ? `Active (${activeDocCount} docs)` : "Off"}</span>
          </button>
        </div>

        {/* Upload documents trigger */}
        <button
          onClick={onOpenDocuments}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <Paperclip className="w-3 h-3" />
          <span>Upload Files</span>
        </button>
      </div>

      {/* Input container */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-slate-900/90 border border-slate-800 focus-within:border-indigo-500/60 rounded-2xl shadow-xl transition-all"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything or search your documents..."
          rows={1}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm px-4 pt-3.5 pb-12 focus:outline-none resize-none leading-relaxed"
        />

        {/* Bottom toolbar */}
        <div className="absolute left-3 bottom-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDocuments}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Attach Document (PDF, DOCX, TXT, CSV, JSON)"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute right-3 bottom-2.5 flex items-center">
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl text-white transition-all flex items-center justify-center ${
              input.trim() && !isLoading
                ? "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
            title="Send Message (Enter)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="text-center mt-2 text-[10px] text-slate-500">
        CloudGPT uses hosted AI models. Check important info. Supports PDF, DOCX, TXT, CSV, and JSON RAG.
      </div>
    </div>
  );
};
