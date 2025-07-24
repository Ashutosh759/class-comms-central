import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  GraduationCap,
  BookOpen,
  TrendingUp,
  Bell,
  Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { UpdateCard } from "@/components/dashboard/UpdateCard";
import { format } from "date-fns";

interface DashboardStats {
  totalClassrooms: number;
  totalStudents: number;
  totalParents: number;
  unreadMessages: number;
  upcomingEvents: number;
}

interface RecentMessage {
  id: string;
  message: string;
  sender_name: string;
  created_at: string;
  classroom_name?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  classroom_name?: string;
}

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalClassrooms: 0,
    totalStudents: 0,
    totalParents: 0,
    unreadMessages: 0,
    upcomingEvents: 0,
  });
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Set up real-time subscriptions
      const messageSubscription = supabase
        .channel('teacher-messages')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => fetchRecentMessages()
        )
        .subscribe();

      const eventSubscription = supabase
        .channel('teacher-events')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'events' },
          () => fetchUpcomingEvents()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
        supabase.removeChannel(eventSubscription);
      };
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchRecentMessages(),
        fetchUpcomingEvents()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    // Get classrooms created by teacher
    const { data: classrooms } = await supabase
      .from('classrooms')
      .select(`
        id,
        classroom_members!inner(user_id, role)
      `)
      .eq('created_by', user?.id);

    // Count students and parents
    let studentCount = 0;
    let parentCount = 0;
    
    classrooms?.forEach((classroom: any) => {
      classroom.classroom_members.forEach((member: any) => {
        if (member.role === 'student') studentCount++;
        if (member.role === 'parent') parentCount++;
      });
    });

    // Get unread messages count (simplified - all private messages to teacher)
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user?.id)
      .eq('message_type', 'private');

    // Get upcoming events count
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user?.id)
      .gte('event_date', new Date().toISOString());

    setStats({
      totalClassrooms: classrooms?.length || 0,
      totalStudents: studentCount,
      totalParents: parentCount,
      unreadMessages: unreadCount || 0,
      upcomingEvents: eventsCount || 0,
    });
  };

  const fetchRecentMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        id,
        message,
        created_at,
        classroom_id,
        classrooms(name),
        profiles!messages_sender_id_fkey(first_name, last_name)
      `)
      .eq('receiver_id', user?.id)
      .eq('message_type', 'private')
      .order('created_at', { ascending: false })
      .limit(5);

    const formattedMessages = data?.map((msg: any) => ({
      id: msg.id,
      message: msg.message,
      sender_name: `${msg.profiles?.first_name || ''} ${msg.profiles?.last_name || ''}`.trim(),
      created_at: msg.created_at,
      classroom_name: msg.classrooms?.name,
    })) || [];

    setRecentMessages(formattedMessages);
  };

  const fetchUpcomingEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        event_type,
        classroom_id,
        classrooms(name)
      `)
      .eq('created_by', user?.id)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5);

    const formattedEvents = data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      event_date: event.event_date,
      event_type: event.event_type,
      classroom_name: event.classrooms?.name,
    })) || [];

    setUpcomingEvents(formattedEvents);
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
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your classrooms and students</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Classroom
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardCard
          title="Total Classrooms"
          icon={BookOpen}
          action={{
            label: "View All",
            onClick: () => window.location.href = "/dashboard/classrooms"
          }}
        >
          <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
          <p className="text-xs text-muted-foreground">Active classrooms</p>
        </DashboardCard>

        <DashboardCard
          title="Students"
          icon={GraduationCap}
        >
          <div className="text-2xl font-bold">{stats.totalStudents}</div>
          <p className="text-xs text-muted-foreground">Enrolled students</p>
        </DashboardCard>

        <DashboardCard
          title="Parents"
          icon={Users}
        >
          <div className="text-2xl font-bold">{stats.totalParents}</div>
          <p className="text-xs text-muted-foreground">Connected parents</p>
        </DashboardCard>

        <DashboardCard
          title="Messages"
          icon={MessageSquare}
          action={{
            label: "View All",
            onClick: () => window.location.href = "/dashboard/messages"
          }}
        >
          <div className="text-2xl font-bold">{stats.unreadMessages}</div>
          <p className="text-xs text-muted-foreground">Unread messages</p>
        </DashboardCard>

        <DashboardCard
          title="Upcoming Events"
          icon={Calendar}
          action={{
            label: "View Calendar",
            onClick: () => window.location.href = "/dashboard/calendar"
          }}
        >
          <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
          <p className="text-xs text-muted-foreground">This week</p>
        </DashboardCard>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <p className="text-muted-foreground">No recent messages</p>
            ) : (
              <div className="space-y-4">
                {recentMessages.map((message) => (
                  <UpdateCard
                    key={message.id}
                    icon={MessageSquare}
                    title={message.sender_name || "Anonymous"}
                    subtitle={message.classroom_name || "Private Message"}
                    content={
                      <p className="text-sm">
                        {message.message.length > 100 
                          ? `${message.message.substring(0, 100)}...` 
                          : message.message}
                      </p>
                    }
                    timestamp={format(new Date(message.created_at), 'MMM d, h:mm a')}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <UpdateCard
                    key={event.id}
                    icon={Calendar}
                    title={event.title}
                    subtitle={event.classroom_name || "General Event"}
                    content={
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{event.event_type}</Badge>
                      </div>
                    }
                    timestamp={format(new Date(event.event_date), 'MMM d, h:mm a')}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col">
              <BookOpen className="h-6 w-6 mb-2" />
              <span>New Classroom</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              <span>Add Event</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>Grade Assignment</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col">
              <Bell className="h-6 w-6 mb-2" />
              <span>Send Announcement</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;