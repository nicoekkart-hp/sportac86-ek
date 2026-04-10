export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string | null;
  max_attendees: number | null;
  price_cents: number;
  is_published: boolean;
  show_on_steunen: boolean;
  icon: string;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  num_persons: number;
  remarks: string | null;
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
};

export type Donation = {
  id: string;
  name: string;
  email: string;
  amount_cents: number;
  message: string | null;
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  created_at: string;
};

export type Order = {
  id: string;
  sale_id: string | null;
  sale_name?: string;
  name: string;
  email: string;
  phone: string;
  items: Record<string, number>;
  pickup_event_id: string | null;
  status: "new" | "handled";
  stripe_session_id: string | null;
  payment_status: "pending" | "paid" | "failed";
  contact_member_id: string | null;
  contact_member_name?: string;
  is_delivered: boolean;
  created_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  discipline: string[] | null;
  bio: {
    age?: string;
    why?: string;
    favorite_discipline?: string;
    years?: string;
  } | null;
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

export type Product = {
  id: string;
  sale_id: string;
  sale_name?: string;
  name: string;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type Sale = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_active: boolean;
  coming_soon: boolean;
  sort_order: number;
  created_at: string;
};
