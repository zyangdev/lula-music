import { create } from "zustand";
import type { RepeatMode, Song } from "../types";
import { getRadio } from "../lib/api";
import {
  getSetting,
  setSetting,
  getTrims,
  setTrim as dbSetTrim,
  clearTrim as dbClearTrim,
  type Trim,
} from "../lib/db";

const PERSIST_KEY = "player_state";

/**
 * Resolves a YouTube videoId to a directly-playable audio stream URL.
 * Injected in Fase 1 (via the Rust/yt-dlp backend). Until then it's null
 * and the player only tracks UI state without producing sound.
 */
type StreamResolver = (videoId: string) => Promise<string>;
let streamResolver: StreamResolver | null = null;
export function setStreamResolver(resolver: StreamResolver) {
  streamResolver = resolver;
}

const audio = typeof Audio !== "undefined" ? new Audio() : null;
let sleepTimeoutId: ReturnType<typeof setTimeout> | null = null;

// id of the track currently loaded into the <audio> element, and a pending
// resume position used after restoring a saved session (lazy: the stream is
// only resolved once the user hits play).
let loadedId: string | null = null;
let resumeAt = 0;
// Debounced + throttled persistence of the session to SQLite.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastTimePersist = 0;

interface PlayerState {
  queue: Song[];
  index: number;
  isPlaying: boolean;
  loadingTrack: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
  radioLoading: boolean;
  sleepAt: number | null;
  error: string | null;
  /** Per-song start/end clips, keyed by song id. */
  trims: Record<string, Trim>;

