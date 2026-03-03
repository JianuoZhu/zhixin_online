import { useState } from "react";
import { Button, Card, Label, TextInput } from "flowbite-react";
import { HiUser, HiLockClosed } from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";

function Profile() {
  const { user, token, refresh } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

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
    </div>
  );
}

export default Profile;
