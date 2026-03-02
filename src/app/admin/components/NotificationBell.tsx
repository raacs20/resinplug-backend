"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(() => {
    fetch("/api/admin/notifications?limit=10", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.data || []);
        setUnreadCount(data.meta?.unreadCount || 0);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await fetch("/api/admin/notifications/read", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    fetchNotifications();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "new_order":
        return "\uD83D\uDED2";
      case "low_stock":
        return "\u26A0\uFE0F";
      case "new_review":
        return "\u2B50";
      case "new_customer":
        return "\uD83D\uDC64";
      default:
        return "\uD83D\uDCE2";
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className={`block p-3 hover:bg-muted/50 transition-colors ${
                      !n.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex gap-2">
                      <span className="text-base">{getTypeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !n.isRead ? "font-semibold" : ""
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    className={`p-3 ${!n.isRead ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex gap-2">
                      <span className="text-base">{getTypeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !n.isRead ? "font-semibold" : ""
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <Separator />
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
