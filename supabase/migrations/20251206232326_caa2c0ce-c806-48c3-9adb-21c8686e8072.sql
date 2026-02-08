-- Add policy to allow anyone to view questions (needed for viewing past papers)
CREATE POLICY "Anyone can view questions for past papers" 
ON public.questions 
FOR SELECT 
USING (true);