alter table events drop column registration_enabled;
alter table events add column coming_soon boolean not null default false;
