COMMENT ON TABLE public.bed_requests IS 'DEPRECATED: emergency booking retired';
COMMENT ON TABLE public.hospital_staff IS 'DEPRECATED: single-hospital system';
COMMENT ON TABLE public.hospitals IS 'DEPRECATED: single-hospital system';
COMMENT ON TABLE public.user_roles IS 'DEPRECATED: replaced by staff_roles';
DROP POLICY IF EXISTS "Users can assign own role" ON public.user_roles;

CREATE TABLE public.staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','doctor','lab','accountant','records')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.has_staff_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

CREATE POLICY "View own roles or admin" ON public.staff_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_staff_role(auth.uid(), 'admin'));

INSERT INTO public.staff_roles (user_id, role)
SELECT u.id, r FROM auth.users u, unnest(ARRAY['admin','doctor','lab','accountant','records']) r
WHERE u.email = 'nurabulkachuwa@gmail.com' ON CONFLICT DO NOTHING;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, 'Nura Hamisu Umar' FROM auth.users WHERE email = 'nurabulkachuwa@gmail.com' ON CONFLICT DO NOTHING;

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_no text NOT NULL UNIQUE DEFAULT ('HMS-' || upper(substr(md5(gen_random_uuid()::text),1,6))),
  full_name text NOT NULL,
  gender text NOT NULL DEFAULT 'Male',
  age integer,
  phone text,
  address text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read patients" ON public.patients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Records add patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(auth.uid(),'records'));
CREATE POLICY "Records update patients" ON public.patients FOR UPDATE TO authenticated USING (public.has_staff_role(auth.uid(),'records'));

CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid,
  complaint text NOT NULL DEFAULT '',
  diagnosis text,
  notes text,
  status text NOT NULL DEFAULT 'waiting',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read visits" ON public.visits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Records create visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(auth.uid(),'records'));
CREATE POLICY "Doctors update visits" ON public.visits FOR UPDATE TO authenticated USING (public.has_staff_role(auth.uid(),'doctor') OR public.has_staff_role(auth.uid(),'records'));

CREATE TABLE public.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  result text,
  requested_by uuid,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.lab_tests TO authenticated;
GRANT ALL ON public.lab_tests TO service_role;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read lab" ON public.lab_tests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Doctors request lab" ON public.lab_tests FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(auth.uid(),'doctor'));
CREATE POLICY "Lab updates results" ON public.lab_tests FOR UPDATE TO authenticated USING (public.has_staff_role(auth.uid(),'lab'));

CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  drug text NOT NULL,
  dosage text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read rx" ON public.prescriptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Doctors write rx" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(auth.uid(),'doctor'));
CREATE POLICY "Doctors delete rx" ON public.prescriptions FOR DELETE TO authenticated USING (public.has_staff_role(auth.uid(),'doctor'));

CREATE TABLE public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  method text,
  received_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charges TO authenticated;
GRANT ALL ON public.charges TO service_role;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read charges" ON public.charges FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Accountant add charges" ON public.charges FOR INSERT TO authenticated WITH CHECK (public.has_staff_role(auth.uid(),'accountant'));
CREATE POLICY "Accountant update charges" ON public.charges FOR UPDATE TO authenticated USING (public.has_staff_role(auth.uid(),'accountant'));
CREATE POLICY "Accountant delete charges" ON public.charges FOR DELETE TO authenticated USING (public.has_staff_role(auth.uid(),'accountant'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER visits_touch BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();