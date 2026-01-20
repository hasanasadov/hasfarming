'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, User, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { Location, Crop, WeatherData, FirebaseSensorData } from '@/lib/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIChatProps {
  location: Location | null
  crop: Crop | null
  weather: WeatherData | null
  sensorData: FirebaseSensorData | null
}

export function AIChat({ location, crop, weather, sensorData }: AIChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  const crop_nameAz = crop?.nameAz || 'Kənd təsərrüfatı'
  
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Salam! Mən AgriSense AI köməkçisiyəm. ${crop_nameAz} ilə bağlı hər hansı sualınız varsa, soruşa bilərsiniz. Məsələn:

- Bu bitki üçün ən yaxşı suvarma qrafiki nədir?
- Hansı gübrələrdən istifadə etməliyəm?
- Bu hava şəraitində nəyə diqqət etməliyəm?
- Zərərvericilərdən necə qorunmalıyam?`
    }])
  }, [crop_nameAz])

  const context = {
    location,
    crop,
    weather: weather ? {
      temp: weather.temp,
      humidity: weather.humidity,
      description: weather.description
    } : null,
    soilMoisture: sensorData?.soilMoisture || weather?.soilMoisture,
    ph: sensorData?.ph
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context
        })
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text || 'Bağışlayın, cavab ala bilmədim.'
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const suggestedQuestions = [
    'Bu bitki üçün ən yaxşı suvarma vaxtı?',
    'Hansı gübrə istifadə etməliyəm?',
    'Zərərvericilərdən necə qorunmalıyam?',
    'Məhsuldarlığı necə artıra bilərəm?'
  ]

  return (
    <Card className="border-border/50 shadow-lg h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Bot className="h-5 w-5 text-primary" />
          AI Köməkçi
        </CardTitle>
        <CardDescription>
          Kənd təsərrüfatı ilə bağlı suallarınızı soruşun
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`flex-1 p-3 rounded-xl ${
                  message.role === 'user' 
                    ? 'bg-primary/10 text-foreground ml-12' 
                    : 'bg-card border border-border mr-12'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 p-3 rounded-xl bg-card border border-border mr-12">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Düşünürəm...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
                onClick={() => {
                  setInput(question)
                  inputRef.current?.focus()
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {question}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Sualınızı yazın..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          {messages.length > 1 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setMessages(messages.slice(0, 1))}
              title="Söhbəti sıfırla"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </form>

        {/* Context Info */}
        {(crop || location) && (
          <div className="p-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              {crop && <span>Bitki: {crop.nameAz}</span>}
              {location && <span>Məkan: {location.address?.split(',')[0]}</span>}
              {weather && <span>Hava: {weather.temp?.toFixed(0)}°C</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
