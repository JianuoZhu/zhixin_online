import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
  Textarea,
} from "flowbite-react";
import { HiThumbUp, HiSearch, HiFilter } from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";
import type { Question, Mentor } from "../types";

function MentorTreeHole() {
  const { token, user } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [selectedMentorIds, setSelectedMentorIds] = useState<number[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [replyQid, setReplyQid] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const load = async () => {
      try {
        const [qData, mData] = await Promise.all([
          apiFetch<Question[]>("/api/qa", { token }),
          apiFetch<Mentor[]>("/api/mentors", { token }),
        ]);
        setQuestions(qData);
        setMentors(mData);
      } finally { setLoading(false); }
    };
    load();
  }, [token]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    questions.forEach((q) => q.tags?.forEach((tag) => tags.add(tag)));
    return [...tags];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase()) && !q.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedTag && !(q.tags || []).includes(selectedTag)) return false;
      return true;
    });
  }, [questions, searchQuery, selectedTag]);

  const handlePublish = async () => {
    if (!token || !newTitle.trim() || !newContent.trim()) return;
    if (selectedMentorIds.length === 0) { showToast(t("mentor.selectRequired"), "error"); return; }
    try {
      const payload = {
        title: newTitle,
        content: newContent,
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
        is_anonymous: isAnonymous,
        mentor_ids: selectedMentorIds,
      };
      const newQ = await apiFetch<Question>("/api/qa", { method: "POST", token, body: payload });
      setQuestions((prev) => [newQ, ...prev]);
      setShowCreate(false);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      setSelectedMentorIds([]);
      setIsAnonymous(false);
      showToast(t("mentor.publishSuccess"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleReply = async (questionId: number) => {
    if (!token || !replyContent.trim()) return;
    try {
      await apiFetch(`/api/qa/${questionId}/answers`, { method: "POST", token, body: { content: replyContent } });
      setReplyContent("");
      setReplyQid(null);
      showToast(t("mentor.replySuccess"));
      const qData = await apiFetch<Question[]>("/api/qa", { token });
      setQuestions(qData);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleVote = async (answerId: number) => {
    if (!token) return;
    try {
      await apiFetch(`/api/qa/answers/${answerId}/vote`, { method: "POST", token });
      showToast(t("mentor.voteSuccess"));
      const qData = await apiFetch<Question[]>("/api/qa", { token });
      setQuestions(qData);
    } catch (err) {
      if (err instanceof ApiError && err.message.includes("Already voted")) {
        showToast(t("mentor.alreadyVoted"), "info");
      } else {
        showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
      }
    }
  };

  const canReply = user?.role === "mentor" || user?.role === "admin";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("mentor.title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("mentor.subtitle")}</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>{t("mentor.ask")}</Button>
        </div>

        {/* Search & filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="flex bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus-within:ring-cyan-500 focus-within:border-cyan-500 w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus-within:ring-cyan-500 dark:focus-within:border-cyan-500 overflow-hidden shadow-sm">
            <div className="flex items-center bg-gray-100 px-3.5 border-r border-gray-300 dark:bg-gray-800 dark:border-gray-600">
              <HiSearch className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              className="bg-transparent border-0 flex-1 px-3 py-2.5 outline-none focus:ring-0 text-sm w-full"
              placeholder={t("mentor.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <HiFilter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm"
            >
              <option value="">{t("mentor.allTags")}</option>
              {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <Card><p className="text-center text-gray-500 py-8">{t("mentor.empty")}</p></Card>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <Card key={q.id} className="overflow-hidden">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{q.title}</h3>
                    <span className="text-xs text-gray-400">{q.created_at?.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{q.content}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(q.tags || []).map((tag) => <Badge key={tag} color="purple">{tag}</Badge>)}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{t("mentor.askedBy")}: {q.asker_name}</span>
                    {q.mentors.length > 0 && (
                      <span>{t("mentor.sentTo")}: {q.mentors.map((m) => m.display_name).join(", ")}</span>
                    )}
                    <span>👁 {q.views}</span>
                  </div>

                  {/* Answers */}
                  {q.answers.length > 0 && (
                    <div className="mt-4 border-t pt-3 space-y-3">
                      {q.answers.map((a) => (
                        <div key={a.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {a.author_name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{a.author_name}</span>
                              {a.is_best && <Badge color="warning" size="xs">{t("mentor.bestAnswer")}</Badge>}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a.content}</p>
                            <button
                              onClick={() => handleVote(a.id)}
                              disabled={a.voted}
                              className={`flex items-center gap-1 mt-1 text-xs transition ${a.voted ? "text-blue-500" : "text-gray-400 hover:text-blue-500"}`}
                            >
                              <HiThumbUp className="w-3.5 h-3.5" />{a.votes}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.answers.length === 0 && (
                    <p className="mt-3 text-sm text-gray-400 italic">{t("mentor.waiting")}</p>
                  )}

                  {/* Reply box */}
                  {canReply && (
                    <div className="mt-4 border-t pt-3">
                      {replyQid === q.id ? (
                        <div className="space-y-2">
                          <Textarea
                            rows={3}
                            placeholder={t("mentor.replyPlaceholder")}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleReply(q.id)}>{t("mentor.replySubmit")}</Button>
                            <Button size="sm" color="gray" onClick={() => setReplyQid(null)}>{t("common.cancel")}</Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" color="light" onClick={() => setReplyQid(q.id)}>{t("mentor.reply")}</Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mentor roster sidebar */}
      <div className="lg:w-72 shrink-0">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("mentor.roster")}</h3>
          {mentors.length === 0 ? (
            <p className="text-sm text-gray-500">{t("mentor.noMentors")}</p>
          ) : (
            <div className="space-y-4 mt-2">
              {mentors.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {m.display_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{m.display_name}</p>
                    {m.title && <p className="text-xs text-gray-500">{m.title}</p>}
                    {m.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.bio}</p>}
                    {m.tags && m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.tags.map((tag) => <Badge key={tag} color="gray" size="xs">{tag}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create question modal */}
      <Modal show={showCreate} onClose={() => setShowCreate(false)} size="lg">
        <ModalHeader>{t("mentor.createTitle")}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label>{t("mentor.questionTitle")}</Label>
              <TextInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            </div>
            <div>
              <Label>{t("mentor.questionDetails")}</Label>
              <Textarea rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)} required />
            </div>
            <div>
              <Label>{t("mentor.questionTags")}</Label>
              <TextInput placeholder="学业, 生活, 实习" value={newTags} onChange={(e) => setNewTags(e.target.value)} />
            </div>
            <div>
              <Label>{t("mentor.selectMentors")}</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {mentors.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedMentorIds.includes(m.id)}
                      onChange={() =>
                        setSelectedMentorIds((prev) =>
                          prev.includes(m.id)
                            ? prev.filter((id) => id !== m.id)
                            : [...prev, m.id]
                        )
                      }
                    />
                    {m.display_name}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
              {t("mentor.anonymous")}
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handlePublish}>{t("mentor.publish")}</Button>
          <Button color="gray" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default MentorTreeHole;
