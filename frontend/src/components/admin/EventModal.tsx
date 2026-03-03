import { useState, useEffect } from "react";
import { Checkbox, Label, Modal, ModalBody, ModalHeader, Select, TextInput } from "flowbite-react";
import { useLocale } from "../../context/LocaleContext";
import type { EventItem } from "../../types";

export type EventFormData = Omit<EventItem, "id"> & { is_recurring?: boolean; recurrence_end_date?: string };

interface EventModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => void;
  initialData: EventItem | null;
}

export default function EventModal({ show, onClose, onSave, initialData }: EventModalProps) {
  const { t } = useLocale();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [category, setCategory] = useState("讲座");
  const [totalSpots, setTotalSpots] = useState(20);
  const [spotsLeft, setSpotsLeft] = useState(20);
  const [status, setStatus] = useState("open");
  const [recurring, setRecurring] = useState(false);
  const [recurEnd, setRecurEnd] = useState("");

  // Populate data when modal opens
  useEffect(() => {
    if (show) {
      if (initialData) {
        setTitle(initialData.title);
        setDate(initialData.date);
        setTime(initialData.time || "");
        setLocation(initialData.location);
        setOrganizer(initialData.organizer || "");
        setCategory(initialData.category || "讲座");
        setTotalSpots(initialData.total_spots);
        setSpotsLeft(initialData.spots_left);
        setStatus(initialData.status);
        setRecurring(false); // Can't edit recurrence on an existing event easily
        setRecurEnd("");
      } else {
        setTitle("");
        setDate("");
        setTime("");
        setLocation("");
        setOrganizer("");
        setCategory("Workshop");
        setTotalSpots(20);
        setSpotsLeft(20);
        setStatus("open");
        setRecurring(false);
        setRecurEnd("");
      }
    }
  }, [show, initialData]);

  const handleSave = () => {
    if (!title.trim() || !date) return;
    
    const payload: EventFormData = {
      title, date, time, location, organizer, category, total_spots: totalSpots, spots_left: spotsLeft, status
    };
    
    if (!initialData && recurring && recurEnd) {
      payload.is_recurring = true;
      payload.recurrence_end_date = recurEnd;
    }
    
    onSave(payload);
  };

  const modalTheme = {
    content: {
      inner: "relative flex max-h-[90dvh] flex-col rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:bg-gray-800",
    }
  };

  return (
    <Modal show={show} onClose={onClose} size="3xl" popup position="center" theme={modalTheme}>
      <ModalHeader />
      <ModalBody>
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">
            {initialData ? t("common.actions") : t("admin.create")} {t("admin.formEvent")}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="mb-2 block"><Label>{t("admin.eventTitle")}</Label></div>
              <TextInput sizing="lg" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.eventDate")}</Label></div>
              <TextInput sizing="lg" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.eventTime")}</Label></div>
              <TextInput sizing="lg" placeholder="14:00-16:00" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <div className="mb-2 block"><Label>{t("admin.eventLocation")}</Label></div>
              <TextInput sizing="lg" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.eventOrganizer")}</Label></div>
              <TextInput sizing="lg" value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.eventCategory")}</Label></div>
              <Select sizing="lg" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="讲座">讲座</option>
                <option value="工作坊">工作坊</option>
                <option value="体育">体育</option>
                <option value="文艺">文艺</option>
                <option value="志愿服务">志愿服务</option>
              </Select>
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.eventTotal")}</Label></div>
              <TextInput sizing="lg" type="number" min="1" value={totalSpots} onChange={(e) => setTotalSpots(Number(e.target.value))} />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.eventStatus")}</Label></div>
              <Select sizing="lg" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">open</option>
                <option value="closed">closed</option>
                <option value="cancelled">cancelled</option>
              </Select>
            </div>
          </div>

          {/* Weekly Recurrence (Only on Creation) */}
          {!initialData && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox id="recurring" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                <Label htmlFor="recurring" className="text-sm font-medium cursor-pointer">
                  {t("admin.recurringWeekly")}
                </Label>
              </div>
              <p className="text-xs text-gray-500 mb-3">{t("admin.recurringHint")}</p>
              {recurring && (
                <div className="max-w-xs ml-7">
                  <div className="mb-2 block"><Label>{t("admin.recurringEnd")}</Label></div>
                  <TextInput sizing="lg" type="date" value={recurEnd} onChange={(e) => setRecurEnd(e.target.value)} />
                </div>
              )}
            </div>
          )}
          
          <div className="w-full pt-2">
            <button
              onClick={handleSave}
              type="button"
              style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.625rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }}
              className="w-full text-sm transition-colors border border-transparent shadow-md hover:bg-blue-700"
            >
              {t("admin.create")}
            </button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
