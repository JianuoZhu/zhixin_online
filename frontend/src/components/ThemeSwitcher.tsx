import { useContext } from "react";
import { HiCheck } from "react-icons/hi";
import { FaPalette } from "react-icons/fa";

import { ThemeContext, themes, type ThemeName } from "../context/ThemeContext";
import { useLocale } from "../context/LocaleContext";

const ThemeSwitcher = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const { t } = useLocale();

  const options: { name: ThemeName; label: string }[] = [
    { name: "blue", label: t("theme.blue") },
    { name: "green", label: t("theme.green") },
    { name: "orange", label: t("theme.orange") },
    { name: "rose", label: t("theme.rose") },
  ];

  return (
    <div className="relative group">
      <button
        type="button"
        className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition"
      >
        <FaPalette className="w-4 h-4" />
      </button>
      <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2">
        <p className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {t("theme.title")}
        </p>
        {options.map((option) => {
          const active = option.name === theme;
          const swatch = themes[option.name].swatch;
          return (
            <button
              key={option.name}
              type="button"
              onClick={() => setTheme(option.name)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-gray-100 dark:bg-gray-700 font-medium"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <div
                className="w-5 h-5 rounded-full shrink-0 ring-1 ring-black/10"
                style={{ backgroundColor: swatch }}
              />
              <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
              {active && <HiCheck className="w-4 h-4 shrink-0" style={{ color: swatch }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
