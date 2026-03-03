import { NavLink } from "react-router-dom";
import { Sidebar, SidebarItemGroup } from "flowbite-react";
import {
  HiChartPie,
  HiCalendar,
  HiViewBoards,
  HiAnnotation,
  HiQuestionMarkCircle,
  HiOfficeBuilding,
  HiShieldCheck,
} from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";

type SidebarNavProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

function SidebarNav({ mobileOpen, onClose }: SidebarNavProps) {
  const { user } = useAuth();
  const { t } = useLocale();

  const navItems = [
    { to: "/", label: t("nav.dashboard"), icon: HiChartPie },
    { to: "/events", label: t("nav.events"), icon: HiViewBoards },
    { to: "/booking", label: t("nav.booking"), icon: HiOfficeBuilding },
    { to: "/announcements", label: t("nav.announcements"), icon: HiAnnotation },
    { to: "/mentors", label: t("nav.mentors"), icon: HiQuestionMarkCircle },
    { to: "/calendar", label: t("nav.calendar"), icon: HiCalendar },
  ];

  if (user?.role === "admin") {
    navItems.push({ to: "/admin", label: t("nav.admin"), icon: HiShieldCheck });
  }

  const linkClassName = (active: boolean) =>
    [
      "flex items-center gap-4 px-4 h-14 rounded-lg transition-colors border-l-4",
      active 
        ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-gray-700 dark:border-primary-500 font-semibold" 
        : "border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
    ].join(" ");

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 px-3 pt-2">
        <img src="/zhixin.png" alt="Zhixin" className="w-8 h-8 rounded-lg object-cover" />
        <span className="text-xl font-semibold text-gray-800 dark:text-white">{t("app.name")}</span>
      </div>
      <div className="flex-1 flex items-center justify-center -mt-16">
        <SidebarItemGroup className="w-full space-y-3 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => linkClassName(isActive)}
                onClick={onClose}
              >
                <item.icon className="h-6 w-6 shrink-0" />
                <span className="text-base">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </SidebarItemGroup>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <Sidebar aria-label="Sidebar with logo" className="h-full hidden md:block">
        {sidebarContent}
      </Sidebar>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
          <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 z-50 md:hidden shadow-xl p-4 overflow-y-auto">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}

export default SidebarNav;
