"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  User,
  Loader2,
  RefreshCw,
  Eraser,
  WifiOff,
  ArrowDown,
} from "lucide-react";
import { Location, Crop, WeatherData, FirebaseSensorData } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  location: Location | null;
  crop: Crop | null;
  weather: WeatherData | null;
  sensorData: FirebaseSensorData | null;
}

export function AIChat({ location, crop, weather, sensorData }: AIChatProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // auto-scroll logic
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const crop_nameAz = crop?.nameAz || "Kənd təsərrüfatı";

  const scrollToBottom = useCallback((smooth = true) => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleViewportScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const threshold = 120;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance < threshold;
    setAutoScroll(nearBottom);
    setShowJumpToBottom(!nearBottom);
  }, []);

  // Attach viewport ref (Radix ScrollArea viewport)
  const onScrollAreaMount = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const viewport = node.querySelector<HTMLDivElement>(
        "[data-radix-scroll-area-viewport]",
      );
      if (!viewport) return;

      // cleanup old listener if any
      if (viewportRef.current && viewportRef.current !== viewport) {
        viewportRef.current.removeEventListener("scroll", handleViewportScroll);
      }

      viewportRef.current = viewport;
      viewport.addEventListener("scroll", handleViewportScroll, {
        passive: true,
      });
      setTimeout(() => scrollToBottom(false), 0);
    },
    [handleViewportScroll, scrollToBottom],
  );

  // connection check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: true }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Server xətası");
        }

        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Salam! Mən **AgriSense AI** köməkçisiyəm. 🌾\n\n**${crop_nameAz}** ilə bağlı nə sualınız var?`,
          },
        ]);
        setConnectionError(null);
      } catch (err) {
        console.error("AI Connection Failed:", err);
        setConnectionError(
          "AI Serverinə qoşulmaq mümkün olmadı. API açarı və ya internet əlaqəsini yoxlayın.",
        );
      } finally {
        setIsChecking(false);
        setTimeout(() => scrollToBottom(false), 0);
      }
    };

    checkConnection();
  }, [crop_nameAz, scrollToBottom]);

  // auto scroll when new messages arrive
  useEffect(() => {
    if (!autoScroll) return;
    scrollToBottom(true);
  }, [messages, isLoading, autoScroll, scrollToBottom]);

  const buildContext = () => ({
    location,
    crop,
    weather: weather
      ? { temp: weather.temp, humidity: weather.humidity }
      : null,
    soilMoisture: sensorData?.soilMoisture ?? null,
  });

  const mergeShortFollowUp = (text: string) => {
    const t = text.trim();
    // 1-5 simvol olan şeylər: "neyi?", "he?", "niyə?" və s.
    if (t.length > 5) return t;

    const prevUser = [...messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.content?.trim();
    if (!prevUser) return t;

    return `Bu, əvvəlki sualımın davamıdır.\nƏvvəlki sual: "${prevUser}"\nƏlavə etdiyim qısa sual: "${t}"\nZəhmət olmasa əvvəlki cavabı tamamla və konkret addımlar ver.`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || connectionError || isChecking) return;

    const userText = mergeShortFollowUp(input);
    setInput("");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          context: buildContext(),
        }),
      });

      if (!response.ok) throw new Error("API Error");

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "❌ **Xəta:** Əlaqə kəsildi. Zəhmət olmasa yenidən yoxlayın.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <Card className="border-border/50 shadow-lg h-[600px] flex flex-col">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot
            className={`h-5 w-5 ${connectionError ? "text-red-500" : "text-primary"}`}
          />
          AgriSense AI
        </CardTitle>
        <CardDescription>
          {connectionError ? (
            <span className="text-red-500 font-medium">Sistem işləmir</span>
          ) : (
            "Süni intellekt ilə canlı məsləhətləşmə"
          )}
        </CardDescription>
      </CardHeader>

      {/* ✅ Scroll üçün əsas: min-h-0 + overflow-hidden */}
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden bg-background flex flex-col">
        {isChecking ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>AI Sistemi yoxlanılır...</p>
          </div>
        ) : connectionError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Əlaqə Qurulmadı</h3>
              <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                {connectionError}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Model: gemini-2.5-flash
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Səhifəni Yenilə
            </Button>
          </div>
        ) : (
          <>
            {/* CHAT */}
            <div className="relative flex-1 min-h-0" ref={onScrollAreaMount}>
              <ScrollArea className="h-full [&_[data-radix-scroll-area-viewport]]:h-full">
                <div className="p-4 space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-800"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>

                      <div
                        className={`flex-1 max-w-[85%] rounded-2xl p-4 shadow-sm text-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted/50 border border-border/50 rounded-tl-none text-foreground"
                        }`}
                      >
                        {message.role === "user" ? (
                          <p>{message.content}</p>
                        ) : (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none break-words
                            prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:p-2 prose-pre:rounded-lg
                            prose-strong:font-bold prose-headings:font-bold prose-headings:my-2"
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ ...props }) => (
                                  <a
                                    {...props}
                                    target="_blank"
                                    className="text-blue-500 hover:underline"
                                  />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-green-700" />
                      </div>
                      <div className="bg-muted/50 border rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Yazır...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {showJumpToBottom && (
                <Button
                  type="button"
                  size="sm"
                  className="absolute bottom-4 right-4 shadow-lg rounded-full gap-2"
                  onClick={() => {
                    setAutoScroll(true);
                    scrollToBottom(true);
                  }}
                >
                  <ArrowDown className="h-4 w-4" />
                  Aşağı
                </Button>
              )}
            </div>

            {/* INPUT */}
            <div className="p-4 border-t bg-background/95 backdrop-blur">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Sualınızı bura yazın..."
                  disabled={isLoading || !!connectionError || isChecking}
                  className="flex-1 shadow-sm"
                />
                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    !input.trim() ||
                    !!connectionError ||
                    isChecking
                  }
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>

                {messages.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setMessages(messages.slice(0, 1));
                      setAutoScroll(true);
                      setTimeout(() => scrollToBottom(false), 0);
                    }}
                  >
                    <Eraser className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
