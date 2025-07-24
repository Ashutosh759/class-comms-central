-- Allow users to view classrooms by classroom code for joining purposes
CREATE POLICY "Users can view classrooms by code for joining" 
ON public.classrooms 
FOR SELECT 
USING (true);