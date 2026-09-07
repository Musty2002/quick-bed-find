INSERT INTO public.user_roles (user_id, role) VALUES
  ('86ea088f-f644-4c19-bb9c-9dce010a6b23', 'staff'),
  ('b109e16b-be3f-4993-a3d7-4ae794cb0743', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.hospital_staff (user_id, hospital_id)
SELECT '86ea088f-f644-4c19-bb9c-9dce010a6b23', id
FROM public.hospitals
ORDER BY created_at
LIMIT 1;