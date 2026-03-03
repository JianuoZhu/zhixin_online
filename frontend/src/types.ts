// ── Shared Type Definitions ──────────────────────────────────────────

export type UserInfo = {
  id: number;
  email: string;
  role: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type UserAdmin = UserInfo & {
  created_at?: string | null;
};

export type EventItem = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  category: string;
  status: string;
  spots_left: number;
  total_spots: number;
  image_url?: string | null;
  description?: string | null;
  group_id?: string | null;
  registered?: boolean;
  checked_in?: boolean;
  can_check_in?: boolean;
};

export type CheckinItem = {
  id: number;
  event_id: number;
  user_id: number;
  event_title: string;
  user_email?: string | null;
  user_name?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

export type Registration = {
  id: number;
  event_id: number;
  user_id: number;
  event_title: string;
  user_email: string;
  user_name?: string | null;
  created_at?: string | null;
};

export type RoomBookingItem = {
  id: number;
  room_id: number;
  user_id: number;
  date: string;
  start_hour: number;
  end_hour: number;
  participants: number;
  reason?: string | null;
  user_name?: string | null;
};

export type RoomItem = {
  id: number;
  name: string;
  capacity: number;
  equipment: string[];
  bookings: RoomBookingItem[];
};

export type AnnouncementItem = {
  id: number;
  title: string;
  category: string;
  author: string;
  date: string;
  content: string;
  read: boolean;
};

export type Mentor = {
  id: number;
  display_name: string;
  avatar_url?: string | null;
  title?: string | null;
  bio?: string | null;
  tags?: string[] | null;
};

export type Answer = {
  id: number;
  question_id: number;
  author_id: number;
  author_name: string;
  is_best: boolean;
  votes: number;
  voted: boolean;
  content: string;
  created_at?: string | null;
};

export type Question = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  is_anonymous: boolean;
  asker_id: number;
  asker_name: string;
  views: number;
  mentors: Mentor[];
  answers: Answer[];
  created_at?: string | null;
};

export type CalendarItemType = {
  id: number;
  user_id: number;
  title: string;
  date: string;
  color: string;
  source: string;
};
