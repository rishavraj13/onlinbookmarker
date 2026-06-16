-- Create folders table
create table public.folders (
id uuid default gen_random_uuid() primary key,
user_id uuid references auth.users(id) not null,
name text not null,
created_at timestamptz default now() not null
);

-- Create bookmarks table
create table public.bookmarks (
id uuid default gen_random_uuid() primary key,
user_id uuid references auth.users(id) not null,
folder_id uuid references public.folders(id) on delete cascade not null,
title text not null,
content text not null,
tags text[] default '{}',
created_at timestamptz default now() not null,
updated_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.folders enable row level security;
alter table public.bookmarks enable row level security;

-- Folder Policies
create policy "Users can view own folders"
on public.folders
for select
using (auth.uid() = user_id);

create policy "Users can insert own folders"
on public.folders
for insert
with check (auth.uid() = user_id);

create policy "Users can update own folders"
on public.folders
for update
using (auth.uid() = user_id);

create policy "Users can delete own folders"
on public.folders
for delete
using (auth.uid() = user_id);

-- Bookmark Policies
create policy "Users can view own bookmarks"
on public.bookmarks
for select
using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
on public.bookmarks
for insert
with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
on public.bookmarks
for update
using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
on public.bookmarks
for delete
using (auth.uid() = user_id);
