import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "flowbite-react";
import { HiOutlineMail, HiOutlineMailOpen } from "react-icons/hi";

import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";

type Announcement = {
  id: number;
  title: string;
  category: string;
  author: string;
  date: string;
  content: string;
  read: boolean;
};

function Announcements() {
  const { token } = useAuth();
  const { t } = useLocale();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await apiFetch<Announcement[]>("/api/announcements", { token });
        setAnnouncements(data);
        setSelectedAnn(data[0] || null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const unreadCount = useMemo(() => announcements.filter((item) => !item.read).length, [announcements]);

  const handleSelect = async (ann: Announcement) => {
    setSelectedAnn(ann);
    if (!ann.read && token) {
      await apiFetch(`/api/announcements/${ann.id}/read`, { method: "POST", token });
      setAnnouncements((prev) => prev.map((item) => (item.id === ann.id ? { ...item, read: true } : item)));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="lg:w-1/3 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("announcements.title")}</h2>
          <Badge color={unreadCount ? "warning" : "gray"}>{unreadCount}</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {announcements.map((ann) => (
            <button
              key={ann.id}
              type="button"
              onClick={() => handleSelect(ann)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selectedAnn?.id === ann.id
                  ? "border-primary-300 bg-primary-50 dark:bg-gray-800"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-sm font-semibold ${ann.read ? "text-gray-700" : "text-gray-900"}`}>
                    {ann.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{ann.author}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {ann.read ? (
                    <HiOutlineMailOpen className="w-4 h-4 text-gray-400" />
                  ) : (
                    <HiOutlineMail className="w-4 h-4 text-primary-500" />
                  )}
                  <Badge color={ann.read ? "gray" : "info"} size="sm">
                    {ann.read ? t("announcements.read") : t("announcements.unread")}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
          {!loading && announcements.length === 0 && (
            <div className="text-sm text-gray-500">{t("announcements.empty")}</div>
          )}
        </div>
      </Card>

      <Card className="lg:flex-1">
        {selectedAnn ? (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge color="info">{selectedAnn.category}</Badge>
              <span className="text-sm text-gray-500">
                {t("announcements.date")} {selectedAnn.date}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{selectedAnn.title}</h2>
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-4 border-b">
              <span>{t("announcements.author")}: {selectedAnn.author}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p style={{ whiteSpace: "pre-wrap" }}>{selectedAnn.content}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t("announcements.select")}</p>
        )}
      </Card>
    </div>
  );
}

export default Announcements;
