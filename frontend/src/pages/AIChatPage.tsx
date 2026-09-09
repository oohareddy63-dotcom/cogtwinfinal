import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Send, Loader2, Sparkles, User, RefreshCw } from "lucide-react";
import { aiApi } from "@/lib/api";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const SUGGESTED = [
  "How can I improve my memory score?",
  "What does my cognitive trend mean?",
  "Why is my reaction time declining?",
  "How often should I take the tests?",
  "What lifestyle changes help brain health?",
  "Explain my anomaly results",
];

const AIChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      content: "Hi! I'm your CogTwin AI assistant powered by Google Gemini. I can answer questions about your cognitive health, explain your test results, and give personalized advice. What would you like to know?",
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text };
    const loadingMsg: Message = { id: Date.now() + 1, role: "assistant", content: "", loading: true };

    setMessages((m) => [...m, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const { answer } = await aiApi.ask(text);
      setMessages((m) =>
        m.map((msg) => msg.loading ? { ...msg, content: answer, loading: false } : msg)
      );
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Failed to get response";
      setMessages((m) =>
        m.map((msg) => msg.loading
          ? { ...msg, content: `Sorry, I couldn't process that. ${err}`, loading: false }
          : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="min-h-screen pt-20 pb-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            CogTwin AI Assistant
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-normal">
              Gemini · Flash
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">Ask anything about your cognitive health</p>
        </div>
        <button
          onClick={() => setMessages([{
            id: 0, role: "assistant",
            content: "Hi! I'm your CogTwin AI assistant powered by Google Gemini. How can I help you today?",
          }])}
          className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Clear chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 glass-card p-4 overflow-y-auto space-y-4 mb-4 min-h-[400px] max-h-[60vh]">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant" ? "gradient-btn" : "bg-muted"
              }`}>
                {msg.role === "assistant"
                  ? <Sparkles className="w-4 h-4" />
                  : <User className="w-4 h-4 text-muted-foreground" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-sm"
                  : "bg-muted/40 text-foreground rounded-tl-sm border border-border/20"
              }`}>
                {msg.loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking…</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-muted/40 border border-border/20 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your cognitive health…"
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="gradient-btn px-4 py-3 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

export default AIChatPage;
