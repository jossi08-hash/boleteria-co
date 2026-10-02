-- Parte C: reclamos del comprador ("Tengo un problema con mi boleta").
-- Un reclamo abierto congela la liberación automática del pago al vendedor hasta que el admin lo resuelva.
begin;

alter table public.ordenes add column if not exists reclamo_motivo text;
alter table public.ordenes add column if not exists reclamo_en timestamptz;
alter table public.ordenes add column if not exists reclamo_resuelto_en timestamptz;

-- El comprador reporta un problema dentro de las 72 horas, antes de que se libere el pago
create or replace function public.reportar_problema(p_orden uuid, p_motivo text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if length(trim(coalesce(p_motivo, ''))) < 10 then return false; end if;
  update public.ordenes
     set reclamo_motivo = left(trim(p_motivo), 1000), reclamo_en = now()
   where id = p_orden and comprador_id = auth.uid() and estado_pago = 'pagada'
     and liberado = false and reclamo_en is null
     and creado_en > (now() - interval '72 hours')::timestamp;
  return found;
end;
$$;

commit;
