-- Fix function search path security warnings
ALTER FUNCTION public.get_current_user_role() SET search_path = '';
ALTER FUNCTION public.is_teacher() SET search_path = '';