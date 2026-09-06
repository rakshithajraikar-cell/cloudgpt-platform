"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Key, Sliders, ShieldCheck } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (settings: {
    provider: string;
    model: string;
    apiKey: string;
    temperature: number;
    systemPrompt: string;
  }) => void;
}

const PERSONA_PRESETS = [
  {
    name: "🤖 General Assistant",
    prompt: "You are an intelligent, helpful, and concise AI assistant running on CloudGPT.",
  },
  {
    name: "💻 Senior Software Engineer",
    prompt:
      "You are a Senior Principal Software Engineer. Provide clean, idiomatic, well-commented code with concise explanations. Emphasize performance, edge cases, and best practices.",
  },
  {
    name: "🎓 Expert AI Tutor",
    prompt:
      "You are an expert AI and Computer Science professor. Explain complex concepts in simple terms using intuitive real-world analogies, step-by-step breakdowns, and verify understanding.",
  },
  {
    name: "⚡ Concise & Direct",
    prompt:
      "You are a direct, concise AI assistant. Answer immediately with crisp bullet points. Avoid filler words, polite preambles, and conversational fluff.",
  },
  {
    name: "📝 Creative Storyteller",
    prompt:
      "You are a creative writer and storyteller. Use rich metaphors, vivid descriptive language, and engaging narrative flow.",
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState("openai/gpt-oss-20b");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [selectedPersona, setSelectedPersona] = useState(PERSONA_PRESETS[0].name);
  const [systemPrompt, setSystemPrompt] = useState(PERSONA_PRESETS[0].prompt);

  // Load from localStorage on open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProvider = localStorage.getItem("cloudgpt_provider") || "groq";
      const savedModel = localStorage.getItem("cloudgpt_model") || "openai/gpt-oss-20b";
      const savedKey = localStorage.getItem("cloudgpt_api_key") || "";
      const savedTemp = parseFloat(localStorage.getItem("cloudgpt_temp") || "0.7");
      const savedPrompt = localStorage.getItem("cloudgpt_system_prompt") || PERSONA_PRESETS[0].prompt;

      setProvider(savedProvider);
      setModel(savedModel);
      setApiKey(savedKey);
      setTemperature(savedTemp);
      setSystemPrompt(savedPrompt);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cloudgpt_provider", provider);
      localStorage.setItem("cloudgpt_model", model);
      localStorage.setItem("cloudgpt_api_key", apiKey.trim());
      localStorage.setItem("cloudgpt_temp", temperature.toString());
      localStorage.setItem("cloudgpt_system_prompt", systemPrompt);
    }
    onSettingsSaved({
      provider,
      model,
      apiKey: apiKey.trim(),
      temperature,
      systemPrompt,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Model & Inference Settings</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure your hosted LLM provider, API keys, and system instructions.
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
        <div className="p-5 space-y-4 text-xs">
          {/* Provider Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              Hosted LLM Provider:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "groq", name: "Groq (Free & Fast)" },
                { id: "openrouter", name: "OpenRouter" },
                { id: "openai", name: "OpenAI" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id);
                    if (p.id === "groq") setModel("llama-3.1-8b-instant");
                    if (p.id === "openrouter") setModel("meta-llama/llama-3.3-70b-instruct");
                    if (p.id === "openai") setModel("gpt-4o-mini");
                  }}
                  className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                    provider === p.id
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-medium">
                Model Endpoint ID:
              </label>
              <span className="text-[10px] text-slate-500">
                Choose preset or enter any model
              </span>
            </div>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value.trim())}
              placeholder="e.g. llama3-8b-8192 or llama-3.1-8b-instant"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {provider === "groq" &&
                [
                  "openai/gpt-oss-20b",
                  "qwen/qwen3.8-27b",
                  "allam-2-7b",
                  "canopylabs/orpheus-v1-english",
                ].map((mId) => (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => setModel(mId)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                      model === mId
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {mId}
                  </button>
                ))}
              {provider === "openrouter" &&
                [
                  "meta-llama/llama-3.3-70b-instruct",
                  "deepseek/deepseek-r1",
                  "google/gemini-2.0-flash-exp:free",
                ].map((mId) => (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => setModel(mId)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                      model === mId
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {mId.split("/").pop()}
                  </button>
                ))}
              {provider === "openai" &&
                ["gpt-4o-mini", "gpt-4o"].map((mId) => (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => setModel(mId)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                      model === mId
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {mId}
                  </button>
                ))}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>{provider.toUpperCase()} API Key:</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {provider === "groq" && "Get free key at console.groq.com"}
              </span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Paste your ${provider.toUpperCase()} API key (or leave blank to use server default)...`}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Keys are stored locally in your browser and sent securely via encrypted headers.</span>
            </p>
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex justify-between text-slate-300 font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Temperature (Creativity):</span>
              </span>
              <span className="text-indigo-400 font-mono">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>0.0 (Strict & Factual)</span>
              <span>0.7 (Balanced)</span>
              <span>1.5 (Creative)</span>
            </div>
          </div>

          {/* Persona Presets */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              System Persona:
            </label>
            <select
              value={selectedPersona}
              onChange={(e) => {
                const pName = e.target.value;
                setSelectedPersona(pName);
                const found = PERSONA_PRESETS.find((p) => p.name === pName);
                if (found) setSystemPrompt(found.prompt);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 mb-2"
            >
              {PERSONA_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none text-[11px] leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-md shadow-indigo-600/20"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
