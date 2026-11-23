import { useCallback, useEffect, useRef } from 'react';

export type OrbitalHistoryMetric = 'inclination' | 'velocity' | 'reset';
export type OrbitalHistorySystem = 'solar' | 'spiral' | 'nebula';

export interface OrbitalHistoryEntry {
  id: string;
  timestamp: number;
  system: OrbitalHistorySystem;
  metric: OrbitalHistoryMetric;
  label: string;
  previousValue: string;
  newValue: string;
}

interface PendingSample {
  system: OrbitalHistorySystem;
  metric: OrbitalHistoryMetric;
  label: string;
  baselineRaw: number;
  latestRaw: number;
  formatValue: (val: number) => string;
  timerId: number;
}

export function formatOrbitalTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

export function useOrbitalHistoryRecorder(
  appendEntry: (entry: Omit<OrbitalHistoryEntry, 'id' | 'timestamp'>) => void,
  debounceMs = 380,
) {
  const pendingRef = useRef<Record<string, PendingSample>>({});
  const appendRef = useRef(appendEntry);

  useEffect(() => {
    appendRef.current = appendEntry;
  }, [appendEntry]);

  const flushKey = useCallback((key: string) => {
    const sample = pendingRef.current[key];
    if (!sample) return;
    window.clearTimeout(sample.timerId);
    delete pendingRef.current[key];

    const prevFormatted = sample.formatValue(sample.baselineRaw);
    const nextFormatted = sample.formatValue(sample.latestRaw);
    if (prevFormatted === nextFormatted) return;

    appendRef.current({
      system: sample.system,
      metric: sample.metric,
      label: sample.label,
      previousValue: prevFormatted,
      newValue: nextFormatted,
    });
  }, []);

  const recordNumericTransition = useCallback(
    (params: {
      key: string;
      system: OrbitalHistorySystem;
      metric: OrbitalHistoryMetric;
      label: string;
      previousRaw: number;
      nextRaw: number;
      formatValue: (val: number) => string;
    }) => {
      const existing = pendingRef.current[params.key];
      if (existing) {
        window.clearTimeout(existing.timerId);
        existing.system = params.system;
        existing.metric = params.metric;
        existing.label = params.label;
        existing.latestRaw = params.nextRaw;
        existing.formatValue = params.formatValue;
        existing.timerId = window.setTimeout(() => flushKey(params.key), debounceMs);
        return;
      }

      if (params.formatValue(params.previousRaw) === params.formatValue(params.nextRaw)) {
        return;
      }

      const timerId = window.setTimeout(() => flushKey(params.key), debounceMs);
      pendingRef.current[params.key] = {
        system: params.system,
        metric: params.metric,
        label: params.label,
        baselineRaw: params.previousRaw,
        latestRaw: params.nextRaw,
        formatValue: params.formatValue,
        timerId,
      };
    },
    [debounceMs, flushKey],
  );

  const recordImmediateEvent = useCallback(
    (entry: Omit<OrbitalHistoryEntry, 'id' | 'timestamp'>) => {
      if (entry.previousValue === entry.newValue) return;
      appendRef.current(entry);
    },
    [],
  );

  const flushAll = useCallback(() => {
    Object.keys(pendingRef.current).forEach((key) => flushKey(key));
  }, [flushKey]);

  useEffect(() => {
    return () => {
      Object.keys(pendingRef.current).forEach((key) => {
        const sample = pendingRef.current[key];
        if (!sample) return;
        window.clearTimeout(sample.timerId);
      });
      pendingRef.current = {};
    };
  }, []);

  return {
    recordNumericTransition,
    recordImmediateEvent,
    flushAll,
  };
}
