/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

type Row = { id: string } & Record<string, any>;

type Store<T extends Row> = {
  data: T[];
  loading: boolean;
  online: boolean;
  lastSync: number | null;
  subscribers: Set<() => void>;
  loaded: boolean;
};

const stores: Record<string, Store<any>> = {};
const channels: Record<string, any> = {};

let onlineGlobal = typeof navigator !== "undefined" ? navigator.onLine : true;
const onlineSubs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    onlineGlobal = true;
    onlineSubs.forEach((f) => f());
    // Re-fetch all tables
    Object.keys(stores).forEach((t) => refetch(t));
  });
  window.addEventListener("offline", () => {
    onlineGlobal = false;
    onlineSubs.forEach((f) => f());
  });
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    (cb) => {
      onlineSubs.add(cb);
      return () => onlineSubs.delete(cb);
    },
    () => onlineGlobal,
    () => true,
  );
}

const cacheKey = (t: string) => `tdk_cache_${t}`;

function notify(table: string) {
  const s = stores[table];
  if (!s) return;
  s.subscribers.forEach((f) => f());
}

function getStore<T extends Row>(table: string): Store<T> {
  if (!stores[table]) {
    stores[table] = {
      data: [],
      loading: true,
      online: onlineGlobal,
      lastSync: null,
      subscribers: new Set(),
      loaded: false,
    };
    // Hydrate from localStorage
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(cacheKey(table));
        if (cached) {
          stores[table].data = JSON.parse(cached);
        }
      } catch {
        /* ignore */
      }
    }
  }
  return stores[table];
}

function persist(table: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(table), JSON.stringify(stores[table].data));
  } catch {
    /* ignore */
  }
}

async function refetch(table: string) {
  const s = stores[table];
  if (!s) return;
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    s.data = (data as any[]) || [];
    s.loading = false;
    s.loaded = true;
    s.lastSync = Date.now();
    persist(table);
    notify(table);
  } catch (e) {
    console.warn("[sync] refetch failed for", table, e);
    s.loading = false;
    notify(table);
  }
}

function subscribeRealtime(table: string) {
  if (channels[table]) return;
  const ch = supabase
    .channel(`rt-${table}`)
    .on(
      "postgres_changes" as any,
      { event: "*", schema: "public", table },
      (payload: any) => {
        const s = stores[table];
        if (!s) return;
        if (payload.eventType === "INSERT") {
          if (!s.data.find((r) => r.id === payload.new.id)) {
            s.data = [payload.new, ...s.data];
          }
        } else if (payload.eventType === "UPDATE") {
          s.data = s.data.map((r) =>
            r.id === payload.new.id ? payload.new : r,
          );
        } else if (payload.eventType === "DELETE") {
          s.data = s.data.filter((r) => r.id !== payload.old.id);
        }
        s.lastSync = Date.now();
        persist(table);
        notify(table);
      },
    )
    .subscribe();
  channels[table] = ch;
}

export function useTable<T extends Row>(table: string) {
  const s = getStore<T>(table);

  useEffect(() => {
    if (!s.loaded) {
      refetch(table);
    }
    subscribeRealtime(table);
  }, [table, s.loaded]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    s.subscribers.add(cb);
    return () => {
      s.subscribers.delete(cb);
    };
  }, [s]);

  return {
    data: s.data as T[],
    loading: s.loading,
    lastSync: s.lastSync,
  };
}

// Optimistic mutations with realtime fallback
export async function insertRow<T extends Row>(table: string, row: T) {
  const s = getStore<T>(table);
  s.data = [row, ...s.data.filter((r) => r.id !== row.id)];
  persist(table);
  notify(table);
  const { error } = await supabase.from(table).insert(row as any);
  if (error) {
    console.error("[insert]", table, error);
    throw error;
  }
}

export async function upsertRow<T extends Row>(table: string, row: T) {
  const s = getStore<T>(table);
  const exists = s.data.find((r) => r.id === row.id);
  if (exists) {
    s.data = s.data.map((r) => (r.id === row.id ? row : r));
  } else {
    s.data = [row, ...s.data];
  }
  persist(table);
  notify(table);
  const { error } = await supabase.from(table).upsert(row as any);
  if (error) {
    console.error("[upsert]", table, error);
    throw error;
  }
}

export async function updateRow<T extends Row>(
  table: string,
  id: string,
  patch: Partial<T>,
) {
  const s = getStore<T>(table);
  s.data = s.data.map((r) => (r.id === id ? { ...r, ...patch } : r));
  persist(table);
  notify(table);
  const { error } = await supabase
    .from(table)
    .update(patch as any)
    .eq("id", id);
  if (error) {
    console.error("[update]", table, error);
    throw error;
  }
}

export async function deleteRow(table: string, id: string) {
  const s = getStore(table);
  s.data = s.data.filter((r) => r.id !== id);
  persist(table);
  notify(table);
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error("[delete]", table, error);
    throw error;
  }
}

export function getLastSync(table: string) {
  return stores[table]?.lastSync ?? null;
}

export function getAnyLastSync() {
  const times = Object.values(stores)
    .map((s) => s.lastSync)
    .filter((t): t is number => !!t);
  return times.length ? Math.max(...times) : null;
}
