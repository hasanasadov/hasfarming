"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Bot,
  Send,
  Loader2,
  RefreshCw,
  WifiOff,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  X,
} from "lucide-react";

import type {
  Location,
  Crop,
  WeatherData,
  FirebaseSensorData,
  DataSource,
} from "@/lib/types";
import { useAppStore, buildThreadMeta } from "@/lib/store/app-store"; // <-- yolunu yoxla
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface AIChatProps {
  location: Location | null;
  crop: Crop | null;
  weather: WeatherData | null;
  sensorData: FirebaseSensorData | null;
  forecast: WeatherData[];
  dayIndex: number;
  dataSource: DataSource | null;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="sr-only">typing</span>
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
    </span>
  );
}

function useAutosizeTextarea(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight = 180,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
  }, [ref, value, maxHeight]);
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

export function AIChat({
  location,
  crop,
  weather,
  sensorData,
  forecast,
  dayIndex,
  dataSource,
}: AIChatProps) {
  const router = useRouter();
  const { t: tr } = useTranslation();

  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isChecking, setIsChecking] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [showPrompts, setShowPrompts] = useState(false);
  const [showThreads, setShowThreads] = useState(false);

  useAutosizeTextarea(textareaRef, input, 180);

  const quickPrompts = useMemo(
    () => [
      tr("chat.prompt1"),
      tr("chat.prompt2"),
      tr("chat.prompt3"),
      tr("chat.prompt4"),
      tr("chat.prompt5"),
    ],
    [tr],
  );

  const cropNameAz = crop?.nameAz || "Bitki";

  // --- store chat threads ---
  const chatThreads = useAppStore((s) => s.chatThreads);
  const activeThreadKey = useAppStore((s) => s.activeThreadKey);
  const ensureThread = useAppStore((s) => s.ensureThread);
  const setActiveThreadKey = useAppStore((s) => s.setActiveThreadKey);
  const appendChatMessage = useAppStore((s) => s.appendChatMessage);
  const clearThread = useAppStore((s) => s.clearThread);
  const deleteThread = useAppStore((s) => s.deleteThread);

  // thread meta/key current context üçün
  const computedMeta = useMemo(
    () => buildThreadMeta(location, crop),
    [location, crop],
  );
  const computedKey = computedMeta.threadKey;

  // context dəyişəndə thread ensure + active et
  useEffect(() => {
    ensureThread(computedMeta);
    setActiveThreadKey(computedKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedKey]);

  const activeKey = activeThreadKey || computedKey;
  const messages = chatThreads[activeKey]?.messages || [];
  const activeTitle = chatThreads[activeKey]?.meta?.title || computedMeta.title;

  // Auto-scroll (end ref)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // scroll area auto-scroll
  useEffect(() => {
    if (!scrollWrapRef.current) return;
    const viewport = scrollWrapRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Health check + welcome (yalnız thread boşdursa)
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: true }),
        });

        if (!res.ok) console.warn("Health check failed:", res.status);

        setConnectionError(null);

        // welcome yalnız boş thread-ə
        const t = useAppStore.getState().chatThreads[activeKey];
        if (!t || t.messages.length === 0) {
          useAppStore.getState().appendChatMessage(activeKey, {
            id: "welcome",
            role: "assistant",
            content: tr("chat.welcome").replace("{{crop}}", cropNameAz),
          });
        }
      } catch (err) {
        console.error("AI Connection Failed:", err);
        setConnectionError(tr("chat.connectionError"));
      } finally {
        setIsChecking(false);
      }
    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropNameAz, activeKey]);

  const buildContext = useCallback(() => {
    const selectedDay = forecast?.[dayIndex] ?? null;

    return {
      meta: {
        app: "Bərəkət",
        locale: "az-AZ",
        nowISO: new Date().toISOString(),
        selectedDayIndex: dayIndex,
        dataSource,
        sensorPriority: dataSource === "firebase" && dayIndex === 0,
      },
      location: location
        ? { lat: location.lat, lng: location.lng, address: location.address }
        : null,
      crop: crop
        ? {
            id: crop.id,
            name: crop.name,
            nameAz: crop.nameAz,
            growthDays: crop.growthDays,
            waterNeeds: crop.waterNeeds,
            optimalTemp: crop.optimalTemp,
            optimalHumidity: crop.optimalHumidity,
            optimalPh: crop.optimalPh,
          }
        : null,
      current: {
        weather: weather
          ? {
              date: weather.date,
              temp: weather.temp,
              tempMin: weather.tempMin,
              tempMax: weather.tempMax,
              humidity: weather.humidity,
              precipitation: weather.precipitation,
              windSpeed: weather.windSpeed,
              uvIndex: weather.uvIndex,
              description: weather.description,
            }
          : null,
        sensor: sensorData
          ? {
              soilMoisture: sensorData.soilMoisture,
              soilTemperature: sensorData.soilTemperature,
              airTemperature: sensorData.airTemperature,
              humidity: sensorData.humidity,
              ph: sensorData.ph,
              nitrogen: sensorData.nitrogen,
              phosphorus: sensorData.phosphorus,
              potassium: sensorData.potassium,
              timestamp: sensorData.timestamp,
            }
          : null,
      },
      selectedDay: selectedDay
        ? {
            date: selectedDay.date,
            temp: selectedDay.temp,
            tempMin: selectedDay.tempMin,
            tempMax: selectedDay.tempMax,
            humidity: selectedDay.humidity,
            precipitation: selectedDay.precipitation,
            windSpeed: selectedDay.windSpeed,
            uvIndex: selectedDay.uvIndex,
            soilMoisture: selectedDay.soilMoisture,
            description: selectedDay.description,
          }
        : null,
      forecast7: (forecast || []).slice(0, 7).map((d) => ({
        date: d.date,
        temp: d.temp,
        tempMin: d.tempMin,
        tempMax: d.tempMax,
        humidity: d.humidity,
        precipitation: d.precipitation,
        windSpeed: d.windSpeed,
        uvIndex: d.uvIndex,
        soilMoisture: d.soilMoisture,
        description: d.description,
      })),
    };
  }, [crop, dataSource, dayIndex, forecast, location, sensorData, weather]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading || connectionError || isChecking)
        return;
      const meta = buildThreadMeta(location, crop);
      useAppStore.getState().ensureThread(meta);

      const threadKey =
        useAppStore.getState().activeThreadKey || meta.threadKey;

      // user msg
      const userMessage = {
        id: crypto?.randomUUID?.() ?? Date.now().toString(),
        role: "user" as const,
        content: userText.trim(),
      };

      appendChatMessage(threadKey, userMessage);
      setIsLoading(true);
      setShowPrompts(false);

      try {
        const currentThreadMsgs =
          useAppStore.getState().chatThreads[threadKey]?.messages || [];

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentThreadMsgs.map(({ role, content }) => ({
              role,
              content,
            })),
            context: buildContext(),
          }),
        });

        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          appendChatMessage(threadKey, {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: tr("chat.rateLimit").replace("{{delay}}", data.retryDelay || "10s"),
          });
          return;
        }

        if (!response.ok) {
          const t = await response.text().catch(() => "");
          throw new Error(t || "API Error");
        }

        const data = await response.json();

        // Məkan seçilməyibsə /weather-ə yönləndir
        if (data?.action === "select_location" && data?.redirectTo) {
          appendChatMessage(threadKey, {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.text,
          });

          setTimeout(() => router.push(data.redirectTo), 2500);
          return;
        }

        appendChatMessage(threadKey, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text,
        });
      } catch (error) {
        appendChatMessage(threadKey, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: tr("chat.serverError"),
        });
      } finally {
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 60);
      }
    },
    [
      appendChatMessage,
      buildContext,
      computedKey,
      connectionError,
      isChecking,
      isLoading,
      router,
    ],
  );

  const handleSubmit = async () => {
    const text = input;
    if (!text.trim()) return;
    setInput("");
    await sendMessage(text);
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    e.preventDefault();
    await handleSubmit();
  };

  const canSend =
    !isLoading && !isChecking && !connectionError && input.trim().length > 0;

  const sortedThreads = useMemo(() => {
    return Object.values(chatThreads).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [chatThreads]);

  return (
    <div className="w-full flex flex-col min-h-[72svh] md:min-h-[78vh]">
      {showThreads && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowThreads(false)}
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 h-full w-[92%] max-w-[420px] bg-background border-l shadow-xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">{tr("chat.threads")}</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowThreads(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-3 overflow-auto flex-1 space-y-2">
              {sortedThreads.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3">
                  {tr("chat.noThreads")}
                </div>
              ) : (
                sortedThreads.map((t) => {
                  const isActive = t.meta.threadKey === activeKey;
                  const last = t.messages[t.messages.length - 1];

                  return (
                    <div
                      key={t.meta.threadKey}
                      className={cn(
                        "rounded-xl border p-3 cursor-pointer hover:bg-muted/40 transition",
                        isActive && "border-primary bg-muted/30",
                      )}
                      onClick={() => {
                        setActiveThreadKey(t.meta.threadKey);
                        setShowThreads(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {t.meta.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {last
                              ? `${last.role === "user" ? `${tr("chat.you")}: ` : "AI: "}${last.content}`
                              : tr("chat.emptyThread")}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {formatTime(t.updatedAt)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearThread(t.meta.threadKey);
                            }}
                            title="Təmizlə"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button> */}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteThread(t.meta.threadKey);
                            }}
                            title="Sil"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t text-xs text-muted-foreground">
              {tr("chat.threadsHint")}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="mx-auto px-6 md:px-0 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bot
              className={cn(
                "h-5 w-5",
                connectionError ? "text-red-500" : "text-primary",
              )}
            />
            <div className="min-w-0">
              <div className="font-semibold truncate">Bərəkət AI</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {activeTitle}
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {cropNameAz}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {!connectionError && !isChecking && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowThreads(true)}
                className="gap-2"
              >
                <MessageSquareText className="h-4 w-4" />
                {tr("chat.threads")}
              </Button>
            )}

            {/* {connectionError ? (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3.5 w-3.5" />
                Offline
              </Badge>
            ) : (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {dataSource === "firebase" ? "Sensor + Weather" : "Weather"}
              </Badge>
            )} */}
          </div>
        </div>

        {/* Prompts row */}
        {!connectionError && !isChecking && (
          <div className="mx-auto px-6 md:px-0 pb-3">
            <div className="flex md:hidden items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPrompts((v) => !v)}
                className="text-xs text-muted-foreground inline-flex items-center gap-1"
              >
                {tr("chat.quickPrompts")}
                {showPrompts ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <span className="text-[11px] text-muted-foreground hidden md:flex">
                Enter: göndər • Shift+Enter: yeni sətir
              </span>
            </div>

            <div className="hidden md:flex flex-wrap gap-2">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setInput(p);
                    setTimeout(() => textareaRef.current?.focus(), 30);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted transition"
                >
                  {p}
                </button>
              ))}
            </div>

            {showPrompts && (
              <div className="md:hidden mt-2 flex flex-wrap gap-2">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setInput(p);
                      setShowPrompts(false);
                      setTimeout(() => textareaRef.current?.focus(), 30);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0">
        {isChecking ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-14">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-base">{tr("chat.checking")}</p>
          </div>
        ) : connectionError ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center py-14">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">{tr("chat.noConnection")}</h3>
              <p className="text-sm text-muted-foreground max-w-[360px] mx-auto">
                {connectionError}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {tr("chat.refresh")}
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollWrapRef}>
            <div className="mx-auto px-6 md:px-0 py-6 space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] md:max-w-[78%] rounded-2xl px-3 py-2 md:px-4 md:py-3 text-[15px] leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/50 border border-border/50 text-foreground rounded-bl-sm",
                    )}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <div
                        className={cn(
                          "prose prose-sm md:prose-base dark:prose-invert max-w-none break-words",
                          "prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:p-3 prose-pre:rounded-lg",
                          "prose-strong:font-bold prose-headings:font-bold prose-headings:my-2",
                        )}
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
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[92%] md:max-w-[78%] bg-muted/50 border border-border/50 rounded-2xl rounded-bl-sm px-3 py-2 md:px-4 md:py-3">
                    <div className="flex items-center gap-2">
                      <TypingDots />
                      <span className="text-sm text-muted-foreground">
                        {tr("chat.typing")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 z-10 bg-background/90 backdrop-blur border-t">
        <div className="mx-auto px-6 md:px-0 py-3">
          <div className="rounded-2xl border border-border bg-background shadow-sm px-2 py-2 flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={tr("chat.placeholder")}
              disabled={isLoading || !!connectionError || isChecking}
              className={cn(
                "min-h-[44px] max-h-[180px] resize-none border-0 shadow-none focus-visible:ring-0",
                "text-[15px] leading-relaxed",
                "px-2 py-2",
              )}
            />

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className="h-10 w-10 rounded-xl"
              size="icon"
              title="Göndər"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="mt-1.5 hidden md:flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Enter: göndər • Shift+Enter: yeni sətir</span>
            <span>
              Mənbə:{" "}
              <span className="font-medium">
                {dataSource === "firebase" ? "Sensor + Weather" : "Weather"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
