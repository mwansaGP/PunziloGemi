-- Drop the restrictive policies and add a public read policy for questions
-- (Answers are protected via the get_questions_for_exam function during exams)

DROP POLICY IF EXISTS "Users can view questions they have attempted" ON public.questions;
DROP POLICY IF EXISTS "Admins can view all question data" ON public.questions;

-- Allow anyone to view questions for browsing past papers
CREATE POLICY "Anyone can view questions" 
ON public.questions 
FOR SELECT 
USING (true);