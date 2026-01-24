import { create } from "zustand";
import {
  Location,
  DataSource,
  Crop,
  WeatherData,
  FirebaseSensorData,
} from "@/lib/types";

export type SensorStatus = "idle" | "connecting" | "connected" | "error";

type AppState = {
  // --- context ---
  location: Location | null;
  selectedCrop: Crop | null;
  dayIndex: number;

  // --- data source ---
  dataSource: DataSource; // "weather" | "firebase"
  firebaseUrl: string;
  // əlavə et:
  lastSensorAt: number | null;
  setLastSensorAt: (v: number | null) => void;

  // --- sensor ---
  sensorStatus: SensorStatus;
  sensorError: string | null;
  sensorData: FirebaseSensorData | null;

  // --- weather ---
  currentWeather: WeatherData | null;
  forecast: WeatherData[];

  // --- setters ---
  setLocation: (v: Location | null) => void;
  setCrop: (v: Crop | null) => void;
  setDayIndex: (v: number) => void;

  setDataSource: (v: DataSource) => void; // ❗ QALIR
  setFirebaseUrl: (v: string) => void;

  setSensorStatus: (v: SensorStatus) => void;
  setSensorError: (v: string | null) => void;
  setSensorData: (v: FirebaseSensorData | null) => void;

  setWeather: (current: WeatherData | null, forecast: WeatherData[]) => void;

  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  // --- initial state ---
  location: null,
  selectedCrop: null,
  dayIndex: 0,

  dataSource: "weather",
  firebaseUrl: "",

  sensorStatus: "idle",
  sensorError: null,
  sensorData: null,

  currentWeather: null,
  forecast: [],
  lastSensorAt: null,
  setLastSensorAt: (v) => set({ lastSensorAt: v }),

  // --- basic setters ---
  setLocation: (v) => set({ location: v }),
  setCrop: (v) => set({ selectedCrop: v }),
  setDayIndex: (v) => set({ dayIndex: v }),

  setDataSource: (v) => set({ dataSource: v }), // ❗ geri qaytarıldı
  setFirebaseUrl: (v) => set({ firebaseUrl: v }),

  // --- sensor logic ---
  setSensorStatus: (status) =>
    set((state) => ({
      sensorStatus: status,
      dataSource:
        status === "connected" && state.sensorData ? "firebase" : "weather",
    })),

  setSensorError: (err) =>
    set({
      sensorError: err,
      sensorStatus: err ? "error" : "idle",
      dataSource: "weather",
    }),

  setSensorData: (data) =>
    set({
      sensorData: data,
      lastSensorAt: data ? Date.now() : null,
      sensorStatus: data ? "connected" : "idle",
      dataSource: data ? "firebase" : "weather",
      sensorError: null,
    }),

  // --- weather ---
  setWeather: (current, forecast) =>
    set({
      currentWeather: current,
      forecast,
    }),

  reset: () =>
    set({
      location: null,
      selectedCrop: null,
      dayIndex: 0,

      dataSource: "weather",
      firebaseUrl: "",

      sensorStatus: "idle",
      sensorError: null,
      sensorData: null,

      currentWeather: null,
      forecast: [],
    }),
}));
