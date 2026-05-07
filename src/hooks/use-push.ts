"use client";

import { useCallback, useEffect, useState } from "react";
import {
  detectPlatform,
  getCurrentSubscription,
  subscribeUser,
  unsubscribeUser,
  type Platform,
} from "@/lib/push/client";

type Permission = "default" | "granted" | "denied" | "unsupported";

export interface UsePushState {
  isSupported: boolean;
  isStandalone: boolean;
  platform: Platform;
  isIOSWithoutStandalone: boolean;
  permission: Permission;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
}

export interface UsePushApi extends UsePushState {
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  clearError: () => void;
}

export function usePush(): UsePushApi {
  const [state, setState] = useState<UsePushState>({
    isSupported: false,
    isStandalone: false,
    platform: "other",
    isIOSWithoutStandalone: false,
    permission: "unsupported",
    isSubscribed: false,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    const info = detectPlatform();
    const isIOS = info.platform === "ios-safari" || info.platform === "ios-chrome";
    const permission: Permission =
      info.isSupported && typeof Notification !== "undefined"
        ? (Notification.permission as Permission)
        : "unsupported";
    let isSubscribed = false;
    try {
      const sub = await getCurrentSubscription();
      isSubscribed = !!sub;
    } catch {
      /* noop */
    }
    setState((s) => ({
      ...s,
      isSupported: info.isSupported,
      isStandalone: info.isStandalone,
      platform: info.platform,
      isIOSWithoutStandalone: isIOS && !info.isStandalone,
      permission,
      isSubscribed,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("VAPID public key no configurada.");
      await subscribeUser(key);
      await refresh();
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await unsubscribeUser();
      await refresh();
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, [refresh]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, subscribe, unsubscribe, clearError };
}
