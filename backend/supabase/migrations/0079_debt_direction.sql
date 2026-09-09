-- PALVIN — Debt tracker: track debts in both directions.
-- Previously the only shape was "someone owes you" (debtor_name is who
-- owes you). Adds a direction so a partner can also log "you owe someone"
-- — debtor_name then holds who YOU owe instead. Existing rows default to
-- 'they_owe' so nothing already logged changes meaning.

alter table debts add column direction text not null default 'they_owe'
  check (direction in ('they_owe', 'i_owe'));

notify pgrst, 'reload schema';
