import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  message: string;
  message_type: 'announcement' | 'private';
  sender_id: string;
  receiver_id?: string;
  classroom_id?: string;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  receiver?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface ClassroomMember {
  user_id: string;
  role: string;
  profiles: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

interface Classroom {
  id: string;
  name: string;
  subject: string;
  classroom_code: string;
}

export default function ClassroomChatPage() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [teachers, setTeachers] = useState<ClassroomMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'announcement' | 'private'>('announcement');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');

  useEffect(() => {
    if (classroomId && profile) {
      fetchClassroomData();
      fetchMessages();
      fetchMembers();
      
      // Set up real-time subscription for messages
      const messageChannel = supabase
        .channel(`classroom-${classroomId}-messages`)
        .on('postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `classroom_id=eq.${classroomId}`
          },
          () => fetchMessages()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    }
  }, [classroomId, profile]);

  const fetchClassroomData = async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .single();

      if (error) throw error;
      setClassroom(data);
    } catch (error) {
      console.error('Error fetching classroom:', error);
      toast({
        title: "Error",
        description: "Failed to load classroom data",
        variant: "destructive"
      });
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          message,
          message_type,
          sender_id,
          receiver_id,
          classroom_id,
          created_at,
          sender:profiles!messages_sender_id_fkey(first_name, last_name, role),
          receiver:profiles!messages_receiver_id_fkey(first_name, last_name, role)
        `)
        .or(`classroom_id.eq.${classroomId},and(receiver_id.eq.${profile?.user_id},classroom_id.eq.${classroomId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as any[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('classroom_members')
        .select(`
          user_id,
          role,
          profiles!classroom_members_user_id_fkey(first_name, last_name, role)
        `)
        .eq('classroom_id', classroomId);

      if (error) throw error;
      
      const allMembers = (data || []) as any[];
      setMembers(allMembers);
      
      // Filter teachers for private messaging
      const teacherMembers = allMembers.filter((member: any) => member.profiles?.role === 'teacher');
      setTeachers(teacherMembers);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !profile) return;

    try {
      const messageData = {
        message: messageText,
        message_type: messageType,
        sender_id: profile.user_id,
        classroom_id: classroomId,
        ...(messageType === 'private' && selectedRecipient && {
          receiver_id: selectedRecipient
        })
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) throw error;

      setMessageText('');
      setSelectedRecipient('');
      
      toast({
        title: "Message sent!",
        description: messageType === 'announcement' ? "Announcement sent to classroom" : "Private message sent"
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

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard/classrooms')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classrooms
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{classroom?.name}</h1>
            <p className="text-muted-foreground">
              {classroom?.subject} • Code: {classroom?.classroom_code}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">{members.length} members</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Classroom Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No messages yet. Start a conversation!
                  </p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(message.sender?.first_name, message.sender?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {message.sender?.first_name} {message.sender?.last_name}
                          </span>
                          <Badge variant={getRoleBadgeVariant(message.sender?.role || '')}>
                            {message.sender?.role}
                          </Badge>
                          {message.message_type === 'private' && (
                            <Badge variant="outline" className="text-xs">
                              Private to {message.receiver?.first_name} {message.receiver?.last_name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm">{message.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Form */}
              <form onSubmit={sendMessage} className="space-y-4 border-t pt-4">
                <div className="flex space-x-2">
                  <Select 
                    value={messageType} 
                    onValueChange={(value: 'announcement' | 'private') => setMessageType(value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>

                  {messageType === 'private' && (
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.user_id} value={teacher.user_id}>
                            {teacher.profiles.first_name} {teacher.profiles.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Textarea
                    placeholder={messageType === 'announcement' ? "Write an announcement..." : "Write a private message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                    rows={3}
                  />
                  <Button 
                    type="submit" 
                    disabled={!messageText.trim() || (messageType === 'private' && !selectedRecipient)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Members Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Classroom Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitials(member.profiles.first_name, member.profiles.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.profiles.first_name} {member.profiles.last_name}
                      </p>
                      <Badge variant={getRoleBadgeVariant(member.profiles.role)} className="text-xs">
                        {member.profiles.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}