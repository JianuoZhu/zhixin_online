import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  ListGroup,
  ListGroupItem,
  Badge,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Label,
  TextInput,
  Textarea,
} from "flowbite-react";
import { HiUser, HiUsers, HiTrash } from "react-icons/hi";

import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import type { RoomItem, RoomBookingItem } from "../types";

function RoomBooking() {
  const { token } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [participants, setParticipants] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [myBookings, setMyBookings] = useState<RoomBookingItem[]>([]);
  const [cancelBooking, setCancelBooking] = useState<{ roomId: number; bookingId: number } | null>(null);

  const timeSlots = useMemo(() => Array.from({ length: 14 }, (_, i) => i + 8), []);

  const loadData = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [roomsData, bookingsData] = await Promise.all([
        apiFetch<RoomItem[]>(`/api/rooms?date=${selectedDate}`, { token }),
        apiFetch<RoomBookingItem[]>("/api/rooms/bookings/mine", { token }),
      ]);
      setRooms(roomsData);
      setMyBookings(bookingsData);
      if (roomsData.length > 0 && !selectedRoom) {
        setSelectedRoom(roomsData[0]);
      } else if (selectedRoom) {
        const updated = roomsData.find((room) => room.id === selectedRoom.id);
        setSelectedRoom(updated || roomsData[0] || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [token, selectedDate]);

  const isBooked = (hour: number) => {
    if (!selectedRoom) return null;
    return selectedRoom.bookings.find((booking) => hour >= booking.start_hour && hour < booking.end_hour);
  };

  const handleSlotClick = (hour: number) => {
    if (isBooked(hour)) return;
    setSelectedSlot(hour);
    setOpenModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedRoom || selectedSlot === null || !token) return;
    try {
      await apiFetch(`/api/rooms/${selectedRoom.id}/bookings`, {
        method: "POST",
        token,
        body: {
          date: selectedDate,
          start_hour: selectedSlot,
          end_hour: selectedSlot + 1,
          participants,
          reason,
        },
      });
      setOpenModal(false);
      setParticipants(1);
      setReason("");
      showToast(t("room.bookingSuccess"));
      await loadData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBooking || !token) return;
    try {
      await apiFetch(`/api/rooms/${cancelBooking.roomId}/bookings/${cancelBooking.bookingId}`, {
        method: "DELETE",
        token,
      });
      setCancelBooking(null);
      showToast(t("room.cancelSuccess"));
      await loadData();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t("common.error"), "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6" style={{ minHeight: "calc(100vh - 220px)" }}>
        {/* Room list */}
        <div className="lg:w-64 shrink-0">
          <Card>
            <h5 className="text-lg font-bold text-gray-900 dark:text-white">{t("room.select")}</h5>
            <ListGroup>
              {rooms.map((room) => (
                <ListGroupItem
                  key={room.id}
                  active={selectedRoom?.id === room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{room.name}</span>
                    <span className="text-sm text-gray-500">{t("room.capacity")}: {room.capacity}</span>
                  </div>
                </ListGroupItem>
              ))}
            </ListGroup>
            {!loading && rooms.length === 0 && <p className="text-sm text-gray-500 mt-3">{t("room.noRooms")}</p>}
          </Card>
        </div>

        {/* Time slots */}
        <div className="flex-1">
          <Card className="h-full overflow-y-auto">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h5 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedRoom ? `${selectedRoom.name} - ${t("room.bookingTitle")}` : t("room.bookingTitle")}
              </h5>
              <div className="w-56">
                <Label htmlFor="booking-date">{t("room.date")}</Label>
                <TextInput
                  id="booking-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 gap-1 mt-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1 mt-4">
                {timeSlots.map((hour) => {
                  const booking = isBooked(hour);
                  return (
                    <div
                      key={hour}
                      className={`p-3 border-l-4 rounded-r-md flex items-center justify-between transition-colors ${
                        booking
                          ? "bg-red-50 dark:bg-red-900/20 border-red-400"
                          : "bg-green-50 dark:bg-green-900/20 border-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer"
                      }`}
                      onClick={() => handleSlotClick(hour)}
                    >
                      <span className="font-mono text-gray-700 dark:text-gray-300">{`${hour}:00 - ${hour + 1}:00`}</span>
                      {booking ? (
                        <Badge color="failure" icon={HiUser}>{booking.user_name || t("room.booked")}</Badge>
                      ) : (
                        <Badge color="success">{t("room.available")}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* My bookings */}
      {myBookings.length > 0 && (
        <Card>
          <h5 className="text-lg font-bold text-gray-900 dark:text-white">{t("room.myBookings")}</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">{t("room.date")}</th>
                  <th className="px-4 py-2">{t("room.time")}</th>
                  <th className="px-4 py-2">{t("room.reason")}</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {myBookings.map((b) => (
                  <tr key={b.id} className="border-b dark:border-gray-700">
                    <td className="px-4 py-2">{b.date}</td>
                    <td className="px-4 py-2">{b.start_hour}:00 - {b.end_hour}:00</td>
                    <td className="px-4 py-2">{b.reason || "-"}</td>
                    <td className="px-4 py-2">
                      <Button size="xs" color="failure" onClick={() => setCancelBooking({ roomId: b.room_id, bookingId: b.id })}>
                        <HiTrash className="w-3 h-3 mr-1" />
                        {t("room.cancelBooking")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Booking modal */}
      <Modal show={openModal} onClose={() => setOpenModal(false)}>
        <ModalHeader>{t("room.confirmTitle")}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label>{t("room.select")}</Label>
              <TextInput value={selectedRoom?.name || ""} disabled />
            </div>
            <div>
              <Label>{t("room.time")}</Label>
              <TextInput value={selectedSlot !== null ? `${selectedDate} ${selectedSlot}:00 - ${selectedSlot + 1}:00` : ""} disabled />
            </div>
            <div>
              <Label htmlFor="participants">{t("room.participants")}</Label>
              <TextInput
                id="participants"
                type="number"
                icon={HiUsers}
                min={1}
                value={participants}
                onChange={(event) => setParticipants(Number(event.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">{t("room.reason")}</Label>
              <Textarea
                id="reason"
                placeholder={t("room.reasonPlaceholder")}
                required
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handleConfirmBooking}>{t("room.confirm")}</Button>
          <Button color="gray" onClick={() => setOpenModal(false)}>{t("room.cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Cancel booking confirm */}
      <ConfirmModal
        show={!!cancelBooking}
        title={t("room.cancelBooking")}
        message={t("room.cancelConfirm")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        danger
        onConfirm={handleCancelBooking}
        onCancel={() => setCancelBooking(null)}
      />
    </div>
  );
}

export default RoomBooking;
