import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface JoinClassroomDialogProps {
  onClassroomJoined: () => void;
}

export default function JoinClassroomDialog({ onClassroomJoined }: JoinClassroomDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !joinCode.trim()) return;

    setLoading(true);
    try {
      // Find classroom by code
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('classroom_code', joinCode.toUpperCase().trim())
        .single();

      if (classroomError) {
        toast({
          title: "Error",
          description: "Classroom not found. Please check the code.",
          variant: "destructive"
        });
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('classroom_members')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('classroom_id', classroom.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already joined",
          description: "You are already a member of this classroom.",
          variant: "destructive"
        });
        return;
      }

      // Join classroom
      const { error } = await supabase
        .from('classroom_members')
        .insert({
          user_id: profile.user_id,
          classroom_id: classroom.id,
          role: profile.role
        });

      if (error) throw error;

      setJoinCode('');
      setOpen(false);
      onClassroomJoined();
      
      toast({
        title: "Success!",
        description: `Successfully joined "${classroom.name}"`,
      });
    } catch (error) {
      console.error('Error joining classroom:', error);
      toast({
        title: "Error",
        description: "Failed to join classroom",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Join Classroom
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Classroom</DialogTitle>
          <DialogDescription>
            Enter the classroom code provided by your teacher
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">Classroom Code</Label>
            <Input
              id="join-code"
              placeholder="Enter classroom code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Joining..." : "Join Classroom"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}