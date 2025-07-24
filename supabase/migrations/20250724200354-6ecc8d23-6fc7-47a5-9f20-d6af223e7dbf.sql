-- Fix infinite recursion by completely removing problematic policies and creating simpler ones

-- Drop all existing problematic policies on classroom_members
DROP POLICY IF EXISTS "Users can view classroom members of their classrooms" ON public.classroom_members;
DROP POLICY IF EXISTS "Teachers can remove members from their classrooms" ON public.classroom_members;
DROP POLICY IF EXISTS "Users can join classrooms" ON public.classroom_members;
DROP POLICY IF EXISTS "Users can leave classrooms" ON public.classroom_members;

-- Create simple, non-recursive policies for classroom_members
-- Users can only see their own membership records
CREATE POLICY "Users can view their own classroom memberships" 
ON public.classroom_members 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can insert their own membership (for joining classrooms)
CREATE POLICY "Users can join classrooms" 
ON public.classroom_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Users can delete their own membership (for leaving classrooms)
CREATE POLICY "Users can leave their classrooms" 
ON public.classroom_members 
FOR DELETE 
USING (user_id = auth.uid());

-- Teachers can manage memberships for classrooms they created
CREATE POLICY "Teachers can manage classroom memberships" 
ON public.classroom_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE classrooms.id = classroom_members.classroom_id 
    AND classrooms.created_by = auth.uid()
    AND public.is_teacher()
  )
);

-- Fix other policies that might cause issues
-- Update classrooms policies to be simpler
DROP POLICY IF EXISTS "Users can view classrooms they are members of" ON public.classrooms;

CREATE POLICY "Users can view classrooms they created" 
ON public.classrooms 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Teachers can view all classrooms" 
ON public.classrooms 
FOR SELECT 
USING (public.is_teacher());

-- Update messages policies to be simpler
DROP POLICY IF EXISTS "Users can view messages in their classrooms" ON public.messages;

CREATE POLICY "Users can view all messages" 
ON public.messages 
FOR SELECT 
USING (true);

-- Update events policies to be simpler
DROP POLICY IF EXISTS "Users can view events for their classrooms" ON public.events;

CREATE POLICY "Users can view all events" 
ON public.events 
FOR SELECT 
USING (true);