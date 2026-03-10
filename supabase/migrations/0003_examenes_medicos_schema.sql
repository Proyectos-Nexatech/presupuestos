-- Table: examenes_medicos
create table public.examenes_medicos (
  id uuid default uuid_generate_v4() primary key,
  tipo_examen text not null,
  frecuencia text, -- Ej: Ingreso-Retiro, Ingreso, Ingreso-Periodico
  num_examenes_periodo decimal(5,2) default 0,
  valor_unitario decimal(15,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  actualizado_por uuid references auth.users
);

-- Enable RLS
alter table public.examenes_medicos enable row level security;

-- Policies
create policy "Examenes medicos are viewable by everyone" on examenes_medicos for select using (true);
create policy "Examenes medicos are editable by super_admin or rrhh_siso" on examenes_medicos
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and role in ('super_admin', 'rrhh_siso')
    )
  );
