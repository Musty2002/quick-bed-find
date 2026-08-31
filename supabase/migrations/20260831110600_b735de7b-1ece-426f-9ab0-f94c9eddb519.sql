CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'patient');

CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  icu_total INT NOT NULL DEFAULT 0,
  icu_free INT NOT NULL DEFAULT 0,
  ventilators INT NOT NULL DEFAULT 0,
  distance_km NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;

CREATE TABLE public.bed_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  requester_id UUID,
  patient_name TEXT NOT NULL,
  condition TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Critical' CHECK (severity IN ('Critical','Serious','Stable')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bed_requests TO authenticated;
GRANT ALL ON public.bed_requests TO service_role;

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Anyone can view hospitals" ON public.hospitals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff can update hospitals" ON public.hospitals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert hospitals" ON public.hospitals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete hospitals" ON public.hospitals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own requests" ON public.bed_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own requests" ON public.bed_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Staff can update requests" ON public.bed_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can assign own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.hospitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bed_requests;

INSERT INTO public.hospitals (name, city, icu_total, icu_free, ventilators, distance_km) VALUES
  ('St. Mary Critical Care', 'Abuja', 20, 4, 3, 2.4),
  ('Northgate General', 'Abuja', 32, 0, 0, 5.1),
  ('Riverside Emergency', 'Kaduna', 14, 7, 5, 9.8),
  ('Unity Teaching Hospital', 'Lagos', 40, 2, 1, 14.2);