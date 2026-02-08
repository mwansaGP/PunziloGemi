
-- Migration: 20251105161747

-- Migration: 20251013060701
-- Create enum types for grades and question types
CREATE TYPE grade_level AS ENUM ('Seven', 'Nine', 'Twelve');
CREATE TYPE question_type AS ENUM ('MCQ', 'ShortAnswer', 'Essay');
CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE paper_type AS ENUM ('Paper1', 'Paper2', 'Paper3');

-- Create profiles table with grade and subjects
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_level grade_level NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level grade_level NOT NULL,
  is_compulsory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subjects"
  ON public.subjects FOR SELECT
  TO PUBLIC
  USING (true);

-- Create topics table
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view topics"
  ON public.topics FOR SELECT
  TO PUBLIC
  USING (true);

-- Create past_papers table
CREATE TABLE public.past_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  paper_type paper_type NOT NULL,
  duration TEXT NOT NULL,
  total_score FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.past_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view past papers"
  ON public.past_papers FOR SELECT
  TO PUBLIC
  USING (true);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  past_paper_id UUID REFERENCES public.past_papers(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options TEXT[], -- for MCQ
  correct_answer TEXT[] NOT NULL,
  sample_answer TEXT,
  difficulty difficulty_level DEFAULT 'Medium',
  question_number INT NOT NULL,
  marks FLOAT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON public.questions FOR SELECT
  TO PUBLIC
  USING (true);

-- Create user_attempts table for tracking scores
CREATE TABLE public.user_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  marks_awarded FLOAT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attempts"
  ON public.user_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
  ON public.user_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create profile_subjects junction table
CREATE TABLE public.profile_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(profile_id, subject_id)
);

ALTER TABLE public.profile_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subject selections"
  ON public.profile_subjects FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own subject selections"
  ON public.profile_subjects FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own subject selections"
  ON public.profile_subjects FOR DELETE
  USING (auth.uid() = profile_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample subjects for each grade
INSERT INTO public.subjects (name, grade_level, is_compulsory) VALUES
  -- Grade 7
  ('Mathematics', 'Seven', true),
  ('English', 'Seven', true),
  ('Science', 'Seven', true),
  ('Social Studies', 'Seven', true),
  ('Zambian Languages', 'Seven', false),
  
  -- Grade 9
  ('Mathematics', 'Nine', true),
  ('English', 'Nine', true),
  ('Science', 'Nine', true),
  ('Social Studies', 'Nine', false),
  ('Computer Studies', 'Nine', false),
  
  -- Grade 12
  ('Mathematics', 'Twelve', false),
  ('English', 'Twelve', true),
  ('Physics', 'Twelve', false),
  ('Chemistry', 'Twelve', false),
  ('Biology', 'Twelve', false),
  ('Additional Mathematics', 'Twelve', false),
  ('Computer Science', 'Twelve', false),
  ('Geography', 'Twelve', false),
  ('History', 'Twelve', false);

-- Migration: 20251013062253
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for admin content management
CREATE POLICY "Admins can insert subjects"
  ON public.subjects
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subjects"
  ON public.subjects
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subjects"
  ON public.subjects
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert past papers"
  ON public.past_papers
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update past papers"
  ON public.past_papers
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete past papers"
  ON public.past_papers
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert questions"
  ON public.questions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update questions"
  ON public.questions
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete questions"
  ON public.questions
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create view for admin stats
CREATE OR REPLACE VIEW public.admin_stats AS
SELECT
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.past_papers) as total_papers,
  (SELECT COUNT(*) FROM public.questions) as total_questions;

-- Grant access to authenticated users for the view
GRANT SELECT ON public.admin_stats TO authenticated;

-- Migration: 20251013062318
-- Drop the existing view
DROP VIEW IF EXISTS public.admin_stats;

-- Create a function instead of a view for better security control
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_papers BIGINT,
  total_questions BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::BIGINT,
    (SELECT COUNT(*) FROM public.past_papers)::BIGINT,
    (SELECT COUNT(*) FROM public.questions)::BIGINT;
END;
$$;

-- Migration: 20251013062336
-- Drop the existing view
DROP VIEW IF EXISTS public.admin_stats;

-- Create a function instead of a view for better security control
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_papers BIGINT,
  total_questions BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::BIGINT,
    (SELECT COUNT(*) FROM public.past_papers)::BIGINT,
    (SELECT COUNT(*) FROM public.questions)::BIGINT;
END;
$$;

-- Migration: 20251013062355
-- Fix the update_updated_at_column function to have a stable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Migration: 20251013064603
-- Add name and school_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN name TEXT,
ADD COLUMN school_name TEXT;

-- Migration: 20251013113418
-- Add grade_level column to past_papers table
ALTER TABLE public.past_papers 
ADD COLUMN grade_level grade_level NOT NULL DEFAULT 'Seven';

-- Migration: 20251014033329
-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-images', 'question-images', true);

-- Allow anyone to view question images (public bucket)
CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow admins to upload question images
CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'question-images' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- Allow admins to update question images
CREATE POLICY "Admins can update question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'question-images' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- Allow admins to delete question images
CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'question-images' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- Migration: 20251016001156
-- Add is_writable column to past_papers table
ALTER TABLE public.past_papers
ADD COLUMN is_writable BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.past_papers.is_writable IS 'Indicates if the paper can be attempted as a written exam (false for papers involving physical activities)';

-- Migration: 20251016064910
-- Create exam_dates table to store final exam start dates
CREATE TABLE IF NOT EXISTS public.exam_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade_level grade_level NOT NULL UNIQUE,
  exam_start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_dates ENABLE ROW LEVEL SECURITY;

-- Anyone can view exam dates
CREATE POLICY "Anyone can view exam dates"
ON public.exam_dates
FOR SELECT
USING (true);

-- Only admins can update exam dates
CREATE POLICY "Admins can update exam dates"
ON public.exam_dates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert exam dates
CREATE POLICY "Admins can insert exam dates"
ON public.exam_dates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_exam_dates_updated_at
BEFORE UPDATE ON public.exam_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default exam dates for each grade level
INSERT INTO public.exam_dates (grade_level, exam_start_date) VALUES
  ('Seven', '2025-11-01'),
  ('Nine', '2025-11-01'),
  ('Twelve', '2025-11-01')
ON CONFLICT (grade_level) DO NOTHING;

-- Migration: 20251016073142
-- Make paper_type nullable in past_papers table to allow papers without a paper type designation
ALTER TABLE public.past_papers 
ALTER COLUMN paper_type DROP NOT NULL;

-- Migration: 20251017011707
-- Create exam_sessions table to track complete exam attempts
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  past_paper_id UUID NOT NULL REFERENCES public.past_papers(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  total_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_possible_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own exam sessions"
ON public.exam_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam sessions"
ON public.exam_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam sessions"
ON public.exam_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add exam_session_id to user_attempts
ALTER TABLE public.user_attempts
ADD COLUMN exam_session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_exam_sessions_user_id ON public.exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_paper_id ON public.exam_sessions(past_paper_id);
CREATE INDEX idx_user_attempts_session_id ON public.user_attempts(exam_session_id);

-- Add trigger for updated_at
CREATE TRIGGER update_exam_sessions_updated_at
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

