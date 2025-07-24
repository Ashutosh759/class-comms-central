-- Create events table for calendar functionality
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('assignment', 'exam', 'meeting', 'holiday', 'announcement')),
  audience TEXT[] NOT NULL DEFAULT ARRAY['teacher', 'student', 'parent'],
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table for to-do functionality
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grades table
CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  assignment_title TEXT NOT NULL,
  grade DECIMAL(5,2),
  max_grade DECIMAL(5,2) NOT NULL DEFAULT 100,
  comments TEXT,
  date_assigned DATE,
  date_submitted DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fees table
CREATE TABLE public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view events for their classrooms" 
ON public.events FOR SELECT 
USING (
  classroom_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM classroom_members 
    WHERE classroom_members.classroom_id = events.classroom_id 
    AND classroom_members.user_id = auth.uid()
  ) OR
  created_by = auth.uid()
);

CREATE POLICY "Teachers can create events" 
ON public.events FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'teacher'
  )
);

CREATE POLICY "Teachers can update their events" 
ON public.events FOR UPDATE 
USING (created_by = auth.uid());

-- RLS Policies for tasks
CREATE POLICY "Users can manage their own tasks" 
ON public.tasks FOR ALL 
USING (user_id = auth.uid());

-- RLS Policies for attendance
CREATE POLICY "Users can view attendance for their classrooms" 
ON public.attendance FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM classroom_members 
    WHERE classroom_members.classroom_id = attendance.classroom_id 
    AND classroom_members.user_id = auth.uid()
  ) OR
  student_id = auth.uid() OR
  created_by = auth.uid()
);

CREATE POLICY "Teachers can manage attendance" 
ON public.attendance FOR ALL 
USING (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'teacher'
  )
);

-- RLS Policies for grades
CREATE POLICY "Users can view grades for their classrooms" 
ON public.grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM classroom_members 
    WHERE classroom_members.classroom_id = grades.classroom_id 
    AND classroom_members.user_id = auth.uid()
  ) OR
  student_id = auth.uid() OR
  created_by = auth.uid()
);

CREATE POLICY "Teachers can manage grades" 
ON public.grades FOR ALL 
USING (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'teacher'
  )
);

-- RLS Policies for fees
CREATE POLICY "Users can view their own fees or classroom fees" 
ON public.fees FOR SELECT 
USING (
  student_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('teacher', 'parent')
  )
);

CREATE POLICY "Teachers can manage fees" 
ON public.fees FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'teacher'
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fees_updated_at
  BEFORE UPDATE ON public.fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER TABLE public.grades REPLICA IDENTITY FULL;
ALTER TABLE public.fees REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;