'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Cloud, Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { DataSource } from '@/lib/types'

interface DataSourceSelectorProps {
  onSourceSelect: (source: DataSource, firebaseUrl?: string) => void
  selectedSource: DataSource | null
}

export function DataSourceSelector({ onSourceSelect, selectedSource }: DataSourceSelectorProps) {
  const [firebaseUrl, setFirebaseUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isFirebaseValid, setIsFirebaseValid] = useState(false)

  const validateFirebaseUrl = async () => {
    if (!firebaseUrl.trim()) {
      setValidationError('Firebase URL daxil edin')
      return
    }

    // Basic URL validation
    if (!firebaseUrl.includes('firebaseio.com') && !firebaseUrl.includes('firebasedatabase.app')) {
      setValidationError('Düzgün Firebase Realtime Database URL daxil edin')
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      // Try to fetch from Firebase to validate
      const testUrl = firebaseUrl.endsWith('.json') ? firebaseUrl : `${firebaseUrl}.json`
      const response = await fetch(testUrl)
      
      if (response.ok) {
        setIsFirebaseValid(true)
        setValidationError(null)
      } else {
        throw new Error('Firebase-ə qoşulmaq mümkün olmadı')
      }
    } catch (error) {
      console.error('Firebase validation error:', error)
      setValidationError('Firebase URL yoxlanıla bilmədi. URL-in düzgün olduğundan əmin olun.')
      setIsFirebaseValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleFirebaseSelect = () => {
    if (isFirebaseValid && firebaseUrl) {
      onSourceSelect('firebase', firebaseUrl)
    }
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Database className="h-5 w-5 text-primary" />
          Data Mənbəyi Seçimi
        </CardTitle>
        <CardDescription>
          Torpaq məlumatlarını haradan alacağınızı seçin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weather API Option */}
        <div
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedSource === 'weather'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onSourceSelect('weather')}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Hava API-si</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seçilmiş məkandakı hava məlumatlarından istifadə edərək torpaq şəraitini təxmin edin. 
                Heç bir əlavə quraşdırma tələb olunmur.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Pulsuz
                </span>
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Ani quraşdırma
                </span>
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  7 günlük proqnoz
                </span>
              </div>
            </div>
            {selectedSource === 'weather' && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>

        {/* Firebase Option */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedSource === 'firebase'
              ? 'border-primary bg-primary/5'
              : 'border-border'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-accent/50">
              <Database className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Firebase Sensorları</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Öz IoT sensorlarınızdan Firebase Realtime Database vasitəsilə canlı məlumat alın.
              </p>
              <div className="flex flex-wrap gap-2 mt-3 mb-4">
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Canlı data
                </span>
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  IoT inteqrasiyası
                </span>
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Dəqiq ölçmə
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="firebase-url" className="text-foreground">Firebase Database URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="firebase-url"
                      placeholder="https://your-project.firebaseio.com/sensors"
                      value={firebaseUrl}
                      onChange={(e) => {
                        setFirebaseUrl(e.target.value)
                        setIsFirebaseValid(false)
                        setValidationError(null)
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={validateFirebaseUrl} 
                      disabled={isValidating}
                      variant="secondary"
                    >
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Yoxla'
                      )}
                    </Button>
                  </div>
                </div>

                {validationError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {validationError}
                  </div>
                )}

                {isFirebaseValid && (
                  <div className="flex items-center gap-2 text-primary text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Firebase bağlantısı uğurlu!
                  </div>
                )}

                <Button
                  onClick={handleFirebaseSelect}
                  disabled={!isFirebaseValid}
                  className="w-full"
                  variant={selectedSource === 'firebase' ? 'default' : 'secondary'}
                >
                  Firebase ilə davam et
                </Button>
              </div>
            </div>
            {selectedSource === 'firebase' && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Qeyd:</strong> Firebase seçsəniz, sensorlarınız aşağıdakı formatda məlumat göndərməlidir:
            {' '}
            <code className="px-1 py-0.5 rounded bg-muted text-foreground">
              {'{ soilMoisture, soilTemperature, airTemperature, humidity, ph, nitrogen, phosphorus, potassium }'}
            </code>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
