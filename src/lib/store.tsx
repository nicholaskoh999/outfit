import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ItemStatus,
  OutfitCombo,
  OutfitSlot,
  RejectReason,
  StudioDraft,
  UserState,
  WearEntry,
} from "./types";
import { comboKey } from "./data";

const STORAGE_KEY = "outfit.nkmwei.de:v1";

export const DEFAULT_STUDIO: StudioDraft = {
  weight: 72,
  topId: null,
  bottomId: null,
  shoeId: null,
  savedLooks: [],
};

export const EMPTY_STATE: UserState = {
  favoriteLooks: [],
  favoritePieces: [],
  decisions: {},
  wearLog: [],
  statusOverrides: {},
  studio: DEFAULT_STUDIO,
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/** Extends legacy v1 data in place without clearing or renaming its storage key. */
export function migrateUserState(value: unknown): UserState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_STATE;
  const parsed = value as Partial<UserState>;
  const studio = parsed.studio && typeof parsed.studio === "object" ? parsed.studio : DEFAULT_STUDIO;
  const weight = typeof studio.weight === "number" && Number.isFinite(studio.weight)
    ? Math.min(90, Math.max(55, studio.weight))
    : DEFAULT_STUDIO.weight;
  return {
    ...EMPTY_STATE,
    ...parsed,
    favoriteLooks: stringArray(parsed.favoriteLooks),
    favoritePieces: stringArray(parsed.favoritePieces),
    decisions: parsed.decisions && typeof parsed.decisions === "object" ? parsed.decisions : {},
    wearLog: Array.isArray(parsed.wearLog) ? parsed.wearLog : [],
    statusOverrides:
      parsed.statusOverrides && typeof parsed.statusOverrides === "object" ? parsed.statusOverrides : {},
    studio: {
      weight,
      topId: typeof studio.topId === "string" ? studio.topId : null,
      bottomId: typeof studio.bottomId === "string" ? studio.bottomId : null,
      shoeId: typeof studio.shoeId === "string" ? studio.shoeId : null,
      savedLooks: stringArray(studio.savedLooks),
    },
  };
}

export function loadState(): UserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return migrateUserState(JSON.parse(raw));
  } catch {
    return EMPTY_STATE;
  }
}

