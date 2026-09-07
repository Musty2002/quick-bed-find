-- Staff <-> hospital assignment
CREATE TABLE public.hospital_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hospital_id)
);

GRANT SELECT, INSERT, DELETE ON public.hospital_staff TO authenticated;
GRANT ALL ON public.hospital_staff TO service_role;

ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hospital_staff(_user_id uuid, _hospital_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hospital_staff
    WHERE user_id = _user_id AND hospital_id = _hospital_id
  )
$$;

CREATE POLICY "Staff view own assignments"
ON public.hospital_staff FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins assign staff"
ON public.hospital_staff FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins remove staff"
ON public.hospital_staff FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Reservation records on bed_requests
ALTER TABLE public.bed_requests
  ADD COLUMN reservation_code text NOT NULL DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  ADD COLUMN patient_phone text,
  ADD COLUMN patient_age integer,
  ADD COLUMN notes text,
  ADD COLUMN checked_in_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX bed_requests_reservation_code_key ON public.bed_requests (reservation_code);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bed_requests_updated_at
BEFORE UPDATE ON public.bed_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scope staff access to their own hospital
DROP POLICY IF EXISTS "Staff can update requests" ON public.bed_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.bed_requests;

CREATE POLICY "View own or assigned hospital requests"
ON public.bed_requests FOR SELECT TO authenticated
USING (
  auth.uid() = requester_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_hospital_staff(auth.uid(), hospital_id)
);

CREATE POLICY "Staff update assigned hospital requests"
ON public.bed_requests FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_hospital_staff(auth.uid(), hospital_id)
);

DROP POLICY IF EXISTS "Staff can update hospitals" ON public.hospitals;

CREATE POLICY "Staff update own hospital"
ON public.hospitals FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_hospital_staff(auth.uid(), id)
);