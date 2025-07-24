import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, BookOpen, Copy, UserPlus } from 'lucide-react';

interface Classroom {
  id: string;
  name: string;
  subject: string | null;
  classroom_code: string;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export default function ClassroomsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', subject: '' });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchClassrooms();
  }, [profile]);

  const fetchClassrooms = async () => {
    if (!profile) return;

    try {
      // Get all classrooms if teacher, or user's own memberships if student/parent
      if (profile.role === 'teacher') {
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('classrooms')
          .select('*')
          .order('created_at', { ascending: false });

        if (classroomsError) throw classroomsError;

        // Get member counts for each classroom
        const classroomsWithCounts = await Promise.all(
          (classroomsData || []).map(async (classroom) => {
            const { count } = await supabase
              .from('classroom_members')
              .select('*', { count: 'exact', head: true })
              .eq('classroom_id', classroom.id);
            
            return {
              ...classroom,
              member_count: count || 0
            };
          })
        );

        setClassrooms(classroomsWithCounts);
      } else {
        // For students/parents, get their classroom memberships
        const { data: membershipData, error: membershipError } = await supabase
          .from('classroom_members')
          .select('classroom_id')
          .eq('user_id', profile.user_id);

        if (membershipError) throw membershipError;

        const classroomIds = membershipData?.map(m => m.classroom_id) || [];
        
        if (classroomIds.length === 0) {
          setClassrooms([]);
          return;
        }

        // Get classroom details
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('classrooms')
          .select('*')
          .in('id', classroomIds)
          .order('created_at', { ascending: false });

        if (classroomsError) throw classroomsError;

        // Get member counts
        const classroomsWithCounts = await Promise.all(
          (classroomsData || []).map(async (classroom) => {
            const { count } = await supabase
              .from('classroom_members')
              .select('*', { count: 'exact', head: true })
              .eq('classroom_id', classroom.id);
            
            return {
              ...classroom,
              member_count: count || 0
            };
          })
        );

        setClassrooms(classroomsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      toast({
        title: "Error",
        description: "Failed to load classrooms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateClassroomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const classroomCode = generateClassroomCode();
      
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          name: newClassroom.name,
          subject: newClassroom.subject || null,
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

      setNewClassroom({ name: '', subject: '' });
      setCreateDialogOpen(false);
      fetchClassrooms();
      
      toast({
        title: "Success!",
        description: `Classroom "${newClassroom.name}" created with code: ${classroomCode}`,
      });
    } catch (error) {
      console.error('Error creating classroom:', error);
      toast({
        title: "Error",
        description: "Failed to create classroom",
        variant: "destructive"
      });
    }
  };

  const joinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      // Find classroom by code
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('classroom_code', joinCode.toUpperCase())
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
      setJoinDialogOpen(false);
      fetchClassrooms();
      
      toast({
        title: "Success!",
        description: "Successfully joined the classroom",
      });
    } catch (error) {
      console.error('Error joining classroom:', error);
      toast({
        title: "Error",
        description: "Failed to join classroom",
        variant: "destructive"
      });
    }
  };

  const copyClassroomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Classroom code copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Classrooms</h1>
          <p className="text-muted-foreground mt-2">
            Manage your classrooms and connect with students
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
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
              <form onSubmit={joinClassroom} className="space-y-4">
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
                <Button type="submit" className="w-full">
                  Join Classroom
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {profile?.role === 'teacher' && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
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
                <form onSubmit={createClassroom} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="classroom-name">Classroom Name</Label>
                    <Input
                      id="classroom-name"
                      placeholder="e.g., Math Grade 10"
                      value={newClassroom.name}
                      onChange={(e) => setNewClassroom(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classroom-subject">Subject (Optional)</Label>
                    <Input
                      id="classroom-subject"
                      placeholder="e.g., Mathematics"
                      value={newClassroom.subject}
                      onChange={(e) => setNewClassroom(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Classroom
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No classrooms yet</h3>
            <p className="text-muted-foreground mb-4">
              {profile?.role === 'teacher' 
                ? "Create your first classroom to get started"
                : "Join a classroom using a classroom code"
              }
            </p>
            {profile?.role === 'teacher' ? (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Classroom
              </Button>
            ) : (
              <Button onClick={() => setJoinDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Join Classroom
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom) => (
            <Card key={classroom.id} className="hover:shadow-card transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    {classroom.subject && (
                      <CardDescription>{classroom.subject}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {classroom.classroom_code}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  {classroom.member_count} member{classroom.member_count !== 1 ? 's' : ''}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyClassroomCode(classroom.classroom_code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.location.href = `/dashboard/classrooms/${classroom.id}/chat`}
                  >
                    Enter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}