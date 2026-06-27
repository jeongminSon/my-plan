-- my-plan : todos 테이블 + RLS
-- 적용: Supabase 대시보드 → SQL Editor → 붙여넣기 → Run
-- (RLS는 테이블 생성 직후 반드시 활성화)

-- 1) todos 테이블 (앱의 Task 모델 반영)
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  memo        text,
  due_date    timestamptz,
  completed   boolean not null default false,
  sort_order  double precision not null default 0,
  list_id     uuid,
  priority    text check (priority in ('high','med','low')),
  repeat      text check (repeat in ('daily','weekly','monthly')),
  reminder_at timestamptz,
  subtasks    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz                 -- 소프트 삭제(동기화 톰스톤)
);

create index if not exists todos_user_idx on public.todos(user_id);
create index if not exists todos_user_updated_idx on public.todos(user_id, updated_at);

-- 2) RLS 활성화 (필수)
alter table public.todos enable row level security;

-- 3) 정책: 본인 user_id 행만 CRUD
drop policy if exists todos_select_own on public.todos;
drop policy if exists todos_insert_own on public.todos;
drop policy if exists todos_update_own on public.todos;
drop policy if exists todos_delete_own on public.todos;

create policy todos_select_own on public.todos
  for select using (auth.uid() = user_id);
create policy todos_insert_own on public.todos
  for insert with check (auth.uid() = user_id);
create policy todos_update_own on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy todos_delete_own on public.todos
  for delete using (auth.uid() = user_id);

-- 4) updated_at 자동 갱신 (충돌해결 LWW에 유용)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();
