-- Table: mano_obra
create table public.mano_obra (
  id uuid default uuid_generate_v4() primary key,
  perfil text not null,
  intensidad text check (intensidad in ('8H', '12H', '15H', '24H')) not null,
  costo_base_dia decimal(15,2) not null,
  certificaciones_vencidas integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  actualizado_por uuid references auth.users
);

-- Enable RLS
alter table public.mano_obra enable row level security;

-- Policies
create policy "Mano de obra is viewable by everyone" on mano_obra for select using (true);
create policy "Mano de obra is editable by super_admin or rrhh_siso" on mano_obra
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and role in ('super_admin', 'rrhh_siso')
    )
  );

-- Trigger for audit (reusing audit_log_changes if it exists or create one)
create trigger tr_audit_mano_obra
after update on mano_obra
for each row execute function audit_log_changes();
