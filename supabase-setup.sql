-- Вставьте в Supabase → SQL Editor → Run

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

alter table scores enable row level security;

drop policy if exists "read scores" on scores;
drop policy if exists "insert scores" on scores;

create policy "read scores"
  on scores for select
  using (true);

create policy "insert scores"
  on scores for insert
  with check (
    char_length(trim(nick)) between 2 and 16
    and correct between 0 and 10
    and level between 1 and 5
  );
