-- Fix critical security issue: Exam answers publicly exposed
-- Use a different approach with RPC function instead of views

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;

-- Create admin-only policy for full question access
CREATE POLICY "Admins can view all question data" 
ON public.questions
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create a secure function that returns questions without answers for students
CREATE OR REPLACE FUNCTION public.get_questions_for_exam(paper_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  question_type text,
  question_number integer,
  marks double precision,
  difficulty text,
  options text[],
  image_url text,
  past_paper_id uuid,
  subject_id uuid,
  topic_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    question_text,
    question_type::text,
    question_number,
    marks,
    difficulty::text,
    options,
    image_url,
    past_paper_id,
    subject_id,
    topic_id,
    created_at
  FROM public.questions
  WHERE past_paper_id = paper_id
  ORDER BY question_number;
$$;

-- Add write protection to topics table
CREATE POLICY "Admins can insert topics" 
ON public.topics
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update topics" 
ON public.topics
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete topics" 
ON public.topics
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));