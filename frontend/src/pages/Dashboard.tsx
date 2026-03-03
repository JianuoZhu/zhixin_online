import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card } from "flowbite-react";
import {
  HiCalendar,
  HiClipboardList,
  HiQuestionMarkCircle,
  HiOfficeBuilding,
  HiLocationMarker,
} from "react-icons/hi";

import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import type { EventItem, AnnouncementItem, CalendarItemType, Question } from "../types";

function Dashboard() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [schedule, setSchedule] = useState<CalendarItemType[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [evts, anns, cal, qa] = await Promise.all([
          apiFetch<EventItem[]>("/api/events", { token }),
          apiFetch<AnnouncementItem[]>("/api/announcements", { token }),
          apiFetch<CalendarItemType[]>("/api/calendar", { token }),
          apiFetch<Question[]>("/api/qa", { token }),
        ]);
        setEvents(evts);
        setAnnouncements(anns);
        setSchedule(cal);
        setQuestions(qa);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const upcomingEvents = events.filter((e) => e.status === "open").slice(0, 2);
  const latestAnnouncements = announcements.slice(0, 3);
  const highlightQ = questions[0] || null;

  const quickActions = [
    { icon: HiOfficeBuilding, label: t("dashboard.actions.book"), color: "from-blue-500 to-indigo-500", to: "/booking" },
    { icon: HiClipboardList, label: t("dashboard.actions.join"), color: "from-green-500 to-emerald-500", to: "/events" },
    { icon: HiQuestionMarkCircle, label: t("dashboard.actions.ask"), color: "from-purple-500 to-pink-500", to: "/mentors" },
    { icon: HiCalendar, label: t("dashboard.actions.calendar"), color: "from-orange-500 to-amber-500", to: "/calendar" },
  ];

  if (error) {
    return (
      <Card><p className="text-center text-red-500 py-8">{t("dashboard.loadError")}</p></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to))" }}>
        <h1 className="text-2xl font-bold">{t("dashboard.welcome")}, {user?.display_name || user?.email}</h1>
        <p className="text-white/80 mt-1">{t("dashboard.subtitle")}</p>
        <div className="flex flex-wrap gap-3 mt-5">
          {quickActions.map((action) => (
            <button
              key={action.to}
              onClick={() => navigate(action.to)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-sm font-medium"
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content: 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommended events */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("dashboard.recommended")}</h2>
              <button onClick={() => navigate("/events")} className="text-sm text-blue-600 hover:underline">{t("dashboard.viewAll")}</button>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">{t("events.noEvents")}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate("/events")}
                    className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700 hover:shadow-md transition cursor-pointer"
                  >
                    {event.image_url && (
                      <img src={event.image_url} alt={event.title} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <HiCalendar className="w-3.5 h-3.5" />
                        <span>{event.date}</span>
                        <HiLocationMarker className="w-3.5 h-3.5 ml-1" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tree hole highlight */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("dashboard.highlight")}</h2>
              <button onClick={() => navigate("/mentors")} className="text-sm text-blue-600 hover:underline">{t("dashboard.visitBoard")}</button>
            </div>
            {loading ? (
              <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
            ) : highlightQ ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{highlightQ.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{highlightQ.content}</p>
                <div className="flex gap-2 mt-2">
                  {(highlightQ.tags || []).slice(0, 3).map((tag) => (
                    <Badge key={tag} color="purple" size="xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">{t("mentor.empty")}</p>
            )}
          </Card>
        </div>

        {/* Sidebar: 1/3 */}
        <div className="space-y-6">
          {/* My schedule */}
          <Card>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("dashboard.schedule")}</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">{t("dashboard.noSchedule")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("dashboard.scheduleHint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule.slice(0, 5).map((item) => (
                  <div
                    key={`${item.id}-${item.source}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <div className={`w-2 h-8 rounded-full ${
                      item.source === "event" ? "bg-blue-400" :
                      item.source === "booking" ? "bg-green-400" : "bg-purple-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Latest announcements */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("dashboard.latestAnnouncements")}</h2>
              <button onClick={() => navigate("/announcements")} className="text-sm text-blue-600 hover:underline">{t("dashboard.more")}</button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />)}
              </div>
            ) : latestAnnouncements.length === 0 ? (
              <p className="text-sm text-gray-500">{t("dashboard.noAnnouncements")}</p>
            ) : (
              <div className="space-y-3">
                {latestAnnouncements.map((ann) => (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => navigate("/announcements")}
                    className="w-full text-left group"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition truncate">{ann.title}</p>
                    <p className="text-xs text-gray-500">{ann.author} · {ann.date}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
