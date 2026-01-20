import { Crop } from './types'

export const crops: Crop[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    nameAz: 'Pomidor',
    icon: '🍅',
    optimalTemp: { min: 18, max: 29 },
    optimalHumidity: { min: 50, max: 70 },
    optimalPh: { min: 6.0, max: 6.8 },
    waterNeeds: 'medium',
    growthDays: 80
  },
  {
    id: 'wheat',
    name: 'Wheat',
    nameAz: 'Buğda',
    icon: '🌾',
    optimalTemp: { min: 12, max: 25 },
    optimalHumidity: { min: 40, max: 60 },
    optimalPh: { min: 6.0, max: 7.0 },
    waterNeeds: 'low',
    growthDays: 120
  },
  {
    id: 'corn',
    name: 'Corn',
    nameAz: 'Qarğıdalı',
    icon: '🌽',
    optimalTemp: { min: 18, max: 32 },
    optimalHumidity: { min: 50, max: 75 },
    optimalPh: { min: 5.8, max: 7.0 },
    waterNeeds: 'high',
    growthDays: 90
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    nameAz: 'Xiyar',
    icon: '🥒',
    optimalTemp: { min: 18, max: 30 },
    optimalHumidity: { min: 60, max: 80 },
    optimalPh: { min: 5.5, max: 7.0 },
    waterNeeds: 'high',
    growthDays: 55
  },
  {
    id: 'potato',
    name: 'Potato',
    nameAz: 'Kartof',
    icon: '🥔',
    optimalTemp: { min: 15, max: 22 },
    optimalHumidity: { min: 60, max: 80 },
    optimalPh: { min: 4.8, max: 5.5 },
    waterNeeds: 'medium',
    growthDays: 100
  },
  {
    id: 'pepper',
    name: 'Pepper',
    nameAz: 'Bibər',
    icon: '🌶️',
    optimalTemp: { min: 18, max: 30 },
    optimalHumidity: { min: 50, max: 70 },
    optimalPh: { min: 6.0, max: 6.8 },
    waterNeeds: 'medium',
    growthDays: 70
  },
  {
    id: 'eggplant',
    name: 'Eggplant',
    nameAz: 'Badımcan',
    icon: '🍆',
    optimalTemp: { min: 21, max: 32 },
    optimalHumidity: { min: 50, max: 70 },
    optimalPh: { min: 5.5, max: 6.8 },
    waterNeeds: 'medium',
    growthDays: 75
  },
  {
    id: 'grape',
    name: 'Grape',
    nameAz: 'Üzüm',
    icon: '🍇',
    optimalTemp: { min: 15, max: 35 },
    optimalHumidity: { min: 40, max: 60 },
    optimalPh: { min: 5.5, max: 6.5 },
    waterNeeds: 'low',
    growthDays: 150
  },
  {
    id: 'watermelon',
    name: 'Watermelon',
    nameAz: 'Qarpız',
    icon: '🍉',
    optimalTemp: { min: 21, max: 35 },
    optimalHumidity: { min: 50, max: 70 },
    optimalPh: { min: 6.0, max: 7.0 },
    waterNeeds: 'high',
    growthDays: 85
  },
  {
    id: 'onion',
    name: 'Onion',
    nameAz: 'Soğan',
    icon: '🧅',
    optimalTemp: { min: 13, max: 24 },
    optimalHumidity: { min: 50, max: 70 },
    optimalPh: { min: 6.0, max: 7.0 },
    waterNeeds: 'medium',
    growthDays: 100
  },
  {
    id: 'garlic',
    name: 'Garlic',
    nameAz: 'Sarımsaq',
    icon: '🧄',
    optimalTemp: { min: 13, max: 24 },
    optimalHumidity: { min: 40, max: 60 },
    optimalPh: { min: 6.0, max: 7.0 },
    waterNeeds: 'low',
    growthDays: 90
  },
  {
    id: 'cotton',
    name: 'Cotton',
    nameAz: 'Pambıq',
    icon: '☁️',
    optimalTemp: { min: 21, max: 37 },
    optimalHumidity: { min: 40, max: 60 },
    optimalPh: { min: 5.8, max: 8.0 },
    waterNeeds: 'medium',
    growthDays: 150
  }
]

export function getCropById(id: string): Crop | undefined {
  return crops.find(crop => crop.id === id)
}
