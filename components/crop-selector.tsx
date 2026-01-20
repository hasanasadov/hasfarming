'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sprout, Search, CheckCircle2 } from 'lucide-react'
import { Crop } from '@/lib/types'
import { crops } from '@/lib/crops-data'

interface CropSelectorProps {
  onCropSelect: (crop: Crop) => void
  selectedCrop: Crop | null
}

export function CropSelector({ onCropSelect, selectedCrop }: CropSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCrops = crops.filter(crop => 
    crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crop.nameAz.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getWaterNeedsLabel = (needs: string) => {
    switch (needs) {
      case 'low': return 'Az'
      case 'medium': return 'Orta'
      case 'high': return 'Çox'
      default: return needs
    }
  }

  const getWaterNeedsColor = (needs: string) => {
    switch (needs) {
      case 'low': return 'bg-accent/20 text-accent-foreground'
      case 'medium': return 'bg-primary/20 text-primary'
      case 'high': return 'bg-blue-100 text-blue-700'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sprout className="h-5 w-5 text-primary" />
          Bitki Seçimi
        </CardTitle>
        <CardDescription>
          Bu sahədə hansı bitkini əkdiyinizi və ya əkmək istədiyinizi seçin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Bitki axtarın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Crop Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCrops.map((crop) => (
            <button
              key={crop.id}
              onClick={() => onCropSelect(crop)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                selectedCrop?.id === crop.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              {selectedCrop?.id === crop.id && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
              )}
              <span className="text-3xl block mb-2">{crop.icon}</span>
              <h3 className="font-semibold text-foreground">{crop.nameAz}</h3>
              <p className="text-xs text-muted-foreground">{crop.name}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className={`px-1.5 py-0.5 rounded text-xs ${getWaterNeedsColor(crop.waterNeeds)}`}>
                  Su: {getWaterNeedsLabel(crop.waterNeeds)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {filteredCrops.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Heç bir bitki tapılmadı</p>
          </div>
        )}

        {selectedCrop && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{selectedCrop.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg">{selectedCrop.nameAz}</h3>
                <p className="text-sm text-muted-foreground mb-3">{selectedCrop.name}</p>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Optimal temperatur</p>
                    <p className="font-medium text-foreground">
                      {selectedCrop.optimalTemp.min}°C - {selectedCrop.optimalTemp.max}°C
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Optimal rütubət</p>
                    <p className="font-medium text-foreground">
                      {selectedCrop.optimalHumidity.min}% - {selectedCrop.optimalHumidity.max}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">pH aralığı</p>
                    <p className="font-medium text-foreground">
                      {selectedCrop.optimalPh.min} - {selectedCrop.optimalPh.max}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Yetişmə müddəti</p>
                    <p className="font-medium text-foreground">{selectedCrop.growthDays} gün</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
