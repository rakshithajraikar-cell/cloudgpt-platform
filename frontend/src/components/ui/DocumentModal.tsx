"use client";

import React, { useState, useEffect } from "react";
import { X, UploadCloud, Trash2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { documentsApi, DocumentItem } from "@/lib/api";

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentsUpdated: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onDocumentsUpdated,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDocs = async () => {
    try {
      const data = await documentsApi.list();
      setDocuments(data.documents || []);
      setTotalChunks(data.total_active_chunks || 0);
    } catch {
      // ignore if unauthenticated yet
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
      setStatusMsg(null);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMsg(null);
    try {
      const res = await documentsApi.upload(file);
      setStatusMsg({
        text: `Indexed "${res.filename}" into ${res.num_chunks} vector chunks!`,
        type: "success",
      });
      fetchDocs();
      onDocumentsUpdated();
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Upload failed",
        type: "error",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await documentsApi.delete(docId);
      fetchDocs();
      onDocumentsUpdated();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Delete failed", type: "error" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>📁 Document Knowledge Base (RAG)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload files to ground answers with verified citations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Upload Dropzone */}
          <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/50 hover:bg-slate-950/80 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
            <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-sm font-medium text-slate-200">
              {isUploading ? "Vectorizing document..." : "Click to upload files"}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Supports PDF, DOCX, TXT, CSV, JSON (up to 15MB)
            </span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
              className="hidden"
            />
          </label>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`flex items-center gap-2 text-xs p-3 rounded-lg border ${
                statusMsg.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800/60 text-rose-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Active Documents List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Active Documents ({documents.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Total Chunks: <b>{totalChunks}</b>
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-6 border border-slate-800/60 rounded-xl bg-slate-950/30 text-xs text-slate-500">
                No documents uploaded yet. Upload a file above to enable RAG!
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-slate-200 font-medium truncate">{doc.filename}</div>
                        <div className="text-[10px] text-slate-500">
                          {doc.file_type.toUpperCase()} &bull; {(doc.file_size / 1024).toFixed(1)} KB &bull; {doc.num_chunks} chunks
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