  current: () => Song | null;
  currentTrim: () => Trim | null;
  loadTrims: () => Promise<void>;
  setTrim: (start: number, end: number | null) => void;
  clearTrim: () => void;
  playNow: (song: Song) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  playRadio: (seed: Song) => Promise<void>;
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  moveInQueue: (from: number, to: number) => void;
  removeFromQueue: (index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  setSleepTimer: (minutes: number | null) => void;
  /** Restore the last session (queue + current track + position), paused. */
  restore: () => Promise<void>;
}

export const usePlayer = create<PlayerState>((set, get) => {
  async function loadCurrent(autoplay: boolean, seekTo = 0) {
    const song = get().current();
    if (!song || !audio) return;
    schedulePersist();
    // A restored position (seekTo) wins; otherwise start at the song's trim.
    const trimStart = get().trims[song.id]?.start ?? 0;
    const startAt = seekTo > 0 ? seekTo : trimStart;
    set({ loadingTrack: true, error: null, currentTime: startAt, duration: song.duration ?? 0 });
    try {
      if (!streamResolver) {
        // Fase 0: no backend yet — keep metadata visible, no audio.
        set({ loadingTrack: false, isPlaying: false });
        return;
      }
      const url = await streamResolver(song.id);
      // Guard against a newer track having been selected meanwhile.
      if (get().current()?.id !== song.id) return;
      audio.src = url;
      audio.load();
      loadedId = song.id;
      if (startAt > 0) {
        // Apply the resume/trim start once the media knows its duration.
        const applySeek = () => {
          audio.currentTime = startAt;
          audio.removeEventListener("loadedmetadata", applySeek);
        };
        audio.addEventListener("loadedmetadata", applySeek);
      }
      if (autoplay) {
        await audio.play();
        set({ isPlaying: true });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isPlaying: false });
    } finally {
      set({ loadingTrack: false });
    }
  }

  function doPersist() {
    const { queue, index, currentTime, volume, muted, repeat, shuffle, autoplay } = get();
    if (queue.length === 0) return;
    void setSetting(
      PERSIST_KEY,
      JSON.stringify({ queue, index, currentTime, volume, muted, repeat, shuffle, autoplay })
    );
  }

  /** Coalesce frequent state changes into one write ~500ms later. */
  function schedulePersist() {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      doPersist();
    }, 500);
  }

  /** When the queue runs out and autoplay is on, append a radio mix. */
  async function extendWithRadio(): Promise<boolean> {
    const seed = get().current() ?? get().queue[get().queue.length - 1];
    if (!seed) return false;
    set({ radioLoading: true });
    try {
      const related = await getRadio(seed.id);
      const have = new Set(get().queue.map((s) => s.id));
      const fresh = related.filter((s) => !have.has(s.id));
      if (fresh.length === 0) return false;
      set({ queue: [...get().queue, ...fresh] });
      return true;
    } catch {
      return false;
    } finally {
      set({ radioLoading: false });
    }
  }

  if (audio) {
    audio.addEventListener("timeupdate", () => {
      const t = audio.currentTime;
      set({ currentTime: t });
      // Trim end: stop the track early (loop or advance like a natural end).
      const song = get().current();
      const trim = song ? get().trims[song.id] : undefined;
      if (trim?.end != null && t >= trim.end) {
        if (get().repeat === "one") {
          audio.currentTime = trim.start ?? 0;
        } else {
          get().next();
        }
        return;
      }
      // Persist the playback position at most once every 5s while playing.
      const now = Date.now();
      if (now - lastTimePersist > 5000) {
        lastTimePersist = now;
        schedulePersist();
      }
    });
    audio.addEventListener("durationchange", () => set({ duration: audio.duration || 0 }));
    audio.addEventListener("play", () => set({ isPlaying: true }));
    audio.addEventListener("pause", () => {
      set({ isPlaying: false });
      schedulePersist();
    });
    audio.addEventListener("ended", () => {
      const { repeat } = get();
      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play();
      } else {
        get().next();
      }
    });
    audio.addEventListener("error", () => {
      // Stream URLs from YouTube can expire or be region-locked.
      if (!audio.src) return;
      const code = audio.error?.code;
      set({
        isPlaying: false,
        loadingTrack: false,
        error:
          code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? "Este audio no se pudo reproducir (formato o restricción de YouTube)."
            : "Error de reproducción. La URL pudo expirar; intenta de nuevo.",
      });
    });
  }

  return {
    queue: [],
    index: -1,
    isPlaying: false,
    loadingTrack: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    repeat: "off",
    shuffle: false,
    autoplay: true,
    radioLoading: false,
    sleepAt: null,
    error: null,
    trims: {},

    current: () => {
      const { queue, index } = get();
      return index >= 0 && index < queue.length ? queue[index] : null;
    },

    currentTrim: () => {
      const song = get().current();
      return song ? (get().trims[song.id] ?? null) : null;
    },

    loadTrims: async () => set({ trims: await getTrims() }),

    setTrim: (start, end) => {
      const song = get().current();
      if (!song) return;
      const clean = {
        start: Math.max(0, start),
        end: end != null ? Math.max(start, end) : null,
      };
      set({ trims: { ...get().trims, [song.id]: clean } });
      void dbSetTrim(song, clean.start, clean.end);
      // If we're before the new start, jump forward so it takes effect now.
      if (audio && audio.currentTime < clean.start) audio.currentTime = clean.start;
    },

    clearTrim: () => {
      const song = get().current();
      if (!song) return;
      const next = { ...get().trims };
      delete next[song.id];
      set({ trims: next });
      void dbClearTrim(song.id);
    },

    playNow: (song) => {
      set({ queue: [song], index: 0 });
      void loadCurrent(true);
    },

    playQueue: (songs, startIndex = 0) => {
      if (songs.length === 0) return;
      set({ queue: songs, index: Math.max(0, Math.min(startIndex, songs.length - 1)) });
      void loadCurrent(true);
    },

    toggle: () => {
      if (!audio) return;
      if (get().isPlaying) {
        audio.pause();
        return;
      }
      const song = get().current();
      if (!song) return;
      // First play after a restore (or nothing loaded yet): resolve the stream
      // and resume from the saved position.
      if (loadedId !== song.id) {
        const seekTo = resumeAt;
        resumeAt = 0;
        void loadCurrent(true, seekTo);
        return;
      }
      void audio.play().catch(() => {});
    },

    next: () => {
      const { index, queue, shuffle, repeat, autoplay } = get();
      if (queue.length === 0) return;
      let nextIndex: number;
      if (shuffle) {
        nextIndex = Math.floor((get().currentTime + Date.now()) % queue.length);
        if (nextIndex === index) nextIndex = (index + 1) % queue.length;
      } else {
        nextIndex = index + 1;
      }
      if (nextIndex >= queue.length) {
        if (repeat === "all") {
          nextIndex = 0;
        } else if (autoplay) {
          // Keep the music going with a radio mix of the last song.
          void extendWithRadio().then((ok) => {
            if (ok) {
              set({ index: nextIndex });
              void loadCurrent(true);
            } else {
              set({ isPlaying: false });
              audio?.pause();
            }
          });
          return;
        } else {
          set({ isPlaying: false });
          audio?.pause();
          return;
        }
      }
      set({ index: nextIndex });
      void loadCurrent(true);
    },

    jumpTo: (i) => {
      if (i < 0 || i >= get().queue.length) return;
      set({ index: i });
      void loadCurrent(true);
    },

    playRadio: async (seed) => {
      set({ queue: [seed], index: 0, radioLoading: true });
      void loadCurrent(true);
      try {
        const related = await getRadio(seed.id);
        const have = new Set(get().queue.map((s) => s.id));
        const fresh = related.filter((s) => !have.has(s.id));
        set({ queue: [seed, ...fresh] });
      } finally {
        set({ radioLoading: false });
      }
    },

    addToQueue: (song) => {
      const { queue, index } = get();
      set({ queue: [...queue, song] });
      if (index < 0) {
        set({ index: 0 });
        void loadCurrent(true);
      } else {
        schedulePersist();
      }
    },

    playNext: (song) => {
      const { queue, index } = get();
      const next = [...queue];
      next.splice(index + 1, 0, song);
      set({ queue: next });
      if (index < 0) {
        set({ index: 0 });
        void loadCurrent(true);
      } else {
        schedulePersist();
      }
    },

    moveInQueue: (from, to) => {
      const { queue, index } = get();
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= queue.length ||
        to >= queue.length
      )
        return;
      const currentId = queue[index]?.id;
      const next = [...queue];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      // Keep `index` pointing at the song that's actually playing.
      const newIndex = currentId ? next.findIndex((s) => s.id === currentId) : index;
      set({ queue: next, index: newIndex });
      schedulePersist();
    },

    removeFromQueue: (i) => {
      const { queue, index } = get();
      if (i < 0 || i >= queue.length) return;
      const next = queue.filter((_, k) => k !== i);
      if (next.length === 0) {
        audio?.pause();
        loadedId = null;
        set({ queue: [], index: -1, isPlaying: false, currentTime: 0, duration: 0 });
        schedulePersist();
        return;
      }
      if (i < index) {
        // A track before the current one shifted everything down by one.
        set({ queue: next, index: index - 1 });
      } else if (i === index) {
        // Removed the playing track — start whatever now sits in its slot.
        const newIndex = Math.min(index, next.length - 1);
        set({ queue: next, index: newIndex });
        void loadCurrent(true);
      } else {
        set({ queue: next });
      }
      schedulePersist();
    },

    toggleAutoplay: () => {
      set({ autoplay: !get().autoplay });
      schedulePersist();
    },

    setSleepTimer: (minutes) => {
      if (sleepTimeoutId) {
        clearTimeout(sleepTimeoutId);
        sleepTimeoutId = null;
      }
      if (minutes === null || minutes <= 0) {
        set({ sleepAt: null });
        return;
      }
      const ms = minutes * 60_000;
      sleepTimeoutId = setTimeout(() => {
        audio?.pause();
        set({ sleepAt: null });
        sleepTimeoutId = null;
      }, ms);
      set({ sleepAt: Date.now() + ms });
    },

    prev: () => {
      const { index, currentTime } = get();
      if (audio && currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      if (index <= 0) {
        if (audio) audio.currentTime = 0;
        return;
      }
      set({ index: index - 1 });
      void loadCurrent(true);
    },

    seek: (seconds) => {
      if (audio) audio.currentTime = seconds;
      set({ currentTime: seconds });
      schedulePersist();
    },

    setVolume: (v) => {
      const vol = Math.max(0, Math.min(1, v));
      if (audio) audio.volume = vol;
      set({ volume: vol, muted: vol === 0 });
      schedulePersist();
    },

    toggleMute: () => {
      const { muted, volume } = get();
      const next = !muted;
      if (audio) audio.muted = next;
      set({ muted: next });
      if (audio && !next) audio.volume = volume;
      schedulePersist();
    },

    cycleRepeat: () => {
      const order: RepeatMode[] = ["off", "all", "one"];
      const i = order.indexOf(get().repeat);
      set({ repeat: order[(i + 1) % order.length] });
      schedulePersist();
    },

    toggleShuffle: () => {
      set({ shuffle: !get().shuffle });
      schedulePersist();
    },

    restore: async () => {
      try {
        const raw = await getSetting(PERSIST_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as {
          queue?: Song[];
          index?: number;
          currentTime?: number;
          volume?: number;
          muted?: boolean;
          repeat?: RepeatMode;
          shuffle?: boolean;
          autoplay?: boolean;
        };
        if (!Array.isArray(saved.queue) || saved.queue.length === 0) return;
        const index = Math.min(Math.max(saved.index ?? 0, 0), saved.queue.length - 1);
        const song = saved.queue[index];
        resumeAt = typeof saved.currentTime === "number" ? saved.currentTime : 0;
        const volume = saved.volume ?? get().volume;
        const muted = saved.muted ?? false;
        if (audio) {
          audio.volume = muted ? 0 : volume;
          audio.muted = muted;
        }
        // Load metadata only — the stream is resolved lazily on first play.
        set({
          queue: saved.queue,
          index,
          currentTime: resumeAt,
          duration: song?.duration ?? 0,
          volume,
          muted,
          repeat: saved.repeat ?? "off",
          shuffle: saved.shuffle ?? false,
          autoplay: saved.autoplay ?? true,
          isPlaying: false,
        });
      } catch {
        // Corrupt or outdated payload — start with an empty session.
      }
    },
  };
});
