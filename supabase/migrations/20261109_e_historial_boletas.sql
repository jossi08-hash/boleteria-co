-- Historial de boletas: quién publicó, editó, cambió de estado o eliminó cada boleta.
-- Guarda una copia completa de la boleta, así una eliminada se puede revisar después.
-- Además, una misma silla numerada no se puede publicar dos veces en el mismo evento.

create table if not exists public.historial_boletas (
  id bigint generated always as identity primary key,
  boleta_id uuid not null,
  accion text not null check (accion in ('creada', 'editada', 'eliminada')),
  hecho_por uuid,            -- quién lo hizo (null = sistema: hoja del socio, pagos)
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists historial_boletas_boleta on public.historial_boletas (boleta_id);
create index if not exists historial_boletas_fecha on public.historial_boletas (creado_en desc);

alter table public.historial_boletas enable row level security;
drop policy if exists "Admin ve el historial" on public.historial_boletas;
create policy "Admin ve el historial" on public.historial_boletas for select using (public.es_admin());
revoke insert, update, delete on public.historial_boletas from anon, authenticated;

create or replace function public.registrar_historial_boleta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into historial_boletas (boleta_id, accion, hecho_por, despues) values (new.id, 'creada', auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    -- Solo cambios que importan (no cada vez que se renueva una reserva)
    if (old.evento_id, old.vendedor_id, old.tribuna, old.fila, old.silla, old.precio, old.estado, old.plataforma)
       is distinct from (new.evento_id, new.vendedor_id, new.tribuna, new.fila, new.silla, new.precio, new.estado, new.plataforma) then
      insert into historial_boletas (boleta_id, accion, hecho_por, antes, despues) values (new.id, 'editada', auth.uid(), to_jsonb(old), to_jsonb(new));
    end if;
    return new;
  else
    insert into historial_boletas (boleta_id, accion, hecho_por, antes) values (old.id, 'eliminada', auth.uid(), to_jsonb(old));
    return old;
  end if;
end;
$$;

drop trigger if exists historial_boletas on public.boletas;
create trigger historial_boletas after insert or update or delete on public.boletas
  for each row execute function public.registrar_historial_boleta();

-- Una silla numerada activa por evento (las "No Numerada" no cuentan)
create unique index if not exists boletas_silla_unica on public.boletas
  (evento_id, lower(trim(tribuna)), lower(trim(coalesce(fila, ''))), lower(trim(silla)))
  where estado in ('verificando', 'publicada', 'reservada', 'oculta')
    and lower(trim(coalesce(silla, ''))) not in ('', 'no numerada', 'n/a', 'na', '-');
