export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;           // ISO date string "2025-04-12"
  time: string;           // "18:00"
  location: string;
  image_url: string | null;
  max_attendees: number | null;
  price_cents: number;    // 0 = free
  is_published: boolean;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  num_persons: number;
  remarks: string | null;
  created_at: string;
};

export type Donation = {
  id: string;
  name: string;
  email: string;
  amount_cents: number;
  message: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  type: "candy" | "wine";
  name: string;
  email: string;
  phone: string;
  items: Record<string, number>; // { "productName": quantity }
  pickup_event_id: string | null;
  status: "new" | "handled";
  created_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;           // "Atleet" | "Coach" | "Begeleider"
  discipline: string | null; // "Freestyle" | "Speed" | "Team"
  bio: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
};

export type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  level: "gold" | "silver" | "bronze" | "partner";
  sort_order: number;
  created_at: string;
};
