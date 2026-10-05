-- ===================================================
-- TUTORLINK SUPABASE DATABASE SCHEMA
-- For User Authentication, Student & Tutor Profiles,
-- Email OTP Verification, and Qualification Documents.
-- ===================================================

-- 1. Main Profiles Table (Shared attributes for Student & Tutor)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Student', 'Tutor')),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  address TEXT,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
  about_you TEXT,
  is_email_verified BOOLEAN DEFAULT FALSE,
  privacy_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Specific Profile Table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subjects TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{"Mathematics", "Physics", "Python"}'
);

-- 3. Tutor Specific Profile Table
CREATE TABLE IF NOT EXISTS public.tutor_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subjects TEXT[] DEFAULT '{}',
  experience_level TEXT DEFAULT 'Senior Tutor (4+ years)',
  hourly_rate NUMERIC(10, 2) DEFAULT 25.00,
  is_verified_tutor BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  total_reviews INT DEFAULT 0
);

-- 4. Tutor Qualification & Degree Certificates Table
CREATE TABLE IF NOT EXISTS public.tutor_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuing_institute TEXT,
  certificate_url TEXT,
  status TEXT DEFAULT 'Verified' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Email OTP Verifications Table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public read access for profiles and tutor listings
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Student profiles are viewable by everyone." ON public.student_profiles FOR SELECT USING (true);
CREATE POLICY "Student profiles insert" ON public.student_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Student profiles update" ON public.student_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tutor profiles are viewable by everyone." ON public.tutor_profiles FOR SELECT USING (true);
CREATE POLICY "Tutor profiles insert" ON public.tutor_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Tutor profiles update" ON public.tutor_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tutor certificates viewable by everyone." ON public.tutor_certificates FOR SELECT USING (true);
CREATE POLICY "Tutor certificates insert" ON public.tutor_certificates FOR INSERT WITH CHECK (true);

CREATE POLICY "OTP verifications policy" ON public.otp_verifications FOR ALL USING (true);

-- ===================================================
-- SAMPLE SEED DATA FOR TESTING
-- ===================================================

-- Dummy User IDs for testing before Supabase Auth registration
INSERT INTO public.profiles (id, role, email, full_name, phone_number, address, about_you, is_email_verified)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Student', 'dinithi.desilva@univ.ac.lk', 'Dinithi de Silva', '+94 77 123 4567', 'Colombo 07', 'Computer science student seeking math guidance.', true),
  ('00000000-0000-0000-0000-000000000002', 'Tutor', 'dilshan.samarawickrama@univ.ac.lk', 'Dilshan Samarawickrama', '+94 71 987 6543', 'Torrous address beat, Luton Road', 'Dedicated educator specializing in math and applied physics.', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_profiles (user_id, subjects, keywords)
VALUES ('00000000-0000-0000-0000-000000000001', '{"Mathematics", "Physics", "Computer Science"}', '{"Math", "Physics", "Data Structures", "Python"}')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.tutor_profiles (user_id, subjects, experience_level, hourly_rate, is_verified_tutor, rating)
VALUES ('00000000-0000-0000-0000-000000000002', '{"Higher Mathematics", "Quantum Physics"}', 'Senior Tutor (4+ years)', 35.00, true, 4.95)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.tutor_certificates (tutor_id, title, issuing_institute, status)
VALUES ('00000000-0000-0000-0000-000000000002', 'B.Sc. Special Hons Degree Certificate', 'University of Colombo', 'Verified')
ON CONFLICT DO NOTHING;
