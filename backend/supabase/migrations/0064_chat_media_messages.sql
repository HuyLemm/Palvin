-- PALVIN — Chat: photo, camera, and voice messages, plus a quick heart send.
-- `text` becomes optional since a pure image/audio message carries no text.

alter table chat_messages alter column text drop not null;
alter table chat_messages add column if not exists image_url text;
alter table chat_messages add column if not exists audio_url text;
alter table chat_messages add column if not exists audio_duration integer;

notify pgrst, 'reload schema';
