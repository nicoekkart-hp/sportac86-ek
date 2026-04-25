export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  image_url: string | null;
  is_published: boolean;
  show_on_steunen: boolean;
  icon: string;
  coming_soon: boolean;
  created_at: string;
};

export type EventSlot = {
  id: string;
  event_id: string;
  date: string;            // YYYY-MM-DD
  time: string | null;     // HH:MM:SS
  location: string | null;
  max_attendees: number | null;
  sort_order: number;
  created_at: string;
};

export type EventTicket = {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  sort_order: number;
  created_at: string;
};

export type GalleryPhoto = {
  id: string;
  image_url: string;
  alt: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  slot_id: string | null;
  name: string;
  email: string;
  num_persons: number;
  remarks: string | null;
  tickets: Record<string, number> | null;
  payment_reference: string | null;
  payment_status: "pending" | "paid" | "failed";
  last_reminder_at: string | null;
  reminder_count: number;
  created_at: string;
};

export type Donation = {
  id: string;
  name: string;
  email: string;
  amount_cents: number;
  message: string | null;
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
  pickup_slot_id: string | null;
  status: "new" | "handled";
  payment_reference: string | null;
  payment_status: "pending" | "paid" | "failed";
  last_reminder_at: string | null;
  reminder_count: number;
  contact_member_id: string | null;
  contact_member_name?: string;
  pickup_slot_label?: string;
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
  pack_group_id: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type PackGroup = {
  id: string;
  sale_id: string;
  name: string;
  unit_price_cents: number;
  pack_size: number;
  pack_price_cents: number;
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
