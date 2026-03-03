import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppHeader from "./components/AppHeader";
import SidebarNav from "./components/SidebarNav";
import { useAuth } from "./context/AuthContext";

import Admin from "./pages/Admin";
import Announcements from "./pages/Announcements";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Login from "./pages/Login";
import MentorTreeHole from "./pages/MentorTreeHole";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import RoomBooking from "./pages/RoomBooking";
import UserCalendar from "./pages/UserCalendar";

function ProtectedLayout() {
  const { token } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-page-bg, #f9fafb)" }}>
      <SidebarNav mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader onMenuToggle={() => setMobileOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/booking" element={<RoomBooking />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/mentors" element={<MentorTreeHole />} />
            <Route path="/calendar" element={<UserCalendar />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default App;
