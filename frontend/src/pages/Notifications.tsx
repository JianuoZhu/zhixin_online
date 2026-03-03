import { useEffect, useMemo, useState } from "react";
import { Card } from "flowbite-react";
import {
  HiBell,
  HiCalendar,
  HiChatAlt2,
  HiSpeakerphone,
  HiCheck,
} from "react-icons/hi";

import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import type { AnnouncementItem, EventItem, Question } from "../types";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "announcement" | "event" | "qa" | "system";
  read: boolean;
}

function Notifications() {
  const { token } = useAuth();
  const { t } = useLocale();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [announcements, events, questions] = await Promise.all([
          apiFetch<AnnouncementItem[]>("/api/announcements", { token }),
          apiFetch<EventItem[]>("/api/events", { token }),
          apiFetch<Question[]>("/api/qa", { token }),
        ]);

        const items: NotificationItem[] = [];

        // Convert announcements to notifications
        announcements.forEach((a) => {
          items.push({
            id: `ann-${a.id}`,
            title: a.title,
            description: `${a.author} · ${a.category}`,
            time: a.date,
            type: "announcement",
            read: a.read || false,
          });
        });

        // Convert events with open registration to notifications
        events
          .filter((e) => e.status === "open")
          .forEach((e) => {
            items.push({
              id: `evt-${e.id}`,
              title: `${t("notifications.eventOpen")}: ${e.title}`,
              description: `${e.date} · ${e.location}`,
              time: e.date,
              type: "event",
              read: false,
            });
          });

        // Convert new Q&A answers to notifications
        questions.forEach((q) => {
          if (q.answers.length > 0) {
            items.push({
              id: `qa-${q.id}`,
              title: `${t("notifications.newAnswer")}: ${q.title}`,
              description: `${q.answers.length} ${t("notifications.answers")}`,
              time: q.created_at || "",
              type: "qa",
              read: false,
            });
          }
        });

        // Sort by date descending
        items.sort((a, b) => b.time.localeCompare(a.time));
        setNotifications(items);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, t]);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    announcement: HiSpeakerphone,
    event: HiCalendar,
    qa: HiChatAlt2,
    system: HiBell,
  };

  const colorMap: Record<string, string> = {
    announcement: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    event: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    qa: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    system: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HiBell className="w-6 h-6" />
            {t("notifications.title")}
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount} {t("notifications.unread")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                filter === "all"
                  ? "bg-white dark:bg-gray-600 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("notifications.all")}
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                filter === "unread"
                  ? "bg-white dark:bg-gray-600 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("notifications.unreadOnly")}
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
            >
              <HiCheck className="w-4 h-4" />
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <HiBell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === "unread"
                ? t("notifications.noUnread")
                : t("notifications.empty")}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const Icon = iconMap[notification.type] || HiBell;
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => markAsRead(notification.id)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition hover:shadow-sm ${
                  notification.read
                    ? "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-70"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    colorMap[notification.type]
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm truncate ${
                        notification.read
                          ? "text-gray-600 dark:text-gray-400"
                          : "font-semibold text-gray-900 dark:text-white"
                      }`}
                    >
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {notification.description}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-1">
                  {notification.time.slice(0, 10)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;
