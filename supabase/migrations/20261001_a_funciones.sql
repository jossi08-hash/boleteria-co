-- Parte A: solo agrega (funciones y columnas). Se puede aplicar antes de publicar la app nueva.
begin;

-- ¿El usuario actual es admin? (security definer: lee usuarios sin depender de sus permisos)
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select es_admin from public.usuarios where id = auth.uid()), false)
$$;

alter table public.ordenes add column if not exists archivo_url text;
alter table public.boletas add column if not exists reservada_por uuid references auth.users(id) on delete set null;

-- Registro: guardar también el documento y los datos de pago enviados al crear la cuenta
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (id, nombre, correo, documento, datos_pago)
  values (new.id, new.raw_user_meta_data->>'nombre', new.email,
          nullif(trim(new.raw_user_meta_data->>'documento'), ''),
          nullif(trim(new.raw_user_meta_data->>'datos_pago'), ''));
  return new;
end;
$$;

-- Para el formulario de registro, sin exponer la tabla de usuarios
create or replace function public.documento_registrado(p_documento text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios where documento = trim(p_documento))
$$;

-- Reserva todas las boletas (o ninguna) por 15 minutos para el usuario actual
create or replace function public.reservar_boletas(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'sin_sesion'; end if;
  update public.boletas
     set estado = 'reservada', reservada_hasta = now() + interval '15 minutes', reservada_por = auth.uid()
   where id = any(p_ids)
     and (estado = 'publicada'
          or (estado = 'reservada' and (reservada_hasta < now() or reservada_por = auth.uid())));
  get diagnostics n = row_count;
  if n <> cardinality(p_ids) then raise exception 'no_disponible'; end if;
end;
$$;

-- Devuelve a la venta las boletas que reservó el usuario actual
create or replace function public.liberar_reservas(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update public.boletas set estado = 'publicada', reservada_hasta = null, reservada_por = null
   where id = any(p_ids) and estado = 'reservada' and reservada_por = auth.uid()
$$;

-- El comprador confirma que recibió la boleta (libera el pago al vendedor)
create or replace function public.confirmar_recibo(p_orden uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.ordenes set liberado = true, liberado_en = now()
   where id = p_orden and comprador_id = auth.uid() and estado_pago = 'pagada' and liberado = false;
  return found;
end;
$$;

-- El vendedor (o el admin) registra el archivo de la boleta entregada
create or replace function public.registrar_entrega(p_orden uuid, p_url text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_url not like 'https://ssyelddmusabkxwijghn.supabase.co/storage/v1/object/public/boletas-entregadas/' || p_orden::text || '/%' then
    return false;
  end if;
  update public.ordenes o set archivo_url = p_url
    from public.boletas b
   where o.id = p_orden and b.id = o.boleta_id and o.estado_pago = 'pagada'
     and (b.vendedor_id = auth.uid() or public.es_admin());
  return found;
end;
$$;

commit;
