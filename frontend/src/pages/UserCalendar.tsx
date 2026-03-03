import { useEffect, useMemo, useState } from "react";
import { Button, Card, Label, Modal, ModalBody, ModalFooter, ModalHeader, TextInput } from "flowbite-react";
import { HiPlus, HiChevronLeft, HiChevronRight, HiTrash } from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";
import type { CalendarItemType } from "../types";

function UserCalendar() {
  const { token } = useAuth();
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const [items, setItems] = useState<CalendarItemType[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newColor, setNewColor] = useState("info");

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!token) return;
    apiFetch<CalendarItemType[]>("/api/calendar", { token }).then(setItems);
  }, [token]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, i) => i - firstDay + 1);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarItemType[]> = {};
    items.forEach((item) => {
      const d = new Date(item.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = map[day] || [];
        map[day].push(item);
      }
    });
    return map;
  }, [items, year, month]);

  const goToPrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const goToNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleAdd = async () => {
    if (!token || !newTitle || !newDate) return;
    try {
      const created = await apiFetch<CalendarItemType>("/api/calendar", {
        method: "POST", token,
        body: { title: newTitle, date: newDate, color: newColor },
      });
      setItems((prev) => [...prev, created]);
      setShowAdd(false);
      setNewTitle("");
      setNewDate("");
      showToast(t("calendar.addSuccess"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleDelete = async (item: CalendarItemType) => {
    if (!token || item.source !== "custom") return;
    try {
      await apiFetch(`/api/calendar/${item.id}`, { method: "DELETE", token });
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.source === "custom")));
      showToast(t("calendar.deleteSuccess"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const formatter = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { weekday: "short" });
  const days = Array.from({ length: 7 }, (_, index) => formatter.format(new Date(2023, 0, index + 1)));
  const monthLabel = new Date(year, month).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "long" });

  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const colorMap: Record<string, string> = {
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    success: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    failure: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Button size="sm" color="light" onClick={goToPrev}><HiChevronLeft /></Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {monthLabel} {year}
          </h1>
          <Button size="sm" color="light" onClick={goToNext}><HiChevronRight /></Button>
        </div>
        <Button size="sm" onClick={() => { setShowAdd(true); setNewDate(`${year}-${String(month + 1).padStart(2, "0")}-15`); }}>
          <HiPlus className="mr-1" />
          {t("calendar.addEvent")}
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
        {days.map((day) => (
          <div key={day} className="text-center font-semibold py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
            {day}
          </div>
        ))}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`min-h-[100px] p-1.5 bg-white dark:bg-gray-800 overflow-y-auto ${
              day <= 0 || day > daysInMonth ? "bg-gray-50 dark:bg-gray-900/50" : ""
            }`}
          >
            {day > 0 && day <= daysInMonth && (
              <>
                <span
                  className={`text-sm inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday(day)
                      ? "bg-blue-500 text-white font-bold"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {day}
                </span>
                <div className="mt-1 space-y-0.5">
                  {(eventsByDay[day] || []).map((item) => (
                    <div
                      key={`${item.id}-${item.source}`}
                      className={`group relative text-xs px-1.5 py-0.5 rounded truncate ${colorMap[item.color] || colorMap.info}`}
                    >
                      {item.title}
                      {item.source === "custom" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                          className="absolute right-0.5 top-0.5 hidden group-hover:block text-red-500 hover:text-red-700"
                        >
                          <HiTrash className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add event modal */}
      <Modal show={showAdd} onClose={() => setShowAdd(false)} size="sm">
        <ModalHeader>{t("calendar.addEvent")}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label>{t("calendar.eventTitle")}</Label>
              <TextInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            </div>
            <div>
              <Label>{t("calendar.eventDate")}</Label>
              <TextInput type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
            </div>
            <div>
              <Label>{t("calendar.eventColor")}</Label>
              <div className="flex gap-2 mt-1">
                {["info", "success", "warning", "failure", "purple"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      newColor === c ? "border-gray-800 dark:border-white scale-110" : "border-transparent"
                    } ${c === "info" ? "bg-blue-400" : c === "success" ? "bg-green-400" : c === "warning" ? "bg-yellow-400" : c === "failure" ? "bg-red-400" : "bg-purple-400"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleAdd}>{t("calendar.add")}</Button>
          <Button color="gray" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}

export default UserCalendar;
