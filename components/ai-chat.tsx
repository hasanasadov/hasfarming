"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  Send,
  User,
  Loader2,
  RefreshCw,
  Eraser,
  WifiOff,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Sprout,
  MapPin,
  Cloud,
  Database,
} from "lucide-react";
import {
  Location,
  Crop,
  WeatherData,
  FirebaseSensorData,
  DataSource,
} from "@/lib/types";
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

export function AIChat({
  location,
  crop,
  weather,
  sensorData,
  forecast,
  dayIndex,
  dataSource,
}: AIChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isChecking, setIsChecking] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const quickPrompts = useMemo(
    () => [
      "Bu gün suvarım, yoxsa gözləyim?",
      "Sabah yağışa görə nə etməliyəm?",
      "Torpaq nəmliyi aşağıdırsa nə qədər su vermək olar?",
      "Bu həftə gübrə üçün plan ver",
      "Bitkim üçün risk varmı? (temperatur/yağış)",
    ],
    [],
  );

  const tips = useMemo(
    () => [
      "Yağış gözlənirsə suvarmanı azaltmaq daha məntiqlidir.",
      "Torpaq nəmliyi 30%-dən aşağıdırsa stres başlayır.",
      "Külək yüksəkdirsə buxarlanma artır — suvarma vaxtını səhər/axşam seç.",
      "pH ölçüsün varsa, gübrə planı daha dəqiq olur.",
    ],
    [],
  );
  const [tip, setTip] = useState(tips[0]);

  useEffect(() => {
    if (!isLoading) return;
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, [isLoading, tips]);

  const cropNameAz = crop?.nameAz || "Kənd təsərrüfatı";
  const selectedDay = forecast?.[dayIndex] ?? null;

  // Context preview values (seçilmiş gün)
  const preview = useMemo(() => {
    const d = selectedDay || weather;
    if (!d) return null;

    const isToday = dayIndex === 0;
    const soilFromSensor =
      isToday && dataSource === "firebase"
        ? sensorData?.soilMoisture
        : undefined;

    return {
      label: isToday ? "Bu gün" : `Gün ${dayIndex + 1}`,
      temp: d.temp,
      tempMin: d.tempMin,
      tempMax: d.tempMax,
      precipitation: d.precipitation,
      windSpeed: d.windSpeed,
      uvIndex: d.uvIndex,
      humidity: d.humidity,
      soilMoisture: soilFromSensor ?? d.soilMoisture,
      description: d.description,
      source:
        dataSource === "firebase"
          ? "Sensor"
          : dataSource === "weather"
            ? "Hava API"
            : "Seçilməyib",
      sourceIcon:
        dataSource === "firebase" ? (
          <Database className="h-3.5 w-3.5" />
        ) : (
          <Cloud className="h-3.5 w-3.5" />
        ),
      hasSensorPriority: isToday && dataSource === "firebase",
    };
  }, [selectedDay, weather, dayIndex, dataSource, sensorData?.soilMoisture]);

  // ✅ Health check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check: true }),
        });

        if (!res.ok) {
          console.warn("Health check failed:", res.status);
        }

        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Salam! Mən **AgriSense AI** köməkçisiyəm. 🌾\n\n**${cropNameAz}** ilə bağlı nə sualınız var?`,
          },
        ]);
        setConnectionError(null);
      } catch (err) {
        console.error("AI Connection Failed:", err);
        setConnectionError(
          "Serverə qoşulmaq mümkün olmadı. İnterneti və deploy statusu yoxlayın.",
        );
      } finally {
        setIsChecking(false);
      }
    };

    checkConnection();
  }, [cropNameAz]);

  // ✅ Auto scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const buildContext = useCallback(() => {
    return {
      meta: {
        app: "AgriSense",
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
  }, [
    crop,
    dataSource,
    dayIndex,
    forecast,
    location,
    selectedDay,
    sensorData,
    weather,
  ]);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading || connectionError || isChecking)
        return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: userText.trim(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map(({ role, content }) => ({
              role,
              content,
            })),
            context: buildContext(),
          }),
        });

        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `⚠️ Limit doldu. ${data.retryDelay || "10s"} sonra yenidən yoxlayın. ✅ Tamamlandı`,
            },
          ]);
          return;
        }

        if (!response.ok) {
          const t = await response.text().catch(() => "");
          throw new Error(t || "API Error");
        }

        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.text,
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content:
              "❌ **Xəta:** Server xətası oldu. Zəhmət olmasa yenidən yoxlayın.",
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 60);
      }
    },
    [buildContext, connectionError, isChecking, isLoading, messages],
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  // ✅ Enter send, Shift+Enter newline
  const onKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // newline
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  return (
    <Card className="border-border/50 shadow-lg h-[740px] lg:h-[820px] flex flex-col">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Bot
            className={`h-6 w-6 ${connectionError ? "text-red-500" : "text-primary"}`}
          />
          AgriSense AI
        </CardTitle>

        <CardDescription className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
              Süni intellekt ilə canlı məsləhətləşmə
            </span>

            {location?.address && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted border flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location.address.split(",")[0]}
              </span>
            )}

            {crop && (
              <span className="text-xs px-2 py-1 rounded-full bg-muted border flex items-center gap-1">
                <Sprout className="h-3.5 w-3.5" />
                {crop.nameAz}
              </span>
            )}

            <span className="text-xs px-2 py-1 rounded-full bg-muted border flex items-center gap-1">
              {preview?.sourceIcon}
              {preview?.source ?? "Mənbə seçilməyib"}
            </span>

            <Badge variant="secondary" className="gap-1">
              🗓 {preview?.label ?? "Seçilməyib"}
              {preview?.hasSensorPriority ? " • sensor prioritet" : ""}
            </Badge>
          </div>

          {/* ✅ Context Preview Pills */}
          {preview && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full border bg-background/60 flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                {Math.round(preview.temp)}°C
                <span className="opacity-70">
                  ({Math.round(preview.tempMin)}°/{Math.round(preview.tempMax)}
                  °)
                </span>
              </span>

              <span className="text-xs px-2 py-1 rounded-full border bg-background/60 flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-primary" />
                Yağış: {Math.round(preview.precipitation)} mm
              </span>

              {typeof preview.soilMoisture === "number" && (
                <span className="text-xs px-2 py-1 rounded-full border bg-background/60 flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-emerald-500" />
                  Torpaq: {Math.round(preview.soilMoisture)}%
                </span>
              )}

              <span className="text-xs px-2 py-1 rounded-full border bg-background/60 flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-blue-400" />
                Külək: {Math.round(preview.windSpeed)} km/s
              </span>

              <span className="text-xs px-2 py-1 rounded-full border bg-background/60 flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-yellow-500" />
                UV: {preview.uvIndex?.toFixed(1) ?? "N/A"}
              </span>

              <span className="text-xs px-2 py-1 rounded-full border bg-background/60">
                {preview.description}
              </span>
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden bg-background flex flex-col">
        {isChecking ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-base">AI Sistemi yoxlanılır...</p>
          </div>
        ) : connectionError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Əlaqə Qurulmadı</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                {connectionError}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Səhifəni Yenilə
            </Button>
          </div>
        ) : (
          <ScrollArea
            className="flex-1 min-h-0 p-5 [&_[data-radix-scroll-area-viewport]]:h-full"
            ref={scrollRef}
          >
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border shadow-sm ${
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
                    className={`flex-1 max-w-[92%] rounded-2xl p-5 shadow-sm text-[15px] leading-relaxed ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted/50 border border-border/50 rounded-tl-none text-foreground"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div
                        className="prose prose-base dark:prose-invert max-w-none break-words
                        prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:p-3 prose-pre:rounded-lg
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
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center border shadow-sm">
                    <Bot className="h-4 w-4 text-green-700 dark:text-green-300" />
                  </div>

                  <div className="flex-1 max-w-[92%] bg-muted/50 border border-border/50 rounded-2xl rounded-tl-none p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <TypingDots />
                      <span className="text-sm text-muted-foreground">
                        AI yazır…
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 mt-2">
                      {tip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Bottom Composer */}
        <div className="border-t bg-background/95 backdrop-blur">
          {!connectionError && !isChecking && (
            <div className="p-3 border-b border-border/60">
              <div className="flex flex-wrap gap-2">
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
            </div>
          )}

          <div className="p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    connectionError ? "Sistem işləmir..." : "Sualınızı yazın… "
                  }
                  disabled={isLoading || !!connectionError || isChecking}
                  className="min-h-[54px] max-h-[140px] resize-none text-[15px] leading-relaxed shadow-sm"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Enter: göndər • Shift+Enter: yeni sətir
                </p>
              </div>

              <Button
                type="submit"
                disabled={
                  isLoading || !input.trim() || !!connectionError || isChecking
                }
                className="h-[54px] w-[54px]"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>

              {messages.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-[54px] w-[54px]"
                  size="icon"
                  onClick={() => setMessages(messages.slice(0, 1))}
                >
                  <Eraser className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
