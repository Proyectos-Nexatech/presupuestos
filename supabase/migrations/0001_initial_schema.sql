-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: user_profiles
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('super_admin', 'dir_compras', 'rrhh_siso', 'analista_costos')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: insumos
create table public.insumos (
  id uuid default uuid_generate_v4() primary key,
  descripcion text not null,
  unidad text not null,
  precio_base decimal(15,2) not null,
  categoria text check (categoria in ('Materiales', 'Herramientas', 'Equipos', 'Transporte', 'Seguros', 'Otros')),
  fecha_actualizacion timestamp with time zone default timezone('utc'::text, now()) not null,
  actualizado_por uuid references auth.users
);

-- Table: audit_logs
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  tabla text not null,
  registro_id uuid not null,
  campo text not null,
  valor_anterior text,
  valor_nuevo text,
  usuario_id uuid references auth.users,
  fecha timestamp with time zone default timezone('utc'::text, now()) not null,
  ip_address text
);

-- Add Audit Logging function
create or replace function audit_log_changes()
returns trigger as $$
begin
  if (tg_op = 'UPDATE') then
    if (new.precio_base <> old.precio_base) then
      insert into audit_logs (tabla, registro_id, campo, valor_anterior, valor_nuevo, usuario_id)
      values (tg_table_name, new.id, 'precio_base', old.precio_base::text, new.precio_base::text, auth.uid());
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for insumos
create trigger tr_audit_insumos
after update on insumos
for each row execute function audit_log_changes();

-- Enable RLS
alter table user_profiles enable row level security;
alter table insumos enable row level security;
alter table audit_logs enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone" on user_profiles for select using (true);
create policy "Insumos are viewable by everyone" on insumos for select using (true);
create policy "Insumos are editable by dir_compras or super_admin" on insumos
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and role in ('super_admin', 'dir_compras')
    )
  );
