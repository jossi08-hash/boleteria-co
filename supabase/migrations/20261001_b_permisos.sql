-- Parte B: cierra los permisos. Aplicar DESPUÉS de publicar la app que usa las funciones de la parte A.
begin;

-- USUARIOS: cada quien ve y edita su perfil; el admin ve todos. Nadie puede cambiarse es_admin.
drop policy if exists "Cualquiera puede ver usuarios" on public.usuarios;
drop policy if exists "Cualquiera puede registrarse" on public.usuarios;
drop policy if exists "Usuarios ven su propio perfil" on public.usuarios;
create policy "Usuario ve su perfil y admin ve todos" on public.usuarios
  for select using (id = auth.uid() or public.es_admin());
create policy "Usuario edita su perfil" on public.usuarios
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.usuarios from anon, authenticated;
grant update (nombre, documento, telefono, datos_pago) on public.usuarios to authenticated;

-- BOLETAS: el vendedor publica (queda en revisión) y retira las suyas; el admin gestiona todo.
-- Reservar y liberar se hace con reservar_boletas / liberar_reservas.
drop policy if exists "Admin puede actualizar boletas" on public.boletas;
drop policy if exists "Admin puede eliminar boletas" on public.boletas;
drop policy if exists "Cualquiera puede publicar una boleta" on public.boletas;
create policy "Vendedor publica boletas para revisión" on public.boletas
  for insert to authenticated
  with check (vendedor_id = auth.uid() and estado = 'verificando' and publicada_por_admin = false and reservada_por is null);
create policy "Vendedor retira sus boletas" on public.boletas
  for delete to authenticated
  using (vendedor_id = auth.uid() and estado in ('verificando', 'publicada', 'oculta'));
create policy "Admin gestiona boletas" on public.boletas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ÓRDENES: el comprador solo crea órdenes pendientes; pagar/liberar lo hacen el servidor y las funciones.
drop policy if exists "Cualquiera puede crear una orden" on public.ordenes;
create policy "Comprador crea órdenes pendientes" on public.ordenes
  for insert to authenticated
  with check (comprador_id = auth.uid() and estado_pago = 'pendiente' and liberado = false
              and pago_vendedor_enviado = false and archivo_url is null);
create policy "Admin actualiza órdenes" on public.ordenes
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- EVENTOS Y ESTADIOS: solo el admin escribe.
drop policy if exists "Admin puede crear eventos" on public.eventos;
create policy "Admin crea eventos" on public.eventos
  for insert to authenticated with check (public.es_admin());
drop policy if exists "escribir_estadios" on public.estadios;
create policy "Admin gestiona estadios" on public.estadios
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ARCHIVOS DE ENTREGA: solo el vendedor de la orden o el admin pueden subirlos.
drop policy if exists "Vendedor o admin sube entrega" on storage.objects;
drop policy if exists "Vendedor o admin reemplaza entrega" on storage.objects;
drop policy if exists "Vendedor o admin ve entrega" on storage.objects;
create policy "Vendedor o admin sube entrega" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'boletas-entregadas' and exists (
    select 1 from public.ordenes o join public.boletas b on b.id = o.boleta_id
     where o.id::text = (storage.foldername(name))[1] and (b.vendedor_id = auth.uid() or public.es_admin())));
create policy "Vendedor o admin reemplaza entrega" on storage.objects
  for update to authenticated
  using (bucket_id = 'boletas-entregadas' and exists (
    select 1 from public.ordenes o join public.boletas b on b.id = o.boleta_id
     where o.id::text = (storage.foldername(name))[1] and (b.vendedor_id = auth.uid() or public.es_admin())));
create policy "Vendedor o admin ve entrega" on storage.objects
  for select to authenticated
  using (bucket_id = 'boletas-entregadas' and exists (
    select 1 from public.ordenes o join public.boletas b on b.id = o.boleta_id
     where o.id::text = (storage.foldername(name))[1] and (b.vendedor_id = auth.uid() or o.comprador_id = auth.uid() or public.es_admin())));

commit;
