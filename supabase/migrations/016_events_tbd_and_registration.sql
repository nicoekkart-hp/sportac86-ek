alter table events alter column date drop not null;
alter table events alter column time drop not null;
alter table events add column registration_enabled boolean not null default true;
