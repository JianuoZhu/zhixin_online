import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "flowbite-react";
import { HiMail, HiLockClosed } from "react-icons/hi";

import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";

const Login = () => {
  const { login } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t("login.error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-purple-200/40 to-pink-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/zhixin.png" alt="Zhixin" className="w-20 h-20 rounded-2xl shadow-lg mb-6 mx-auto object-cover" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("login.title")}</h1>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-gray-700/50 p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email" className="mb-2 block text-sm font-medium">{t("login.email")}</Label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <div className="flex items-center bg-gray-100 px-3.5 border-r border-gray-300">
                  <HiMail className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="flex-1 bg-transparent border-0 px-4 py-3 text-base outline-none focus:ring-0 w-full"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="mb-2 block text-sm font-medium">{t("login.password")}</Label>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <div className="flex items-center bg-gray-100 px-3.5 border-r border-gray-300">
                  <HiLockClosed className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="flex-1 bg-transparent border-0 px-4 py-3 text-base outline-none focus:ring-0 w-full"
                />
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: "#2563eb", color: "#ffffff", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontWeight: 500 }}
              className="w-full text-base transition-colors border border-transparent shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t("login.submitting") : t("login.submit")}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          © 2026 致新书院 · Zhixin College
        </p>
      </div>
    </div>
  );
};

export default Login;
