import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Users, Megaphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  classroom_id: string | null;
  message: string;
  message_type: string;
  created_at: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  classroom?: {
    name: string;
  };
}

interface Classroom {
  id: string;
  name: string;
}

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface Teacher {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export default function MessagesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classMembers, setClassMembers] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');
  const [messageType, setMessageType] = useState<'announcement' | 'private'>('announcement');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchData();
    subscribeToMessages();
    if (profile && (profile.role === 'student' || profile.role === 'parent')) {
      fetchTeachers();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchClassMembers();
    }
  }, [selectedClassroom]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      // Fetch messages without joins first (due to foreign key issues)
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      let enrichedMessages: Message[] = [];
      
      if (messagesData && messagesData.length > 0) {
        // Get unique sender IDs
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        
        // Fetch sender profiles
        const { data: sendersData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, role')
          .in('user_id', senderIds);

        // Get unique classroom IDs
        const classroomIds = [...new Set(messagesData.map(m => m.classroom_id).filter(Boolean))];
        let classroomsData: any[] = [];
        
        if (classroomIds.length > 0) {
          const { data } = await supabase
            .from('classrooms')
            .select('id, name')
            .in('id', classroomIds);
          classroomsData = data || [];
        }

        // Enrich messages with sender and classroom data
        enrichedMessages = messagesData.map(message => ({
          ...message,
          sender: sendersData?.find(s => s.user_id === message.sender_id),
          classroom: classroomsData?.find(c => c.id === message.classroom_id)
        })) as Message[];
      }

      if (messagesError) throw messagesError;
      setMessages(enrichedMessages);

      // Fetch classrooms user is member of or created
      let classroomsData: Classroom[] = [];
      
      if (profile.role === 'teacher') {
        // Teachers can see all classrooms
        const { data, error: classroomsError } = await supabase
          .from('classrooms')
          .select('id, name');
        
        if (classroomsError) throw classroomsError;
        classroomsData = data || [];
      } else {
        // Students/parents see only their classrooms
        const { data: membershipData, error: membershipError } = await supabase
          .from('classroom_members')
          .select('classroom_id')
          .eq('user_id', profile.user_id);

        if (membershipError) throw membershipError;

        const classroomIds = membershipData?.map(m => m.classroom_id) || [];

        if (classroomIds.length > 0) {
          const { data, error: classroomsError } = await supabase
            .from('classrooms')
            .select('id, name')
            .in('id', classroomIds);
          
          if (classroomsError) throw classroomsError;
          classroomsData = data || [];
        }
      }

      setClassrooms(classroomsData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassMembers = async () => {
    if (!selectedClassroom) return;

    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from('classroom_members')
        .select('user_id')
        .eq('classroom_id', selectedClassroom);

      if (membershipError) throw membershipError;

      const userIds = membershipData?.map(m => m.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, role')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;
        setClassMembers(profilesData || []);
      } else {
        setClassMembers([]);
      }
    } catch (error) {
      console.error('Error fetching class members:', error);
    }
  };

  const fetchTeachers = async () => {
    if (!profile || profile.role === 'teacher') return;

    try {
      // Get user's classrooms first
      const { data: membershipData, error: membershipError } = await supabase
        .from('classroom_members')
        .select('classroom_id')
        .eq('user_id', profile.user_id);

      if (membershipError) throw membershipError;

      const classroomIds = membershipData?.map(m => m.classroom_id) || [];
      
      if (classroomIds.length > 0) {
        // Get all teacher members from those classrooms
        const { data: teacherMembersData, error: teacherMembersError } = await supabase
          .from('classroom_members')
          .select('user_id')
          .in('classroom_id', classroomIds)
          .neq('user_id', profile.user_id);

        if (teacherMembersError) throw teacherMembersError;

        const teacherIds = [...new Set(teacherMembersData?.map(m => m.user_id) || [])];
        
        if (teacherIds.length > 0) {
          // Get teacher profiles
          const { data: teachersData, error: teachersError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, role')
            .in('user_id', teacherIds)
            .eq('role', 'teacher');

          if (teachersError) throw teachersError;
          setTeachers(teachersData || []);
        } else {
          setTeachers([]);
        }
      } else {
        setTeachers([]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchData(); // Refresh messages when new ones arrive
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim()) return;

    try {
      const messageData = {
        sender_id: profile.user_id,
        message: newMessage.trim(),
        message_type: messageType,
        classroom_id: messageType === 'announcement' ? selectedClassroom : null,
        receiver_id: messageType === 'private' ? selectedReceiver : null
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      setNewMessage('');
      toast({
        title: "Success!",
        description: "Message sent successfully",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'teacher': return 'default';
      case 'student': return 'secondary';
      case 'parent': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-2">
          Send announcements and communicate with your classroom
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2 space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-muted-foreground">
                  Start a conversation by sending your first message
                </p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="hover:shadow-card transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(message.sender?.first_name, message.sender?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {message.sender?.first_name} {message.sender?.last_name}
                        </span>
                        <Badge variant={getRoleBadgeVariant(message.sender?.role || '')} className="text-xs">
                          {message.sender?.role}
                        </Badge>
                        {message.message_type === 'announcement' && (
                          <Badge variant="outline" className="text-xs">
                            <Megaphone className="h-3 w-3 mr-1" />
                            Announcement
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {message.message_type === 'announcement' && message.classroom
                          ? `in ${message.classroom.name}`
                          : 'Private message'
                        }
                      </p>
                      
                      <p className="text-foreground mb-2">{message.message}</p>
                      
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Send Message Form */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendMessage} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Type</label>
                  <Select value={messageType} onValueChange={(value: 'announcement' | 'private') => setMessageType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4" />
                          Announcement
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Private Message
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {messageType === 'announcement' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classroom</label>
                    <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select classroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                 {messageType === 'private' && (
                   <div className="space-y-2">
                     <label className="text-sm font-medium">Recipient</label>
                     <Select value={selectedReceiver} onValueChange={setSelectedReceiver}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select recipient" />
                       </SelectTrigger>
                       <SelectContent>
                         {(profile?.role === 'teacher' ? classMembers : teachers)
                           .filter(member => member.user_id !== profile?.user_id)
                           .map((member) => (
                             <SelectItem key={member.user_id} value={member.user_id}>
                               {member.first_name} {member.last_name} ({member.role})
                             </SelectItem>
                           ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-24"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={
                    !newMessage.trim() || 
                    (messageType === 'announcement' && !selectedClassroom) ||
                    (messageType === 'private' && !selectedReceiver)
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}