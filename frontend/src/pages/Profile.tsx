import { useEffect, useState } from "react";
import { Button, Card, Label, TextInput, Textarea, Badge } from "flowbite-react";
import { HiUser, HiLockClosed, HiAcademicCap } from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";
import type { Mentor } from "../types";

function Profile() {
  const { user, token, refresh } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Mentor profile state
  const [mentorProfile, setMentorProfile] = useState<Mentor | null>(null);
  const [mentorTitle, setMentorTitle] = useState("");
  const [mentorBio, setMentorBio] = useState("");
  const [mentorTags, setMentorTags] = useState("");
  const [mentorMajor, setMentorMajor] = useState("");
  const [mentorGradYear, setMentorGradYear] = useState("");
  const [mentorLoading, setMentorLoading] = useState(true);

  useEffect(() => {
    if (!token) { setMentorLoading(false); return; }
    const loadMentorProfile = async () => {
      try {
        const profile = await apiFetch<Mentor | null>("/api/mentors/my-profile", { token });
        setMentorProfile(profile);
        if (profile) {
          setMentorTitle(profile.title || "");
          setMentorBio(profile.bio || "");
          setMentorTags((profile.tags || []).join(", "));
          setMentorMajor(profile.major || "");
          setMentorGradYear(profile.graduation_year ? String(profile.graduation_year) : "");
        }
      } finally {
        setMentorLoading(false);
      }
    };
    loadMentorProfile();
  }, [token]);

  const handleProfileSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PUT",
        token,
        body: { display_name: displayName || null, avatar_url: avatarUrl || null },
      });
      showToast(t("profile.saveSuccess"));
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!token || !oldPassword || !newPassword) return;
    try {
      await apiFetch("/api/users/me/password", {
        method: "PUT",
        token,
        body: { old_password: oldPassword, new_password: newPassword },
      });
      showToast(t("profile.passwordSuccess"));
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleMentorApply = async () => {
    if (!token) return;
    try {
      const payload = {
        title: mentorTitle || null,
        bio: mentorBio || null,
        tags: mentorTags.split(",").map((t) => t.trim()).filter(Boolean),
        major: mentorMajor || null,
        graduation_year: mentorGradYear ? parseInt(mentorGradYear, 10) : null,
      };
      const result = await apiFetch<Mentor>("/api/mentors/apply", {
        method: "POST", token, body: payload,
      });
      setMentorProfile(result);
      showToast(t("mentor.applySuccess"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleMentorProfileUpdate = async () => {
    if (!token) return;
    try {
      const payload = {
        title: mentorTitle || null,
        bio: mentorBio || null,
        tags: mentorTags.split(",").map((t) => t.trim()).filter(Boolean),
        major: mentorMajor || null,
        graduation_year: mentorGradYear ? parseInt(mentorGradYear, 10) : null,
      };
      const result = await apiFetch<Mentor>("/api/mentors/profile", {
        method: "PUT", token, body: payload,
      });
      setMentorProfile(result);
      showToast(t("mentor.profileUpdate"));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const mentorStatusBadge = () => {
    if (!mentorProfile?.status) return null;
    const colorMap: Record<string, string> = {
      approved: "success",
      pending: "warning",
      rejected: "failure",
    };
    const labelMap: Record<string, string> = {
      approved: t("mentor.statusApproved"),
      pending: t("mentor.statusPending"),
      rejected: t("mentor.statusRejected"),
    };
    return (
      <Badge color={colorMap[mentorProfile.status] || "gray"} className="w-max">
        {labelMap[mentorProfile.status] || mentorProfile.status}
      </Badge>
    );
  };

  const showMentorForm = !mentorProfile || mentorProfile.status === "rejected";
  const isMentorApproved = mentorProfile?.status === "approved";
  const isMentorPending = mentorProfile?.status === "pending";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile.title")}</h1>

      <Card>
        <div className="space-y-4">
          <div>
            <Label htmlFor="profileEmail">{t("login.email")}</Label>
            <TextInput id="profileEmail" value={user?.email || ""} disabled />
          </div>
          <div>
            <Label htmlFor="profileName">{t("profile.displayName")}</Label>
            <TextInput
              id="profileName"
              icon={HiUser}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="profileAvatar">{t("profile.avatarUrl")}</Label>
            <TextInput
              id="profileAvatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button onClick={handleProfileSave} disabled={saving}>
            {t("profile.save")}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("profile.changePassword")}</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="oldPass">{t("profile.oldPassword")}</Label>
            <TextInput
              id="oldPass"
              type="password"
              icon={HiLockClosed}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newPass">{t("profile.newPassword")}</Label>
            <TextInput
              id="newPass"
              type="password"
              icon={HiLockClosed}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button onClick={handlePasswordChange} disabled={!oldPassword || !newPassword}>
            {t("profile.changePassword")}
          </Button>
        </div>
      </Card>

      {/* ── Mentor Section ── */}
      {!mentorLoading && (
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <HiAcademicCap className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isMentorApproved ? t("mentor.editProfile") : t("mentor.applyTitle")}
            </h2>
            {mentorStatusBadge()}
          </div>

          {/* Pending state banner */}
          {isMentorPending && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{t("mentor.applyPending")}</p>
            </div>
          )}

          {/* Rejected state banner */}
          {mentorProfile?.status === "rejected" && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">{t("mentor.applyRejected")}</p>
            </div>
          )}

          {/* Mentor form (for new application, re-application, or profile edit) */}
          {(showMentorForm || isMentorApproved) && (
            <div className="space-y-4">
              <div>
                <Label>{t("mentor.roster")}</Label>
                <TextInput
                  value={mentorTitle}
                  onChange={(e) => setMentorTitle(e.target.value)}
                  placeholder={t("mentor.titlePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("mentor.major")}</Label>
                <TextInput
                  value={mentorMajor}
                  onChange={(e) => setMentorMajor(e.target.value)}
                  placeholder={t("mentor.majorPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("mentor.gradYear")}</Label>
                <TextInput
                  type="number"
                  value={mentorGradYear}
                  onChange={(e) => setMentorGradYear(e.target.value)}
                  placeholder={t("mentor.gradYearPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("mentor.questionDetails")}</Label>
                <Textarea
                  rows={3}
                  value={mentorBio}
                  onChange={(e) => setMentorBio(e.target.value)}
                  placeholder={t("mentor.bioPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("mentor.questionTags")}</Label>
                <TextInput
                  value={mentorTags}
                  onChange={(e) => setMentorTags(e.target.value)}
                  placeholder={t("mentor.tagsPlaceholder")}
                />
              </div>
              {isMentorApproved ? (
                <Button onClick={handleMentorProfileUpdate}>
                  {t("common.save")}
                </Button>
              ) : (
                <Button onClick={handleMentorApply} color="purple">
                  {mentorProfile?.status === "rejected" ? t("mentor.reapply") : t("mentor.applyBtn")}
                </Button>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default Profile;
