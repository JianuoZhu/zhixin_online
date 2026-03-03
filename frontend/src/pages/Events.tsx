import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "flowbite-react";
import {
  HiLocationMarker,
  HiCalendar,
  HiUserGroup,
  HiSearch,
  HiPhotograph,
} from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import type { EventItem, CheckinItem } from "../types";

function Events() {
  const { token } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myCheckins, setMyCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinFile, setCheckinFile] = useState<File | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const load = async () => {
      try {
        const [eventsData, checkinsData] = await Promise.all([
          apiFetch<EventItem[]>("/api/events", { token }),
          apiFetch<CheckinItem[]>("/api/checkins/mine", { token }),
        ]);
        setEvents(eventsData);
        setMyCheckins(checkinsData);
      } finally { setLoading(false); }
    };
    load();
  }, [token]);

  const categories = useMemo(() => [...new Set(events.map((e) => e.category))], [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(e.category)) return false;
      if (statusFilter === "open" && e.status !== "open") return false;
      if (statusFilter === "mine" && !e.registered) return false;
      return true;
    });
  }, [events, searchQuery, selectedCategories, statusFilter]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, EventItem>();
    const standalone: EventItem[] = [];
    
    for (const event of filteredEvents) {
      if (event.group_id) {
        if (!groups.has(event.group_id)) {
          const rep = { ...event };
          rep.title = rep.title.replace(/\s*\(第\d+期\)$/, "");
          rep.date = `${event.date} (系列活动)`;
          groups.set(event.group_id, rep);
        }
      } else {
        standalone.push(event);
      }
    }
    return [...Array.from(groups.values()), ...standalone];
  }, [filteredEvents]);

  const handleRegister = async (eventId: number) => {
    if (!token) return;
    try {
      const updated = await apiFetch<EventItem>(`/api/events/${eventId}/register`, { method: "POST", token });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      if (selectedEvent?.id === eventId) setSelectedEvent(updated);
      showToast(t("events.registerSuccess"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleCancelRegistration = async () => {
    if (!token || !selectedEvent) return;
    setShowCancelConfirm(false);
    try {
      const updated = await apiFetch<EventItem>(`/api/events/${selectedEvent.id}/register`, { method: "DELETE", token });
      setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updated : e)));
      setSelectedEvent(updated);
      showToast(t("events.cancelRegSuccess"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleCheckin = async () => {
    if (!token || !selectedEvent) return;
    try {
      const formData = new FormData();
      if (checkinFile) formData.append("file", checkinFile);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/events/${selectedEvent.id}/checkins`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Checkin failed"); }
      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updated : e)));
      setSelectedEvent(updated);
      setShowCheckinModal(false);
      setCheckinFile(null);
      showToast(t("events.checkInSuccess"));
      const checkinsData = await apiFetch<CheckinItem[]>("/api/checkins/mine", { token });
      setMyCheckins(checkinsData);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const statusBadge = (event: EventItem) => {
    if (event.status === "closed") return <Badge color="gray">{t("events.statusClosed")}</Badge>;
    if (event.spots_left <= 3) return <Badge color="warning">{t("events.statusFew")}</Badge>;
    return <Badge color="success">{t("events.statusOpenLabel")}</Badge>;
  };

  const modalTheme = {
    content: {
      inner: "relative flex max-h-[90dvh] flex-col rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:bg-gray-800",
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filters sidebar */}
      <div className="lg:w-64 shrink-0">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("events.filters")}</h3>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">{t("events.search")}</Label>
              <div className="flex bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus-within:ring-cyan-500 focus-within:border-cyan-500 w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus-within:ring-cyan-500 dark:focus-within:border-cyan-500 overflow-hidden shadow-sm items-stretch mt-1">
                <div className="flex items-center bg-gray-100 px-3 border-r border-gray-300 dark:bg-gray-800 dark:border-gray-600">
                  <HiSearch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <input
                  type="text"
                  className="bg-transparent border-0 flex-1 px-3 py-2 outline-none focus:ring-0 text-sm w-full"
                  placeholder={t("events.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">{t("events.category")}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-gray-500">{t("events.status")}</Label>
              <div className="flex flex-col gap-1 mt-1">
                {(["all", "open", "mine"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg transition ${
                      statusFilter === status ? "bg-primary-100 text-primary-700 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t(`events.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* My Check-ins */}
        <Card className="mt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("events.myCheckins")}</h3>
          {myCheckins.length === 0 ? (
            <p className="text-sm text-gray-500">{t("events.noCheckins")}</p>
          ) : (
            <div className="space-y-2">
              {myCheckins.map((ci) => (
                <div key={ci.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                  {ci.image_url && (
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${ci.image_url}`}
                      alt="checkin"
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ci.event_title}</p>
                    <p className="text-xs text-gray-500">{ci.created_at?.slice(0, 10)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Events grid */}
      <div className="flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : groupedEvents.length === 0 ? (
          <Card><p className="text-center text-gray-500 py-8">{t("events.noEvents")}</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{event.title}</h3>
                    {statusBadge(event)}
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <HiCalendar className="w-4 h-4" />
                      <span>{event.date} {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiLocationMarker className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiUserGroup className="w-4 h-4" />
                      <span>{event.spots_left} / {event.total_spots} {t("events.spotsLeft")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge color="purple">{event.category}</Badge>
                    {event.registered && <Badge color="info">{t("events.registered")}</Badge>}
                    {event.checked_in && <Badge color="success">{t("events.checkInDone")}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event detail modal */}
      <Modal show={!!selectedEvent} onClose={() => setSelectedEvent(null)} size="3xl" popup position="center" theme={modalTheme}>
        {selectedEvent && (
          <>
            <ModalHeader>{selectedEvent.title}</ModalHeader>
            <ModalBody>
              {selectedEvent.image_url && (
                <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-48 object-cover rounded-lg mb-4" />
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {statusBadge(selectedEvent)}
                <Badge color="purple">{selectedEvent.category}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2"><HiCalendar className="w-4 h-4" />{selectedEvent.date} {selectedEvent.time}</div>
                <div className="flex items-center gap-2"><HiLocationMarker className="w-4 h-4" />{selectedEvent.location}</div>
                <div className="flex items-center gap-2"><HiUserGroup className="w-4 h-4" />{selectedEvent.spots_left} / {selectedEvent.total_spots}</div>
              </div>
              {selectedEvent.description && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <div className="flex flex-wrap gap-2">
                {!selectedEvent.registered && selectedEvent.status === "open" && (
                  <button type="button" onClick={() => handleRegister(selectedEvent.id)} style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }} className="text-sm shadow-sm hover:bg-blue-700">{t("events.register")}</button>
                )}
                {selectedEvent.registered && !selectedEvent.checked_in && (
                  <button type="button" onClick={() => setShowCancelConfirm(true)} style={{ backgroundColor: "#eab308", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }} className="text-sm shadow-sm hover:bg-yellow-600">{t("events.cancelReg")}</button>
                )}
                {selectedEvent.registered && selectedEvent.can_check_in && !selectedEvent.checked_in && (
                  <button type="button" onClick={() => setShowCheckinModal(true)} style={{ backgroundColor: "#16a34a", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }} className="inline-flex items-center text-sm shadow-sm hover:bg-green-700">
                    <HiPhotograph className="mr-1 h-4 w-4" />
                    {t("events.checkIn")}
                  </button>
                )}
                {selectedEvent.checked_in && <Badge color="success" className="py-2">{t("events.checkInDone")}</Badge>}
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ backgroundColor: "#6b7280", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }} className="text-sm shadow-sm hover:bg-gray-600">{t("events.close")}</button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Check-in modal */}
      <Modal show={showCheckinModal} onClose={() => setShowCheckinModal(false)} size="lg" popup position="center" theme={modalTheme}>
        <ModalHeader>{t("events.checkInTitle")}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t("events.checkInHint")}</p>
            <div>
              <Label>{t("events.checkInUpload")}</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCheckinFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={handleCheckin} style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }} className="text-sm shadow-sm hover:bg-blue-700">{t("events.checkInSubmit")}</button>
          <button type="button" onClick={() => setShowCheckinModal(false)} style={{ backgroundColor: "#6b7280", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }} className="text-sm shadow-sm hover:bg-gray-600">{t("common.cancel")}</button>
        </ModalFooter>
      </Modal>

      {/* Cancel registration confirm */}
      <ConfirmModal
        show={showCancelConfirm}
        title={t("events.cancelReg")}
        message={t("events.cancelRegConfirm")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        danger
        onConfirm={handleCancelRegistration}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

export default Events;
