"use client";

import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Citation } from "@/lib/api";

interface CitationCardProps {
  citations: Citation[];
}

export const CitationCard: React.FC<CitationCardProps> = ({ citations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 border border-emerald-800/40 bg-emerald-950/20 rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Verified Sources ({citations.length} document {citations.length === 1 ? "reference" : "references"})
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="p-3 pt-1 space-y-2 border-t border-emerald-900/30 text-xs">
          {citations.map((cite, idx) => (
            <div
              key={idx}
              className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 text-slate-300"
            >
              <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{cite.source}</span>
                  <span className="text-slate-400 font-normal">&bull; Page {cite.page}</span>
                </div>
                <span className="text-[10px] bg-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded">
                  Score: {Math.round(cite.similarity_score * 100)}%
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed italic bg-slate-950/50 p-2 rounded border border-slate-800/50">
                &ldquo;{cite.snippet}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
