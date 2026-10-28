"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Mic,
  ArrowUp,
  ChevronDown,
  Bot,
  Layers,
  SlidersHorizontal,
  Package,
  FileText,
  TrendingUp,
  AlertTriangle,
  Search,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { icon: AlertTriangle, label: "Which medicines are low stock?", color: "text-rose-500" },
  { icon: FileText, label: "How many prescriptions are pending?", color: "text-teal-600" },
  { icon: TrendingUp, label: "Show dispensing trends this week", color: "text-indigo-500" },
  { icon: Package, label: "Give me a full inventory report", color: "text-amber-500" },
  { icon: Search, label: "What medicines are expiring soon?", color: "text-orange-500" },
  { icon: ClipboardList, label: "Show recent hardware alerts", color: "text-purple-500" },
];

interface Message {
  role: "user" | "agent";
  content: string;
}

/** Render **bold** markers as <strong> inline */
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Render a full message — split by newlines, handle bullets */
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-2" />;
        const isBullet = /^(\s*[•\-*]\s)/.test(line);
        const isNumbered = /^\s*\d+\.\s/.test(line);
        return (
          <div
            key={i}
            className={cn(
              "flex gap-1.5",
              (isBullet || isNumbered) && "items-start pl-1"
            )}
          >
            {renderContent(line)}
          </div>
        );
      })}
    </div>
  );
}

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const emptyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const stickyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-resize empty textarea
  useEffect(() => {
    if (emptyTextareaRef.current) {
      emptyTextareaRef.current.style.height = "auto";
      emptyTextareaRef.current.style.height = `${Math.min(
        emptyTextareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  // Auto-resize sticky textarea
  useEffect(() => {
    if (stickyTextareaRef.current) {
      stickyTextareaRef.current.style.height = "auto";
      stickyTextareaRef.current.style.height = `${Math.min(
        stickyTextareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [input]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : input;
    const query = rawText.trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", content: query };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const reply =
        data.reply ??
        "I'm sorry, I couldn't process that query. Please try again.";
      setMessages([...nextMessages, { role: "agent", content: reply }]);
    } catch (err: any) {
      console.error("Agent send error:", err);
      setMessages([
        ...nextMessages,
        {
          role: "agent",
          content:
            "⚠️ Unable to reach pharmacy agent service. Please verify your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasText = input.trim().length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)]">
      {messages.length === 0 ? (
        /* ── Empty State: Centered Hero + Input + Chips ── */
        <div className="flex flex-col items-center justify-center flex-1 px-4 pb-8 overflow-y-auto">
          <div className="w-full max-w-2xl flex flex-col items-center gap-7">
            {/* Heading */}
            <div className="text-center space-y-1">
              <h1 className="text-3xl sm:text-4xl font-light text-muted-foreground tracking-tight">
                Give{" "}
                <span className="font-bold text-foreground">PharmaLink AI</span>
              </h1>
              <p className="text-3xl sm:text-4xl font-light text-muted-foreground tracking-tight">
                something real to work on.
              </p>
            </div>

            {/* Main Center Input Box (Direct JSX, No unmounting subcomponent) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="w-full rounded-2xl border border-border bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all duration-150"
            >
              <textarea
                ref={emptyTextareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stock, prescriptions, alerts… (Enter to send)"
                rows={2}
                className="w-full resize-none px-4 pt-3.5 pb-2 text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60 min-h-[72px] max-h-[200px]"
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-secondary/30">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Attach file"
                  >
                    <Paperclip className="size-4" />
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <span>PharmaLink AI</span>
                    <ChevronDown className="size-3" />
                  </button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Layers className="size-3.5" />
                    <span className="hidden sm:inline">Pharmacy environment</span>
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                  </button>

                  <button
                    type="button"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span>Scope</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Voice input"
                  >
                    <Mic className="size-4" />
                  </button>

                  <button
                    type="submit"
                    disabled={!hasText || loading}
                    className={cn(
                      "inline-flex items-center justify-center size-8 rounded-full transition-all duration-200 cursor-pointer",
                      hasText && !loading
                        ? "bg-foreground text-background hover:bg-foreground/85 shadow-xs scale-100"
                        : "bg-muted text-muted-foreground/60 cursor-not-allowed opacity-60"
                    )}
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => sendMessage(s.label)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 transition-all duration-150 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Icon className={cn("size-3.5 shrink-0", s.color)} />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Conversation State: Scrollable Chat + Bottom Sticky Input ── */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-5">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "agent" && (
                    <div className="shrink-0 size-7 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mt-0.5">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 shadow-xs",
                      msg.role === "user"
                        ? "bg-foreground text-background rounded-br-sm text-sm"
                        : "bg-white border border-border text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.role === "agent" ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <span className="text-sm">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 size-7 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                    <Bot className="size-3.5 text-primary" />
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-xs">
                    <div className="flex gap-1 items-center h-5">
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Sticky Bottom Input Bar */}
          <div className="border-t border-border bg-background px-4 py-3 shrink-0">
            <div className="mx-auto max-w-2xl">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="w-full rounded-2xl border border-border bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all duration-150"
              >
                <textarea
                  ref={stickyTextareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about stock, prescriptions, alerts… (Enter to send)"
                  rows={1}
                  className="w-full resize-none px-4 pt-3 pb-2 text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60 min-h-[44px] max-h-[140px]"
                />

                <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-secondary/30">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Attach file"
                    >
                      <Paperclip className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Layers className="size-3" />
                      <span>Pharmacy environment</span>
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Voice input"
                    >
                      <Mic className="size-3.5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!hasText || loading}
                      className={cn(
                        "inline-flex items-center justify-center size-7 rounded-full transition-all duration-200 cursor-pointer",
                        hasText && !loading
                          ? "bg-foreground text-background hover:bg-foreground/85 shadow-xs"
                          : "bg-muted text-muted-foreground/60 cursor-not-allowed opacity-60"
                      )}
                      aria-label="Send message"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
