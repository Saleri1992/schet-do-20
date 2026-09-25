-- Вставьте в Supabase → SQL Editor → Run
-- (можно запускать повторно)
-- Обновляет политику топа под новые режимы и уровни.

create table if not exists scores (
  id bigserial primary key,
  nick text not null,
  level int not null,
  correct int not null,
  ms int not null,
  grade int,
  timed_out boolean default false,
  created_at timestamptz default now()
);

alter table scores add column if not exists skin text;
alter table scores add column if not exists hat text;
alter table scores add column if not exists mode text;

alter table scores enable row level security;

drop policy if exists "read scores" on scores;
drop policy if exists "insert scores" on scores;

create policy "read scores"
  on scores for select
  using (true);

-- Топ: только идеальные 10/10 без таймаута.
-- Уровни 1–9 (лестницы + секрет + бои), режимы всех академий.
create policy "insert scores"
  on scores for insert
  with check (
    char_length(trim(nick)) between 2 and 16
    and correct = 10
    and timed_out is not true
    and level between 1 and 9
    and (
      mode is null
      or mode in (
        'basic',
        'chain',
        'units',
        'mul',
        'div',
        'eng',
        'code'
      )
    )
  );

-- Убрать старые неидеальные результаты из топа (по желанию)
-- delete from scores where correct < 10 or timed_out is true;

-- ============================================================
-- OPS / story / rig — личный облачный сейв (ник = ключ сейва)
-- Вставьте этот блок в SQL Editor и Run.
-- ============================================================

create table if not exists ops_saves (
  nick text primary key,
  story jsonb not null default '{}'::jsonb,
  drill jsonb not null default '{}'::jsonb,
  unlocked boolean default false,
  updated_at timestamptz default now()
);

alter table ops_saves enable row level security;

drop policy if exists "read ops_saves" on ops_saves;
drop policy if exists "insert ops_saves" on ops_saves;
drop policy if exists "update ops_saves" on ops_saves;

create policy "read ops_saves"
  on ops_saves for select
  using (true);

create policy "insert ops_saves"
  on ops_saves for insert
  with check (
    char_length(trim(nick)) between 3 and 32
  );

create policy "update ops_saves"
  on ops_saves for update
  using (char_length(trim(nick)) between 3 and 32)
  with check (char_length(trim(nick)) between 3 and 32);
