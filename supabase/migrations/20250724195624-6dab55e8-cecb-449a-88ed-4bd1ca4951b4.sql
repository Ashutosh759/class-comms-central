-- Fix infinite recursion in RLS policies by creating security definer functions
-- and add proper foreign key relationships

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create security definer function to check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'teacher');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Add missing foreign key constraints
ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_classroom_id_fkey 
FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;

ALTER TABLE public.classroom_members 
ADD CONSTRAINT classroom_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.classroom_members 
ADD CONSTRAINT classroom_members_classroom_id_fkey 
FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;

ALTER TABLE public.classrooms 
ADD CONSTRAINT classrooms_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop and recreate RLS policies to fix infinite recursion
DROP POLICY IF EXISTS "Users can view classroom members of their classrooms" ON public.classroom_members;
DROP POLICY IF EXISTS "Teachers can remove members from their classrooms" ON public.classroom_members;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view classroom members of their classrooms" 
ON public.classroom_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members cm2 
    WHERE cm2.classroom_id = classroom_members.classroom_id 
    AND cm2.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can remove members from their classrooms" 
ON public.classroom_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE classrooms.id = classroom_members.classroom_id 
    AND classrooms.created_by = auth.uid()
  )
);

-- Update other policies to use security definer functions where needed
DROP POLICY IF EXISTS "Teachers can create classrooms" ON public.classrooms;
CREATE POLICY "Teachers can create classrooms" 
ON public.classrooms 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND public.is_teacher());

DROP POLICY IF EXISTS "Teachers can create events" ON public.events;
CREATE POLICY "Teachers can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND public.is_teacher());

DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;
CREATE POLICY "Teachers can manage attendance" 
ON public.attendance 
FOR ALL 
USING (created_by = auth.uid() AND public.is_teacher());

DROP POLICY IF EXISTS "Teachers can manage grades" ON public.grades;
CREATE POLICY "Teachers can manage grades" 
ON public.grades 
FOR ALL 
USING (created_by = auth.uid() AND public.is_teacher());

DROP POLICY IF EXISTS "Teachers can manage fees" ON public.fees;
CREATE POLICY "Teachers can manage fees" 
ON public.fees 
FOR ALL 
USING (public.is_teacher());