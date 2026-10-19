-- Telegram delivery: the morning collage arrives as a photo message with buttons.
alter table public.profiles
  add column telegram_chat_id bigint,
  add column telegram_link_code text unique,
  add column notify_telegram boolean not null default false;
