-- Вставьте в Supabase → SQL Editor → Run
-- (можно запускать повторно)

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

create policy "insert scores"
  on scores for insert
  with check (
    char_length(trim(nick)) between 2 and 16
    and correct = 10
    and timed_out is not true
    and level between 1 and 5
    and (mode is null or mode in ('basic','chain'))
  );

-- Убрать старые неидеальные результаты из топа (по желанию)
-- delete from scores where correct < 10 or timed_out is true;
