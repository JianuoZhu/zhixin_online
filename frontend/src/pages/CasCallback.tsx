import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

type CasRegistrationPayload = {
  sid?: string | null;
  name?: string | null;
};

function parseRegistrationToken(token: string): CasRegistrationPayload {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as CasRegistrationPayload;
  } catch {
    return {};
  }
}

function CasCallback() {
  const { completeTokenLogin } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("正在完成 CAS 登录...");
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const registrationPayload = useMemo(
    () => (registrationToken ? parseRegistrationToken(registrationToken) : {}),
    [registrationToken]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fragmentParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("token") || fragmentParams.get("token");
    const casRegistrationToken = fragmentParams.get("cas_registration_token");
    const casError = params.get("cas_error");

    if (casError) {
      setMessage(casError);
      return;
    }

    if (casRegistrationToken) {
      const payload = parseRegistrationToken(casRegistrationToken);
      setRegistrationToken(casRegistrationToken);
      setDisplayName(payload.name || "");
      setMessage("CAS 认证已通过，但系统中还没有对应账号。");
      return;
    }

    if (!token) {
      setMessage("CAS 登录回调缺少 token，请重新登录。");
      return;
    }

    completeTokenLogin(token)
      .then(() => navigate("/", { replace: true }))
      .catch(() => setMessage("CAS 登录已通过，但系统会话创建失败，请联系管理员。"));
  }, [completeTokenLogin, navigate]);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registrationToken) return;

    setSubmitting(true);
    setMessage("");
    try {
      const response = await apiFetch<{ access_token: string }>("/api/auth/cas/register", {
        method: "POST",
        body: {
          registration_token: registrationToken,
          email,
          display_name: displayName,
        },
      });
      await completeTokenLogin(response.access_token);
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("账号创建失败，请稍后重试。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showRegistrationPrompt = registrationToken && !showForm;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <img src="/zhixin.png" alt="Zhixin" className="mx-auto mb-5 h-14 w-14 rounded-xl object-cover" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">CAS 登录</h1>

        {message && <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{message}</p>}

        {showRegistrationPrompt && (
          <div className="mt-5 space-y-4">
            {registrationPayload.sid && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                SUSTechID：{registrationPayload.sid}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              是否使用当前 CAS 身份创建致新线上系统账号？
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                暂不创建
              </button>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                创建账号
              </button>
            </div>
          </div>
        )}

        {registrationToken && showForm && (
          <form className="mt-5 space-y-4 text-left" onSubmit={handleRegister}>
            {registrationPayload.sid && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">SUSTechID</label>
                <input
                  value={registrationPayload.sid}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
            )}
            <div>
              <label htmlFor="cas-display-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                显示名
              </label>
              <input
                id="cas-display-name"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="cas-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                联系邮箱
              </label>
              <input
                id="cas-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "正在创建..." : "创建并登录"}
            </button>
          </form>
        )}

        {!registrationToken && message !== "正在完成 CAS 登录..." && (
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            返回登录页
          </button>
        )}
      </div>
    </div>
  );
}

export default CasCallback;