interface StoreApi {
  user: UserState;
  toggleFavoriteLook: (key: string) => void;
  toggleFavoritePiece: (itemId: string) => void;
  approveOutfit: (combo: OutfitCombo) => void;
  rejectOutfit: (combo: OutfitCombo, reason?: RejectReason) => void;
  clearDecision: (combo: OutfitCombo) => void;
  wearToday: (combo: OutfitCombo) => WearEntry;
  undoWear: (entry: WearEntry) => void;
  setItemStatus: (itemId: string, status: ItemStatus) => void;
  setStudioWeight: (weight: number) => void;
  setStudioSlot: (slot: OutfitSlot, itemId: string | null) => void;
  saveStudioLook: () => void;
  loadStudioLook: (key: string) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Storage unavailable (private mode etc.) — state stays in memory.
    }
  }, [user]);

  const toggleFavoriteLook = useCallback((key: string) => {
    setUser((u) => ({
      ...u,
      favoriteLooks: u.favoriteLooks.includes(key)
        ? u.favoriteLooks.filter((k) => k !== key)
        : [...u.favoriteLooks, key],
    }));
  }, []);

  const toggleFavoritePiece = useCallback((itemId: string) => {
    setUser((u) => ({
      ...u,
      favoritePieces: u.favoritePieces.includes(itemId)
        ? u.favoritePieces.filter((k) => k !== itemId)
        : [...u.favoritePieces, itemId],
    }));
  }, []);

  const approveOutfit = useCallback((combo: OutfitCombo) => {
    setUser((u) => ({
      ...u,
      decisions: {
        ...u.decisions,
        [comboKey(combo)]: { verdict: "approved", date: new Date().toISOString() },
      },
    }));
  }, []);

  const rejectOutfit = useCallback((combo: OutfitCombo, reason?: RejectReason) => {
    setUser((u) => ({
      ...u,
      decisions: {
        ...u.decisions,
        [comboKey(combo)]: { verdict: "rejected", reason, date: new Date().toISOString() },
      },
    }));
  }, []);

  const clearDecision = useCallback((combo: OutfitCombo) => {
    setUser((u) => {
      const decisions = { ...u.decisions };
      delete decisions[comboKey(combo)];
      return { ...u, decisions };
    });
  }, []);

  const wearToday = useCallback((combo: OutfitCombo) => {
    const entry: WearEntry = {
      key: comboKey(combo),
      items: [combo.top, combo.bottom, combo.shoe],
      date: new Date().toISOString(),
    };
    setUser((u) => ({ ...u, wearLog: [...u.wearLog, entry] }));
    return entry;
  }, []);

  const undoWear = useCallback((entry: WearEntry) => {
    setUser((u) => ({
      ...u,
      wearLog: u.wearLog.filter((e) => !(e.key === entry.key && e.date === entry.date)),
    }));
  }, []);

  const setItemStatus = useCallback((itemId: string, status: ItemStatus) => {
    setUser((u) => ({ ...u, statusOverrides: { ...u.statusOverrides, [itemId]: status } }));
  }, []);

  const setStudioWeight = useCallback((weight: number) => {
    setUser((u) => ({
      ...u,
      studio: { ...u.studio, weight: Math.min(90, Math.max(55, weight)) },
    }));
  }, []);

  const setStudioSlot = useCallback((slot: OutfitSlot, itemId: string | null) => {
    const field = `${slot}Id` as "topId" | "bottomId" | "shoeId";
    setUser((u) => ({ ...u, studio: { ...u.studio, [field]: itemId } }));
  }, []);

  const saveStudioLook = useCallback(() => {
    setUser((u) => {
      const { topId, bottomId, shoeId } = u.studio;
      if (!topId || !bottomId || !shoeId) return u;
      const key = comboKey({ top: topId, bottom: bottomId, shoe: shoeId });
      if (u.studio.savedLooks.includes(key)) return u;
      return { ...u, studio: { ...u.studio, savedLooks: [...u.studio.savedLooks, key] } };
    });
  }, []);

  const loadStudioLook = useCallback((key: string) => {
    const [topId, bottomId, shoeId] = key.split("_");
    if (!topId || !bottomId || !shoeId) return;
    setUser((u) => ({ ...u, studio: { ...u.studio, topId, bottomId, shoeId } }));
  }, []);

  const resetAll = useCallback(() => setUser(EMPTY_STATE), []);

  const api = useMemo<StoreApi>(
    () => ({
      user,
      toggleFavoriteLook,
      toggleFavoritePiece,
      approveOutfit,
      rejectOutfit,
      clearDecision,
      wearToday,
      undoWear,
      setItemStatus,
      setStudioWeight,
      setStudioSlot,
      saveStudioLook,
      loadStudioLook,
      resetAll,
    }),
    [
      user,
      toggleFavoriteLook,
      toggleFavoritePiece,
      approveOutfit,
      rejectOutfit,
      clearDecision,
      wearToday,
      undoWear,
      setItemStatus,
      setStudioWeight,
      setStudioSlot,
      saveStudioLook,
      loadStudioLook,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/* Derived wear stats ------------------------------------------------ */

export function wearStatsForCombo(user: UserState, key: string) {
  const entries = user.wearLog.filter((e) => e.key === key);
  return {
    timesWorn: entries.length,
    lastWorn: entries.length ? entries[entries.length - 1].date : null,
    dates: entries.map((e) => e.date),
  };
}

export function wearStatsForItem(user: UserState, itemId: string) {
  const entries = user.wearLog.filter((e) => e.items.includes(itemId));
  return {
    timesWorn: entries.length,
    lastWorn: entries.length ? entries[entries.length - 1].date : null,
  };
}
