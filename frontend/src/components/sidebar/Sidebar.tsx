"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { Conversation } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onOpenDocuments: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeDocCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onOpenDocuments,
  onOpenSettings,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  activeDocCount,
}) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(id);
  };

  const filtered = conversations.filter((c) =>
    searchQuery.trim()
      ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.last_message_preview &&
          c.last_message_preview.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80 w-64 md:w-72 shrink-0 select-none">
      {/* Brand & New Chat */}
      <div className="p-3.5 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-black text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-100 tracking-tight">CloudGPT</span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            onNewChat();
            setIsOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search Conversations Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-900 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Conversations ({filtered.length})
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-600">
            {searchQuery ? "No matching chats" : "No chats yet"}
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.id === activeChatId;
            const isEditingThis = editingId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => {
                  onSelectChat(c.id);
                  setIsOpen(false);
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isActive
                    ? "bg-slate-900 text-slate-100 font-medium border border-slate-800"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                }`}
              >
                {isEditingThis ? (
                  <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-slate-950 border border-indigo-500 text-slate-200 px-1.5 py-0.5 rounded text-xs w-full focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={(e) => handleSaveRename(c.id, e)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                      <span className="truncate">{c.title}</span>
                    </div>

                    {/* Action buttons visible on hover or when active */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(c, e)}
                        className="p-1 hover:text-slate-200 text-slate-500 transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(c.id, e)}
                        className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* RAG Documents Banner */}
      <div className="p-2 border-t border-slate-800/60">
        <button
          onClick={onOpenDocuments}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/40 hover:bg-emerald-950/40 text-emerald-300 text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">Knowledge Base</span>
          </div>
          <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded font-bold">
            {activeDocCount} {activeDocCount === 1 ? "doc" : "docs"}
          </span>
        </button>
      </div>

      {/* User Footer / Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
        {user ? (
          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full bg-slate-800 shrink-0 border border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user.name || user.email.split("@")[0]}
              </div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex-1 text-left text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            Sign in / Register
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {user && (
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <div className="md:hidden fixed top-3 left-3 z-30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 shadow-md"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop static sidebar */}
      <div className="hidden md:flex h-full">{sidebarContent}</div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex">
          {sidebarContent}
          <div className="flex-1" onClick={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
};
