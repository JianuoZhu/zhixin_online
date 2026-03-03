import { Avatar, Dropdown, DropdownDivider, DropdownHeader, DropdownItem, Button } from "flowbite-react";
import { HiBell, HiMenu } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import ThemeSwitcher from "./ThemeSwitcher";

type AppHeaderProps = {
  onMenuToggle?: () => void;
};

function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { locale, toggleLocale, t } = useLocale();
  const navigate = useNavigate();
  const displayName = user?.display_name || user?.email || "User";
  const avatarUrl = user?.avatar_url || undefined;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
          onClick={onMenuToggle}
        >
          <HiMenu className="w-6 h-6" />
        </button>

        {/* Right-aligned controls */}
        <div className="flex items-center gap-2 ml-auto bg-white dark:bg-gray-800 shadow-sm rounded-lg px-3 py-1.5 border border-gray-100 dark:border-gray-700">
          <ThemeSwitcher />
          <Button size="xs" color="light" onClick={toggleLocale}>
            {locale === "zh" ? t("language.en") : t("language.zh")}
          </Button>
          <button
            type="button"
            className="relative p-2 text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
            onClick={() => navigate("/notifications")}
          >
            <HiBell className="w-5 h-5" />
          </button>
          <Dropdown arrowIcon={false} inline label={<Avatar alt="User settings" img={avatarUrl} rounded placeholderInitials={displayName.charAt(0)} size="sm" />}>
            <DropdownHeader>
              <span className="block text-sm font-semibold">{displayName}</span>
              <span className="block truncate text-sm text-gray-500">{user?.email}</span>
            </DropdownHeader>
            <DropdownItem onClick={() => navigate("/profile")}>{t("header.profile")}</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={handleLogout}>{t("header.logout")}</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
