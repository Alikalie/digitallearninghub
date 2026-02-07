import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { DLH_COURSES } from "@/lib/courses";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  Plus,
  MessageSquare,
  Trash2,
  GraduationCap,
  User,
  History,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/hooks/useVoice";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    searchParams.get("session")
  );
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoice();

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(data || []);
  };

  const loadMessages = async (sessionId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(
      data?.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })) || []
    );
  };

  const createNewSession = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: "New Chat" })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create chat session");
      return null;
    }

    setSessions((prev) => [data, ...prev]);
    return data.id;
  };

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    const title =
      firstMessage.length > 50
        ? firstMessage.substring(0, 50) + "..."
        : firstMessage;

    await supabase
      .from("chat_sessions")
      .update({ title })
      .eq("id", sessionId);

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
    );
  };

  const saveMessage = async (
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ) => {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role,
      content,
    });
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      toast.error("Failed to delete chat");
      return;
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
      setSearchParams({});
    }
    toast.success("Chat deleted");
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setSearchParams({});
    setShowHistory(false);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSearchParams({ session: sessionId });
    setShowHistory(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Create session if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        setIsLoading(false);
        return;
      }
      setCurrentSessionId(sessionId);
      setSearchParams({ session: sessionId });
    }

    // Add user message to UI
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);

    // Save user message
    await saveMessage(sessionId, "user", userMessage);

    // Update title if first message
    if (messages.length === 0) {
      await updateSessionTitle(sessionId, userMessage);
    }

    // Stream AI response
    const courseId = searchParams.get("course");
    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, newUserMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          courseId: courseId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let textBuffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await saveMessage(sessionId, "assistant", assistantContent);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to get AI response");
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* History sidebar (mobile overlay / desktop fixed) */}
        <div
          className={cn(
            "fixed inset-y-16 left-0 z-30 w-72 bg-card border-r border-border transform transition-transform lg:relative lg:inset-0 lg:transform-none",
            showHistory ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            "hidden lg:block"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
              <Button onClick={handleNewChat} className="w-full bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                      currentSessionId === session.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{session.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile history toggle */}
          <div className="lg:hidden flex items-center gap-2 p-3 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History size={18} />
            </Button>
            <span className="text-sm font-medium truncate">
              {currentSessionId
                ? sessions.find((s) => s.id === currentSessionId)?.title
                : "New Chat"}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="ml-auto">
              <Plus size={18} />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && (() => {
                const courseId = searchParams.get("course");
                const activeCourse = courseId ? DLH_COURSES.find(c => c.id === courseId) : null;
                return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="text-primary-foreground" size={32} />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">
                    {activeCourse ? `Welcome to ${activeCourse.title}` : "Welcome to DLH Smart Tutor"}
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {activeCourse
                      ? `Your AI tutor is ready to teach you ${activeCourse.title}. Ask anything about ${activeCourse.topics.join(", ")}!`
                      : "I'm your AI learning assistant. Ask me anything about your studies, homework, or any topic you want to learn about!"}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {(activeCourse
                      ? activeCourse.topics.slice(0, 4).map(t => `Teach me about ${t}`)
                      : [
                          "What is Digital Learning Hub?",
                          "Help me learn graphic design",
                          "How can I start freelancing in Sierra Leone?",
                          "Tell me about DLH courses",
                        ]
                    ).map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-4 py-2 rounded-full bg-muted text-sm hover:bg-muted/80 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </motion.div>
                );
              })()}

              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="text-primary-foreground" size={16} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                        {message.content && (
                          <button
                            onClick={() => isSpeaking ? stopSpeaking() : speak(message.content)}
                            className="mt-1 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                          >
                            {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                            {isSpeaking ? "Stop" : "Listen"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="text-secondary-foreground" size={16} />
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <GraduationCap className="text-primary-foreground" size={16} />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-[52px] w-[52px] flex-shrink-0", isListening && "text-destructive animate-pulse")}
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening((text) => setInput((prev) => prev + (prev ? " " : "") + text));
                  }
                }}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </Button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                className="min-h-[52px] max-h-32 resize-none input-focus"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-primary hover:opacity-90 h-[52px] px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile history overlay */}
        {showHistory && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setShowHistory(false)}
          />
        )}

        {/* Mobile history panel */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 bg-card border-r border-border transform transition-transform lg:hidden",
            showHistory ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Chat History</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
                <X size={18} />
              </Button>
            </div>
            <div className="p-4 border-b border-border">
              <Button onClick={handleNewChat} className="w-full bg-gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                      currentSessionId === session.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <span className="flex-1 truncate text-sm">{session.title}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
