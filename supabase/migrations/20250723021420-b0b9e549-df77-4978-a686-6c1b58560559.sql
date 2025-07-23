-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'parent');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classrooms table
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  classroom_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classroom_members table
CREATE TABLE public.classroom_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, classroom_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('announcement', 'private')),
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for classrooms
CREATE POLICY "Users can view classrooms they are members of" ON public.classrooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members 
    WHERE classroom_id = classrooms.id AND user_id = auth.uid()
  ) OR created_by = auth.uid()
);

CREATE POLICY "Teachers can create classrooms" ON public.classrooms FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);

CREATE POLICY "Teachers can update their own classrooms" ON public.classrooms FOR UPDATE 
USING (created_by = auth.uid());

-- RLS Policies for classroom_members
CREATE POLICY "Users can view classroom members of their classrooms" ON public.classroom_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_members cm2 
    WHERE cm2.classroom_id = classroom_members.classroom_id AND cm2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join classrooms" ON public.classroom_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can remove members from their classrooms" ON public.classroom_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE id = classroom_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can leave classrooms" ON public.classroom_members FOR DELETE 
USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their classrooms" ON public.messages FOR SELECT 
USING (
  (classroom_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classroom_members 
    WHERE classroom_id = messages.classroom_id AND user_id = auth.uid()
  )) OR
  (message_type = 'private' AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
);

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  (
    (classroom_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.classroom_members 
      WHERE classroom_id = messages.classroom_id AND user_id = auth.uid()
    )) OR
    (message_type = 'private' AND receiver_id IS NOT NULL)
  )
);

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true);

-- Storage policies for message attachments
CREATE POLICY "Users can view message attachments" ON storage.objects FOR SELECT 
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can upload message attachments" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    (NEW.raw_user_meta_data ->> 'role')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.messages;