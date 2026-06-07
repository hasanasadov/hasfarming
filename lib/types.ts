export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface WeatherData {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  description: string;
  icon: string;
  soilMoisture?: number;
  uvIndex?: number;
}

export interface FirebaseSensorData {
  humidity: number;
  isWorking: boolean;
  moisture: number;
  temperatureAir: number;
  temperatureSoil: number;
  timestamp: number;
}

export interface FirebaseSensorPayload {
  sensor_data: FirebaseSensorData;
}

export interface SoilData extends FirebaseSensorData {}

export interface Crop {
  id: string;
  name: string;
  nameAz: string;
  icon: string;
  optimalTemp: { min: number; max: number };
  optimalHumidity: { min: number; max: number };
  optimalPh: { min: number; max: number };
  waterNeeds: "low" | "medium" | "high";
  growthDays: number;
}

export interface Recommendation {
  type: "irrigation" | "fertilizer" | "warning" | "info";
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type DataSource = "weather" | "firebase";
export type AppStep = "location" | "source" | "data" | "crop" | "dashboard";
