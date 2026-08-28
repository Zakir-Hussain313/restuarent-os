"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

function timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationBellProps {
    sidebarOpen: boolean;
}

export function NotificationBell({ sidebarOpen }: NotificationBellProps) {
    const [panelOpen, setPanelOpen] = useState(false);
    const [coords, setCoords] = useState({ bottom: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { notifications, unreadCount, toast, dismissToast, markAllRead, clearAll } = useNotifications();
    const { showConfirm } = useAlertModal();

    useEffect(() => {
        if (panelOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const panelWidth = Math.min(384, window.innerWidth - 16); // w-96 = 384px, clamp with 8px margin each side
            const left = Math.min(rect.right + 8, window.innerWidth - panelWidth - 8);
            setCoords({ bottom: window.innerHeight - rect.bottom, left: Math.max(8, left) });
        }
    }, [panelOpen]);

    useEffect(() => {
        if (!panelOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                const panel = document.getElementById("notification-panel-portal");
                if (panel && !panel.contains(e.target as Node)) {
                    setPanelOpen(false);
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [panelOpen]);

    return (
        <>
            <div className="relative">
                <button
                    ref={buttonRef}
                    onClick={() => setPanelOpen((p) => !p)}
                    title="Notifications"
                    className={cn(
                        "relative flex items-center h-9 rounded-full text-[#c8b6ec] hover:bg-white/8 hover:text-white transition-colors",
                        sidebarOpen ? "w-full gap-2.5 px-2.5" : "w-9 justify-center mx-auto"
                    )}
                >
                    <span className="relative shrink-0">
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-coral ring-2 ring-[#5B21B6]" />
                        )}
                    </span>
                    {sidebarOpen && (
                        <>
                            <span className="flex-1 text-left text-sm font-medium">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="shrink-0 min-w-4.5 h-4.5 px-1 rounded-full bg-coral text-white text-[10px] font-semibold flex items-center justify-center">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </>
                    )}
                </button>

            </div>

            {panelOpen && typeof document !== "undefined" && createPortal(
                <div
                    id="notification-panel-portal"
                    style={{ position: "fixed", bottom: coords.bottom, left: coords.left }}
                    className="w-[calc(100vw-2rem)] max-w-96 max-h-80 overflow-y-auto bg-white border border-border rounded-2xl shadow-xl z-200"
                >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-white rounded-t-2xl">
                        <span className="text-sm font-semibold text-foreground">Notifications</span>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead()}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={async () => {
                                        const confirmed = await showConfirm(
                                            "Clear all notifications from your view? Other staff will still see them until they clear too.",
                                            { title: "Clear all notifications?", confirmLabel: "Clear" }
                                        );
                                        if (confirmed) clearAll();
                                    }}
                                    title="Clear all"
                                    className="text-muted-foreground hover:text-primary"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button onClick={() => setPanelOpen(false)}>
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                    {notifications.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet</p>
                    ) : (
                        <ul>
                            {notifications.map((n) => (
                                <li
                                    key={n.id}
                                    className={cn(
                                        "px-3 py-2.5 border-b border-border last:border-0",
                                        !n.isRead && "bg-primary-light"
                                    )}
                                >
                                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt as unknown as string)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>,
                document.body
            )}

            {toast && (
                <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-100 w-auto sm:w-80 bg-white border border-border rounded-2xl shadow-xl p-3 animate-in slide-in-from-bottom-2">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">{toast.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
                        </div>
                        <button onClick={dismissToast} className="shrink-0">
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}