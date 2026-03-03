import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Select,
} from "flowbite-react";
import {
  HiAcademicCap,
  HiAnnotation,
  HiClipboardCheck,
  HiClipboardList,
  HiDownload,
  HiPencil,
  HiPlus,
  HiTrash,
  HiUsers,
} from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import AnnouncementModal, { type AnnouncementFormData } from "../components/admin/AnnouncementModal";
import EventModal, { type EventFormData } from "../components/admin/EventModal";
import type { AnnouncementItem, CheckinItem, EventItem, Registration, UserAdmin } from "../types";

function Admin() {
  const { user, token } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<"ann" | "evt" | "usr" | "reg" | "chk">("ann");

  // Create modal visibility
  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [showCreateEvt, setShowCreateEvt] = useState(false);

  // Edit states
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editingAnn, setEditingAnn] = useState<AnnouncementItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "event" | "announcement"; id: number } | null>(null);

  // Filter states
  const [regEventFilter, setRegEventFilter] = useState<number | "all">("all");
  const [chkEventFilter, setChkEventFilter] = useState<number | "all">("all");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [anns, evts, regs, chks, usrs] = await Promise.all([
          apiFetch<AnnouncementItem[]>("/api/announcements", { token }),
          apiFetch<EventItem[]>("/api/events", { token }),
          apiFetch<Registration[]>("/api/events/registrations", { token }),
          apiFetch<CheckinItem[]>("/api/checkins", { token }),
          apiFetch<UserAdmin[]>("/api/users", { token }),
        ]);
        setAnnouncements(anns);
        setEvents(evts);
        setRegistrations(regs);
        setCheckins(chks);
        setUsers(usrs);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  /* ── Handlers ─────────────────────────────────────────── */

  const handleSaveAnnouncementData = async (data: AnnouncementFormData) => {
    if (!token) return;
    try {
      if (editingAnn) {
        const updated = await apiFetch<AnnouncementItem>(`/api/announcements/${editingAnn.id}`, {
          method: "PUT", token, body: data,
        });
        setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setEditingAnn(null);
        showToast(t("admin.editSuccess"));
      } else {
        const ann = await apiFetch<AnnouncementItem>("/api/announcements", {
          method: "POST", token, body: data,
        });
        setAnnouncements((prev) => [ann, ...prev]);
        setShowCreateAnn(false);
        showToast(t("admin.createSuccess"));
      }
    } catch (err) { showToast(err instanceof ApiError ? err.message : t("common.error"), "error"); }
  };

  const handleSaveEventData = async (data: EventFormData) => {
    if (!token) return;
    try {
      if (editingEvent) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { is_recurring, recurrence_end_date, ...updateData } = data;
        const updated = await apiFetch<EventItem>(`/api/events/${editingEvent.id}`, {
          method: "PUT", token, body: updateData,
        });
        setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setEditingEvent(null);
        showToast(t("admin.editSuccess"));
      } else {
        const result = await apiFetch<EventItem | EventItem[]>("/api/events", {
          method: "POST", token, body: data,
        });
        if (Array.isArray(result)) {
          setEvents((prev) => [...prev, ...result]);
        } else {
          setEvents((prev) => [...prev, result]);
        }
        setShowCreateEvt(false);
        showToast(t("admin.createSuccess"));
      }
    } catch (err) { showToast(err instanceof ApiError ? err.message : t("common.error"), "error"); }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      const url = deleteTarget.type === "event" ? `/api/events/${deleteTarget.id}` : `/api/announcements/${deleteTarget.id}`;
      await apiFetch(url, { method: "DELETE", token });
      if (deleteTarget.type === "event") setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      else setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(t("admin.deleteSuccess"));
    } catch (err) { showToast(err instanceof ApiError ? err.message : t("common.error"), "error"); }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    if (!token) return;
    try {
      await apiFetch(`/api/users/${userId}/role?role=${role}`, { method: "PUT", token });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      showToast(t("admin.roleSuccess"));
    } catch (err) { showToast(err instanceof ApiError ? err.message : t("common.error"), "error"); }
  };

  const handleExport = async (type: "registrations" | "checkins", eventId?: number) => {
    if (!token) return;
    try {
      const url = new URL(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/export/${type}`);
      if (eventId) {
        url.searchParams.append("event_id", eventId.toString());
      }
      
      const res = await fetch(url.toString(), { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const fileName = eventId ? `${type}_event_${eventId}.csv` : `${type}_all.csv`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objUrl);
    } catch { showToast(t("common.error"), "error"); }
  };

  if (user?.role !== "admin") return <Card><p className="text-center py-8 text-gray-500">{t("admin.only")}</p></Card>;

  const stats = [
    { label: t("admin.stats.announcements"), value: announcements.length, icon: HiAnnotation, color: "text-blue-500" },
    { label: t("admin.stats.events"), value: events.length, icon: HiAcademicCap, color: "text-green-500" },
    { label: t("admin.stats.registrations"), value: registrations.length, icon: HiClipboardList, color: "text-purple-500" },
    { label: t("admin.stats.checkins"), value: checkins.length, icon: HiClipboardCheck, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("admin.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("admin.helper")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? "..." : stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "ann", label: t("admin.formAnnouncement") },
            { id: "evt", label: t("admin.formEvent") },
            { id: "usr", label: t("admin.users") },
            { id: "reg", label: t("admin.registrations") },
            { id: "chk", label: t("admin.checkins") },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`py-4 px-6 text-sm font-medium transition-colors relative ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                }`}
                onClick={() => setActiveTab(tab.id as "ann" | "evt" | "usr" | "reg" | "chk")}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-md" />
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-4">

        {/* ────── Announcements Tab ────── */}
        {activeTab === "ann" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.formAnnouncement")}</h3>
              <button
                type="button"
                onClick={() => setShowCreateAnn(true)}
                style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }}
                className="inline-flex items-center text-sm transition-colors border border-transparent shadow-md hover:bg-blue-700"
              >
                <HiPlus className="w-4 h-4 mr-1.5" />{t("admin.create")}
              </button>
            </div>
            {announcements.length === 0 ? (
              <p className="text-center text-gray-400 py-8">{t("admin.noRecords")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">{t("admin.announcementTitle")}</th>
                      <th className="px-6 py-3">{t("admin.announcementCategory")}</th>
                      <th className="px-6 py-3">{t("admin.announcementDate")}</th>
                      <th className="px-6 py-3">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map((a) => (
                      <tr key={a.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{a.title}</td>
                        <td className="px-6 py-4"><Badge color="info" className="w-max">{a.category}</Badge></td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{a.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button size="xs" color="light" onClick={() => setEditingAnn(a)}><HiPencil className="w-3.5 h-3.5" /></Button>
                            <Button size="xs" color="failure" onClick={() => setDeleteTarget({ type: "announcement", id: a.id })}><HiTrash className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ────── Events Tab ────── */}
        {activeTab === "evt" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.formEvent")}</h3>
              <button
                type="button"
                onClick={() => setShowCreateEvt(true)}
                style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }}
                className="inline-flex items-center text-sm transition-colors border border-transparent shadow-md hover:bg-blue-700"
              >
                <HiPlus className="w-4 h-4 mr-1.5" />{t("admin.create")}
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-center text-gray-400 py-8">{t("admin.noRecords")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">{t("admin.eventTitle")}</th>
                      <th className="px-6 py-3">{t("admin.eventDate")}</th>
                      <th className="px-6 py-3">{t("admin.eventLocation")}</th>
                      <th className="px-6 py-3">{t("admin.eventStatus")}</th>
                      <th className="px-6 py-3">{t("admin.eventSpots")}</th>
                      <th className="px-6 py-3">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{e.title}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{e.date}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{e.location}</td>
                        <td className="px-6 py-4"><Badge color={e.status === "open" ? "success" : "gray"} className="w-max">{e.status}</Badge></td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{e.spots_left}/{e.total_spots}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button size="xs" color="light" onClick={() => setEditingEvent(e)} title={t("common.edit")}>
                              <HiPencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="xs" color="light" onClick={() => handleExport("registrations", e.id)} title={t("admin.registrations")}>
                              <HiDownload className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="xs" color="light" onClick={() => handleExport("checkins", e.id)} title={t("admin.checkins")}>
                              <HiClipboardCheck className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="xs" color="failure" onClick={() => setDeleteTarget({ type: "event", id: e.id })} title={t("common.delete")}>
                              <HiTrash className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ────── Users Tab ────── */}
        {activeTab === "usr" && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <HiUsers className="w-5 h-5" />{t("admin.users")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">{t("admin.email")}</th>
                    <th className="px-6 py-3">{t("profile.displayName")}</th>
                    <th className="px-6 py-3">{t("admin.role")}</th>
                    <th className="px-6 py-3">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.id}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{u.email}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{u.display_name || "-"}</td>
                      <td className="px-6 py-4">
                        <Badge color={u.role === "admin" ? "failure" : u.role === "mentor" ? "warning" : "info"} className="w-max">{u.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          sizing="sm"
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.id === user?.id}
                        >
                          <option value="member">member</option>
                          <option value="mentor">mentor</option>
                          <option value="admin">admin</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────── Registrations Tab ────── */}
        {activeTab === "reg" && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.registrations")}</h3>
              <div className="flex items-center gap-3">
                <Select sizing="sm" value={regEventFilter} onChange={(e) => setRegEventFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
                  <option value="all">{t("admin.allEvents")}</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </Select>
                <Button size="sm" color="light" onClick={() => handleExport("registrations", regEventFilter === "all" ? undefined : regEventFilter)}>
                  <HiDownload className="w-4 h-4 mr-1" />{t("admin.exportRegistrations")}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">{t("admin.event")}</th>
                    <th className="px-6 py-3">{t("admin.user")}</th>
                    <th className="px-6 py-3">{t("admin.time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRegs = regEventFilter === "all" ? registrations : registrations.filter((r) => r.event_id === regEventFilter);
                    if (filteredRegs.length === 0) {
                      return <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"><td colSpan={3} className="px-6 py-4"><p className="text-center text-gray-400">{t("admin.noRecords")}</p></td></tr>;
                    }
                    return filteredRegs.map((r) => (
                      <tr key={r.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{r.event_title}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.user_name || r.user_email}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{r.created_at?.slice(0, 16).replace("T", " ")}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────── Checkins Tab ────── */}
        {activeTab === "chk" && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.checkins")}</h3>
              <div className="flex items-center gap-3">
                <Select sizing="sm" value={chkEventFilter} onChange={(e) => setChkEventFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
                  <option value="all">{t("admin.allEvents")}</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </Select>
                <Button size="sm" color="light" onClick={() => handleExport("checkins", chkEventFilter === "all" ? undefined : chkEventFilter)}>
                  <HiDownload className="w-4 h-4 mr-1" />{t("admin.exportCheckins")}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">{t("admin.event")}</th>
                    <th className="px-6 py-3">{t("admin.user")}</th>
                    <th className="px-6 py-3">{t("admin.image")}</th>
                    <th className="px-6 py-3">{t("admin.time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredChks = chkEventFilter === "all" ? checkins : checkins.filter((c) => c.event_id === chkEventFilter);
                    if (filteredChks.length === 0) {
                      return <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"><td colSpan={4} className="px-6 py-4"><p className="text-center text-gray-400">{t("admin.noRecords")}</p></td></tr>;
                    }
                    return filteredChks.map((c) => (
                      <tr key={c.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{c.event_title}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.user_name || c.user_email || "-"}</td>
                        <td className="px-6 py-4">
                          {c.image_url && (
                            <img
                              src={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${c.image_url}`}
                              alt="checkin"
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.created_at?.slice(0, 16).replace("T", " ")}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </Card>

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {/* ═══════════════════ MODALS ═══════════════════ */}
      <AnnouncementModal
        show={showCreateAnn || !!editingAnn}
        onClose={() => { setShowCreateAnn(false); setEditingAnn(null); }}
        onSave={handleSaveAnnouncementData}
        initialData={editingAnn}
        defaultAuthor={user?.display_name || "Admin"}
      />

      <EventModal
        show={showCreateEvt || !!editingEvent}
        onClose={() => { setShowCreateEvt(false); setEditingEvent(null); }}
        onSave={handleSaveEventData}
        initialData={editingEvent}
      />

      {/* Delete confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title={t("common.delete")}
        message={t("admin.deleteConfirm")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default Admin;
