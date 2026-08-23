"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { useAuthStore } from "@/store/useAuthStore";
import { queryKeys } from "@/hooks/useMockQuery";
import { getNotificationsAction, markAllReadAction, clearAllNotificationsAction } from "@/features/notifications/actions";

const SOUND_PATH = "/sounds/whatsapp-message-for-iphone.mp3";

export function useNotifications() {
    const queryClient = useQueryClient();
    const currentStaff = useAuthStore((s) => s.currentStaff);
    const isHydrated = useAuthStore((s) => s.isHydrated);
    const branchId = isHydrated ? currentStaff?.branchId : undefined;

    const [toast, setToast] = useState<{ id: string; title: string; message: string } | null>(null);
    const lastSeenIdRef = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(SOUND_PATH);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: queryKeys.notifications.all,
        queryFn: async () => {
            const res = await getNotificationsAction();
            if (res.error) throw new Error(res.error);
            return res.data ?? [];
        },
        enabled: isHydrated && !!branchId,
    });

    const notificationList = useMemo(() => data ?? [], [data]);
    const unreadCount = notificationList.filter((n) => !n.isRead).length;

    // Toast + sound only for genuinely new arrivals — skip the first load.
    useEffect(() => {
        if (notificationList.length === 0) return;
        const newest = notificationList[0];

        if (lastSeenIdRef.current === null) {
            lastSeenIdRef.current = newest.id;
            return;
        }

        if (newest.id !== lastSeenIdRef.current) {
            lastSeenIdRef.current = newest.id;
            setToast({ id: newest.id, title: newest.title, message: newest.message });
            audioRef.current?.play().catch(() => {});
            const timer = setTimeout(() => setToast(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [notificationList]);

    const onRealtimeEvent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    }, [queryClient]);

    useBranchChannel(branchId, "notifications", onRealtimeEvent);

    const { mutate: markAllRead } = useMutation({
        mutationFn: markAllReadAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });

    const { mutate: clearAll } = useMutation({
        mutationFn: clearAllNotificationsAction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });

    return {
        notifications: notificationList,
        unreadCount,
        isLoading,
        toast,
        dismissToast: () => setToast(null),
        markAllRead,
        clearAll,
    };
}