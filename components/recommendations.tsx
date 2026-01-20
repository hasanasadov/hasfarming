'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Droplets, Leaf, AlertTriangle, Info, Lightbulb, CheckCircle } from 'lucide-react'
import { Crop, WeatherData, FirebaseSensorData, Recommendation } from '@/lib/types'

interface RecommendationsProps {
  crop: Crop
  weather?: WeatherData
  sensorData?: FirebaseSensorData
  forecast?: WeatherData[]
}

export function Recommendations({ crop, weather, sensorData, forecast }: RecommendationsProps) {
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = []
    
    const currentTemp = sensorData?.airTemperature || weather?.temp || 20
    const currentHumidity = sensorData?.humidity || weather?.humidity || 50
    const soilMoisture = sensorData?.soilMoisture || weather?.soilMoisture || 50
    const ph = sensorData?.ph

    // Temperature analysis
    if (currentTemp < crop.optimalTemp.min) {
      const diff = crop.optimalTemp.min - currentTemp
      recs.push({
        type: 'warning',
        title: 'Temperatur çox aşağıdır',
        description: `Cari temperatur (${currentTemp.toFixed(1)}°C) ${crop.nameAz} üçün optimal aralıqdan ${diff.toFixed(1)}°C aşağıdır. İstixana və ya örtük istifadəsini düşünün.`,
        priority: diff > 5 ? 'critical' : 'high'
      })
    } else if (currentTemp > crop.optimalTemp.max) {
      const diff = currentTemp - crop.optimalTemp.max
      recs.push({
        type: 'warning',
        title: 'Temperatur çox yüksəkdir',
        description: `Cari temperatur (${currentTemp.toFixed(1)}°C) ${crop.nameAz} üçün optimal aralıqdan ${diff.toFixed(1)}°C yuxarıdır. Kölgə və əlavə suvarma təmin edin.`,
        priority: diff > 5 ? 'critical' : 'high'
      })
    } else {
      recs.push({
        type: 'info',
        title: 'Temperatur optimaldır',
        description: `Cari temperatur (${currentTemp.toFixed(1)}°C) ${crop.nameAz} üçün idealdır.`,
        priority: 'low'
      })
    }

    // Irrigation recommendations
    if (soilMoisture < 30) {
      recs.push({
        type: 'irrigation',
        title: 'Dərhal suvarma lazımdır!',
        description: `Torpaq nəmliyi çox aşağıdır (${soilMoisture.toFixed(0)}%). ${crop.waterNeeds === 'high' ? 'Bu bitki yüksək su tələb edir - dərhal bol suvarın.' : 'Torpağı suvarın.'}`,
        priority: 'critical'
      })
    } else if (soilMoisture < 45) {
      recs.push({
        type: 'irrigation',
        title: 'Suvarma tövsiyə olunur',
        description: `Torpaq nəmliyi (${soilMoisture.toFixed(0)}%) orta səviyyədədir. ${crop.waterNeeds === 'low' ? 'Yüngül suvarma kifayətdir.' : 'Yaxın günlərdə suvarın.'}`,
        priority: 'medium'
      })
    } else if (soilMoisture > 80) {
      recs.push({
        type: 'warning',
        title: 'Həddindən artıq nəmlik',
        description: `Torpaq nəmliyi çox yüksəkdir (${soilMoisture.toFixed(0)}%). Drenaj problemləri və kök çürüməsi riski var. Suvarmanı dayandırın.`,
        priority: 'high'
      })
    } else {
      recs.push({
        type: 'info',
        title: 'Torpaq nəmliyi yaxşıdır',
        description: `Torpaq nəmliyi (${soilMoisture.toFixed(0)}%) optimal aralıqdadır.`,
        priority: 'low'
      })
    }

    // pH recommendations
    if (ph !== undefined) {
      if (ph < crop.optimalPh.min) {
        recs.push({
          type: 'fertilizer',
          title: 'Torpaq çox turşudur',
          description: `pH (${ph.toFixed(1)}) ${crop.nameAz} üçün optimal aralıqdan aşağıdır (${crop.optimalPh.min}-${crop.optimalPh.max}). Əhəng (kireç) əlavə edərək pH-ı yüksəldin.`,
          priority: 'medium'
        })
      } else if (ph > crop.optimalPh.max) {
        recs.push({
          type: 'fertilizer',
          title: 'Torpaq çox qələvidir',
          description: `pH (${ph.toFixed(1)}) ${crop.nameAz} üçün optimal aralıqdan yuxarıdır. Kükürd və ya turş gübrələr istifadə edin.`,
          priority: 'medium'
        })
      }
    }

    // NPK recommendations
    if (sensorData?.nitrogen !== undefined && sensorData.nitrogen < 20) {
      recs.push({
        type: 'fertilizer',
        title: 'Azot əlavə edin',
        description: 'Torpaqda azot səviyyəsi aşağıdır. Ürea və ya ammonium nitrat gübrəsi istifadə edin.',
        priority: 'medium'
      })
    }

    if (sensorData?.phosphorus !== undefined && sensorData.phosphorus < 15) {
      recs.push({
        type: 'fertilizer',
        title: 'Fosfor əlavə edin',
        description: 'Torpaqda fosfor səviyyəsi aşağıdır. Superfosfat və ya DAP gübrəsi istifadə edin.',
        priority: 'medium'
      })
    }

    if (sensorData?.potassium !== undefined && sensorData.potassium < 100) {
      recs.push({
        type: 'fertilizer',
        title: 'Kalium əlavə edin',
        description: 'Torpaqda kalium səviyyəsi aşağıdır. Kalium sulfat və ya KCl gübrəsi istifadə edin.',
        priority: 'medium'
      })
    }

    // Weather forecast analysis
    if (forecast && forecast.length > 0) {
      const upcomingRain = forecast.slice(0, 3).filter(d => d.precipitation > 5)
      if (upcomingRain.length > 0) {
        recs.push({
          type: 'info',
          title: 'Yağış gözlənilir',
          description: `Növbəti 3 gün ərzində yağış gözlənilir. Suvarmanı azaldın və drenaj sistemini yoxlayın.`,
          priority: 'low'
        })
      }

      const hotDays = forecast.slice(0, 5).filter(d => d.tempMax > crop.optimalTemp.max + 5)
      if (hotDays.length >= 3) {
        recs.push({
          type: 'warning',
          title: 'İsti dalğa gözlənilir',
          description: `Növbəti günlərdə çox isti hava gözlənilir. Kölgə qurun və səhər/axşam suvarın.`,
          priority: 'high'
        })
      }
    }

    // General care tips
    recs.push({
      type: 'info',
      title: 'Ümumi tövsiyə',
      description: `${crop.nameAz} üçün yetişmə müddəti təxminən ${crop.growthDays} gündür. Mütəmadi olaraq zərərvericiləri yoxlayın və vaxtında müdaxilə edin.`,
      priority: 'low'
    })

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }, [crop, weather, sensorData, forecast])

  const getIcon = (type: string) => {
    switch (type) {
      case 'irrigation': return <Droplets className="h-5 w-5" />
      case 'fertilizer': return <Leaf className="h-5 w-5" />
      case 'warning': return <AlertTriangle className="h-5 w-5" />
      default: return <Info className="h-5 w-5" />
    }
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-destructive bg-destructive/5'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'medium': return 'border-accent bg-accent/10'
      default: return 'border-border bg-card'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Kritik</Badge>
      case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600">Yüksək</Badge>
      case 'medium': return <Badge variant="secondary">Orta</Badge>
      default: return <Badge variant="outline">Məlumat</Badge>
    }
  }

  const getIconColor = (type: string, priority: string) => {
    if (priority === 'critical') return 'text-destructive'
    if (priority === 'high') return 'text-orange-500'
    if (type === 'irrigation') return 'text-blue-500'
    if (type === 'fertilizer') return 'text-primary'
    return 'text-muted-foreground'
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Lightbulb className="h-5 w-5 text-accent" />
          Tövsiyələr
        </CardTitle>
        <CardDescription>
          {crop.nameAz} üçün cari şəraitə əsaslanan fərdi tövsiyələr
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 ${getPriorityStyles(rec.priority)}`}
          >
            <div className="flex items-start gap-3">
              <div className={getIconColor(rec.type, rec.priority)}>
                {getIcon(rec.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{rec.title}</h3>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Xülasə</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {recommendations.filter(r => r.priority === 'critical').length > 0 
              ? 'Dərhal müdaxilə tələb edən kritik vəziyyət var!'
              : recommendations.filter(r => r.priority === 'high').length > 0
                ? 'Diqqət tələb edən məsələlər var.'
                : 'Bitkiniz ümumiyyətlə yaxşı vəziyyətdədir. Mütəmadi müşahidə davam etdirin.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
