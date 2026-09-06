"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RotateCcw, Edit3, Bot, User as UserIcon } from "lucide-react";
import { Message } from "@/lib/api";
import { CitationCard } from "./CitationCard";

interface MessageBubbleProps {
  message: Message;
  isLatestAssistant?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLatestAssistant,
  onRegenerate,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(message.content);

  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editPrompt.trim() && onEdit) {
      onEdit(editPrompt.trim());
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`py-5 px-4 md:px-6 transition-colors ${
        isUser ? "bg-slate-900/40" : "bg-slate-950/70 border-y border-slate-800/30"
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <UserIcon className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/10">
              <Bot className="w-4 h-4 text-slate-950" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">
              {isUser ? "You" : "CloudGPT Assistant"}
            </span>
          </div>

          {/* Body */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-y min-h-[90px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition-colors"
                >
                  Save & Resend
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre({ children }: any) {
                    return <>{children}</>;
                  },
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");
                    const isBlock = Boolean(match) || codeString.includes("\n");

                    if (isBlock) {
                      return (
                        <div className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 not-prose">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                            <span>{match ? match[1] : "code"}</span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(codeString)}
                              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          </div>
                          <pre className="p-3 text-xs overflow-x-auto text-emerald-400 font-mono m-0 bg-transparent">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <code className="bg-slate-800/80 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Citations if available */}
          {!isUser && message.citations && message.citations.length > 0 && (
            <CitationCard citations={message.citations} />
          )}

          {/* Action Bar */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-3 pt-2 text-slate-500 text-xs">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 hover:text-slate-300 rounded transition-colors"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {isUser && onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 hover:text-slate-300 rounded transition-colors"
                  title="Edit prompt"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {!isUser && isLatestAssistant && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 hover:text-slate-300 rounded transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
