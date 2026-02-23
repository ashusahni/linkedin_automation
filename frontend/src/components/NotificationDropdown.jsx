import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_NOTIFICATIONS = 20;

const typeIcons = {
    lead_imported: '📥',
    lead_created: '👤',
    lead_enriched: '✨',
    campaign_launched: '🚀',
    campaign_paused: '⏸',
    campaign_resumed: '▶',
    campaign_queued: '📦',
    approval_needed: '✋',
    approval_approved: '✅',
    approval_rejected: '❌',
    connection_sent: '🤝',
    message_sent: '💬',
    reply_detected: '💭',
    phantom_completed: '✓',
    phantom_failed: '⚠',
    automation_completed: '🎉',
    automation_failed: '⚠',
    campaign_completed: '🏁',
};

function formatTime(createdAt) {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
}

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await axios.get('/api/notifications/unread-count', {
                skipGlobalErrorHandler: true, // Don't show toast on failure
            });
            setUnreadCount(res.data?.count ?? 0);
        } catch (err) {
            // ignore
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const [listRes, countRes] = await Promise.all([
                axios.get('/api/notifications', {
                    params: { limit: MAX_NOTIFICATIONS },
                    skipGlobalErrorHandler: true, // Don't show toast on failure
                }),
                axios.get('/api/notifications/unread-count', {
                    skipGlobalErrorHandler: true, // Don't show toast on failure
                }),
            ]);
            setNotifications(Array.isArray(listRes.data) ? listRes.data : []);
            setUnreadCount(countRes.data?.count ?? 0);
        } catch (err) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    const markAsRead = async (id, link) => {
        try {
            await axios.patch(`/api/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
            if (link) {
                setOpen(false);
                navigate(link);
            }
        } catch (err) {
            // ignore
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.post('/api/notifications/mark-all-read');
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            // ignore
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-semibold text-primary-foreground bg-primary rounded-full border-2 border-background">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[380px] max-h-[400px] flex flex-col p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                        </button>
                    )}
                </div>
                <div className="overflow-y-auto max-h-[320px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No notifications yet
                        </div>
                    ) : (
                        <div className="py-1">
                            {notifications.map((n) => {
                                const isUnread = !n.read_at;
                                const link = n.data?.link;
                                const icon = typeIcons[n.type] ?? '•';
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => markAsRead(n.id, link)}
                                        className={cn(
                                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                                            isUnread && 'bg-accent/50'
                                        )}
                                    >
                                        <span className="text-base shrink-0 mt-0.5">{icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-medium', isUnread && 'font-semibold')}>
                                                {n.title}
                                            </p>
                                            {n.message && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {n.message}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                {formatTime(n.created_at)}
                                            </p>
                                        </div>
                                        {isUnread && (
                                            <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
