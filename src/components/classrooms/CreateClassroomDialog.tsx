import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface CreateClassroomDialogProps {
  onClassroomCreated: () => void;
}

export default function CreateClassroomDialog({ onClassroomCreated }: CreateClassroomDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: ''
  });

  const generateClassroomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !formData.name.trim()) return;

    setLoading(true);
    try {
      const classroomCode = generateClassroomCode();
      
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          name: formData.name.trim(),
          subject: formData.subject.trim() || null,
          classroom_code: classroomCode,
          created_by: profile.user_id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as member
      await supabase
        .from('classroom_members')
        .insert({
          user_id: profile.user_id,
          classroom_id: data.id,
          role: profile.role
        });

      setFormData({ name: '', subject: '' });
      setOpen(false);
      onClassroomCreated();
      
      toast({
        title: "Success!",
        description: `Classroom "${formData.name}" created with code: ${classroomCode}`,
      });
    } catch (error) {
      console.error('Error creating classroom:', error);
      toast({
        title: "Error",
        description: "Failed to create classroom",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Classroom
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Classroom</DialogTitle>
          <DialogDescription>
            Set up a new classroom to connect with your students
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classroom-name">Classroom Name</Label>
            <Input
              id="classroom-name"
              placeholder="e.g., Math Grade 10"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="classroom-subject">Subject (Optional)</Label>
            <Input
              id="classroom-subject"
              placeholder="e.g., Mathematics"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Classroom"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}