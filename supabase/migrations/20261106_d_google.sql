-- Entrar con Google: Google manda el nombre como full_name / name (no como "nombre").
-- El documento y el dato de pago quedan vacíos y se piden antes de la primera venta.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuarios (id, nombre, correo, documento, datos_pago)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
                   nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
                   nullif(trim(new.raw_user_meta_data->>'name'), ''),
                   split_part(new.email, '@', 1)),
          new.email,
          nullif(trim(new.raw_user_meta_data->>'documento'), ''),
          nullif(trim(new.raw_user_meta_data->>'datos_pago'), ''));
  return new;
end;
$$;
