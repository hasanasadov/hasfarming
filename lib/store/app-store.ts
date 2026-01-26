import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Location,
  DataSource,
  Crop,
  WeatherData,
  FirebaseSensorData,
} from "@/lib/types";

export type SensorStatus = "idle" | "connecting" | "connected" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type ChatThreadMeta = {
  threadKey: string;
  title: string; // "Kartof • Quba" kimi
  location?: { lat: number; lng: number; address?: string | null } | null;
  crop?: { id: string; nameAz?: string | null; name?: string | null } | null;
};

export type ChatThread = {
  meta: ChatThreadMeta;
  messages: ChatMessage[];
  updatedAt: number;
  createdAt: number;
};

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

  // --- chat threads ---
  chatThreads: Record<string, ChatThread>;
  activeThreadKey: string | null;

  // --- setters ---
  setLocation: (v: Location | null) => void;
  setCrop: (v: Crop | null) => void;
  setDayIndex: (v: number) => void;

  setDataSource: (v: DataSource) => void;
  setFirebaseUrl: (v: string) => void;

  setSensorStatus: (v: SensorStatus) => void;
  setSensorError: (v: string | null) => void;
  setSensorData: (v: FirebaseSensorData | null) => void;

  setWeather: (current: WeatherData | null, forecast: WeatherData[]) => void;

  // --- chat actions ---
  ensureThread: (meta: ChatThreadMeta) => void;
  setActiveThreadKey: (key: string | null) => void;
  appendChatMessage: (
    threadKey: string,
    msg: {
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt?: number;
    },
  ) => void;
  clearThread: (threadKey: string) => void;
  deleteThread: (threadKey: string) => void;

  reset: () => void;
};

function roundCoord(n: number, digits = 5) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function makeThreadKey(location: Location | null, crop: Crop | null) {
  const lat = location?.lat;
  const lng = location?.lng;
  const cropId = crop?.id;

  const locKey =
    typeof lat === "number" && typeof lng === "number"
      ? `${roundCoord(lat)},${roundCoord(lng)}`
      : "no-location";

  const cKey = cropId ? String(cropId) : "no-crop";
  return `${locKey}__${cKey}`;
}

function shortenAddress(addr: string | null | undefined) {
  const a = (addr || "").trim();
  if (!a) return "";
  // "Quba, Azerbaijan, ..." -> ilk 2 hissə
  const parts = a
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ");
}

export function makeThreadTitle(location: Location | null, crop: Crop | null) {
  const cropName = crop?.nameAz || crop?.name || "Bitki";
  const loc = location
    ? shortenAddress(location.address) || "Seçilmiş məkan"
    : "Məkan yoxdur";
  return `${cropName} • ${loc}`;
}

export function buildThreadMeta(
  location: Location | null,
  crop: Crop | null,
): ChatThreadMeta {
  const threadKey = makeThreadKey(location, crop);
  return {
    threadKey,
    title: makeThreadTitle(location, crop),
    location: location
      ? { lat: location.lat, lng: location.lng, address: location.address }
      : null,
    crop: crop ? { id: crop.id, nameAz: crop.nameAz, name: crop.name } : null,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- base state ---
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

      // --- chat ---
      chatThreads: {},
      activeThreadKey: null,

      // --- basic setters ---
      setLocation: (v) => set({ location: v }),
      setCrop: (v) => set({ selectedCrop: v }),
      setDayIndex: (v) => set({ dayIndex: v }),

      setDataSource: (v) => set({ dataSource: v }),
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
        set({ currentWeather: current, forecast }),

      // --- chat actions ---
      ensureThread: (meta) => {
        const now = Date.now();
        const state = get();
        if (state.chatThreads[meta.threadKey]) return;

        set((s) => ({
          chatThreads: {
            ...s.chatThreads,
            [meta.threadKey]: {
              meta,
              messages: [],
              createdAt: now,
              updatedAt: now,
            },
          },
        }));
      },

      setActiveThreadKey: (key) => set({ activeThreadKey: key }),

      appendChatMessage: (threadKey, msg) => {
        const now = Date.now();
        const createdAt = msg.createdAt ?? now;

        set((s) => {
          const t = s.chatThreads[threadKey];
          if (!t) return s;

          const nextMsg: ChatMessage = {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt,
          };

          return {
            chatThreads: {
              ...s.chatThreads,
              [threadKey]: {
                ...t,
                messages: [...t.messages, nextMsg],
                updatedAt: now,
              },
            },
          };
        });
      },

      clearThread: (threadKey) => {
        set((s) => {
          const t = s.chatThreads[threadKey];
          if (!t) return s;
          return {
            chatThreads: {
              ...s.chatThreads,
              [threadKey]: { ...t, messages: [], updatedAt: Date.now() },
            },
          };
        });
      },

      deleteThread: (threadKey) => {
        set((s) => {
          const next = { ...s.chatThreads };
          delete next[threadKey];
          const nextActive =
            s.activeThreadKey === threadKey ? null : s.activeThreadKey;
          return { chatThreads: next, activeThreadKey: nextActive };
        });
      },

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

          // Chat-ı reset edirsənmi? İstəmirsənsə aşağıdakı 2 sətri sil:
          chatThreads: {},
          activeThreadKey: null,
        }),
    }),
    {
      name: "bereket-app-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        location: s.location,
        selectedCrop: s.selectedCrop,
        dayIndex: s.dayIndex,
        dataSource: s.dataSource,
        firebaseUrl: s.firebaseUrl,
        currentWeather: s.currentWeather,
        forecast: s.forecast,
        chatThreads: s.chatThreads,
        activeThreadKey: s.activeThreadKey,
      }),
    },
  ),
);
