create table if not exists public.parking_system (
  id integer primary key,
  car_count integer not null default 0,
  gate_status text not null default 'closed',
  updated_at timestamptz not null default now()
);

insert into public.parking_system (id, car_count, gate_status)
values (1, 0, 'closed')
on conflict (id) do nothing;

alter table public.parking_system enable row level security;

create policy "Allow public read parking system"
on public.parking_system
for select
to anon, authenticated
using (true);

create policy "Allow authenticated update parking system"
on public.parking_system
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated insert parking system"
on public.parking_system
for insert
to authenticated
with check (true);
