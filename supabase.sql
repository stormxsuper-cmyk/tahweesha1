-- تحويشتي database setup
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.saving_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_amount integer not null check (target_amount >= 20),
  created_at timestamptz not null default now()
);

create table if not exists public.saving_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.saving_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  denomination integer not null check (denomination in (20,50,100,200,250)),
  position integer not null,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists saving_plans_user_id_idx on public.saving_plans(user_id);
create index if not exists saving_items_plan_id_idx on public.saving_items(plan_id);

alter table public.saving_plans enable row level security;
alter table public.saving_items enable row level security;

-- Users can only see/change their own plans.
drop policy if exists "plans_select_own" on public.saving_plans;
create policy "plans_select_own" on public.saving_plans for select using (auth.uid() = user_id);

drop policy if exists "plans_insert_own" on public.saving_plans;
create policy "plans_insert_own" on public.saving_plans for insert with check (auth.uid() = user_id);

drop policy if exists "plans_delete_own" on public.saving_plans;
create policy "plans_delete_own" on public.saving_plans for delete using (auth.uid() = user_id);

drop policy if exists "items_select_own" on public.saving_items;
create policy "items_select_own" on public.saving_items for select using (auth.uid() = user_id);

drop policy if exists "items_insert_own" on public.saving_items;
create policy "items_insert_own" on public.saving_items for insert with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on public.saving_items;
create policy "items_update_own" on public.saving_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "items_delete_own" on public.saving_items;
create policy "items_delete_own" on public.saving_items for delete using (auth.uid() = user_id);
