import { useState, useEffect } from "react";
import { Label, Modal, ModalBody, ModalHeader, Select, TextInput, Textarea } from "flowbite-react";
import { useLocale } from "../../context/LocaleContext";
import type { AnnouncementItem } from "../../types";

export type AnnouncementFormData = Omit<AnnouncementItem, "id" | "read">;

interface AnnouncementModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: AnnouncementFormData) => void;
  initialData: AnnouncementItem | null;
  defaultAuthor?: string;
}

export default function AnnouncementModal({ show, onClose, onSave, initialData, defaultAuthor }: AnnouncementModalProps) {
  const { t } = useLocale();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("重要通知");
  const [author, setAuthor] = useState("");
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (show) {
      if (initialData) {
        setTitle(initialData.title);
        setCategory(initialData.category);
        setAuthor(initialData.author || defaultAuthor || "Admin");
        setDate(initialData.date);
        setContent(initialData.content);
      } else {
        setTitle("");
        setCategory("重要通知");
        setAuthor(defaultAuthor || "Admin");
        setDate(new Date().toISOString().slice(0, 10));
        setContent("");
      }
    }
  }, [show, initialData, defaultAuthor]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, category, author, date, content });
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
            {initialData ? t("common.actions") : t("admin.create")} {t("admin.formAnnouncement")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-2 block"><Label>{t("admin.announcementTitle")}</Label></div>
              <TextInput sizing="lg" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.announcementCategory")}</Label></div>
              <Select sizing="lg" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="重要通知">重要通知</option>
                <option value="活动快讯">活动快讯</option>
                <option value="失物招领">失物招领</option>
                <option value="教务信息">教务信息</option>
              </Select>
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.announcementAuthor")}</Label></div>
              <TextInput sizing="lg" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div>
              <div className="mb-2 block"><Label>{t("admin.announcementDate")}</Label></div>
              <TextInput sizing="lg" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="mb-2 block"><Label>{t("admin.announcementContent")}</Label></div>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="w-full pt-2">
            <button
              onClick={handleSave}
              type="button"
              className="w-full px-4 py-2.5 text-sm font-medium text-white transition-colors bg-blue-600 border border-transparent rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-900"
            >
              {t("admin.create")}
            </button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
