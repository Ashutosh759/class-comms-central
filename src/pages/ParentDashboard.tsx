import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  GraduationCap,
  TrendingUp,
  DollarSign,
  Calendar,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { UpdateCard } from "@/components/dashboard/UpdateCard";
import { format } from "date-fns";

interface ParentStats {
  totalClassrooms: number;
  averageGrade: number;
  attendanceRate: number;
  pendingFees: number;
  upcomingEvents: number;
}

interface ChildGrade {
  id: string;
  assignment_title: string;
  grade: number;
  max_grade: number;
  classroom_name: string;
  student_name: string;
  created_at: string;
}

interface ChildAttendance {
  id: string;
  date: string;
  status: string;
  classroom_name: string;
  student_name: string;
}

interface ChildFee {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  status: string;
  student_name: string;
}

const ParentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ParentStats>({
    totalClassrooms: 6,
    averageGrade: 88,
    attendanceRate: 95,
    pendingFees: 250,
    upcomingEvents: 3,
  });
  const [recentGrades, setRecentGrades] = useState<ChildGrade[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<ChildAttendance[]>([]);
  const [pendingFees, setPendingFees] = useState<ChildFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Set up real-time subscriptions for grades and attendance updates
      const gradeSubscription = supabase
        .channel('parent-grades')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'grades' },
          () => fetchRecentGrades()
        )
        .subscribe();

      const attendanceSubscription = supabase
        .channel('parent-attendance')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'attendance' },
          () => fetchRecentAttendance()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(gradeSubscription);
        supabase.removeChannel(attendanceSubscription);
      };
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchRecentGrades(),
        fetchRecentAttendance(),
        fetchPendingFees()
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
    // For demo purposes, we'll assume parents can see all student data in classrooms they're members of
    // In a real app, you'd have proper parent-child relationships
    
    // Get classrooms parent is member of
    const { data: memberships } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .eq('user_id', user?.id);

    const classroomIds = memberships?.map(m => m.classroom_id) || [];

    // Get all students in these classrooms (simplified for demo)
    const { data: studentMembers } = await supabase
      .from('classroom_members')
      .select('user_id')
      .in('classroom_id', classroomIds)
      .eq('role', 'student');

    const studentIds = studentMembers?.map(m => m.user_id) || [];

    // Get average grade across all children
    const { data: grades } = await supabase
      .from('grades')
      .select('grade, max_grade')
      .in('student_id', studentIds);

    let averageGrade = 0;
    if (grades && grades.length > 0) {
      const totalPercentage = grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0);
      averageGrade = totalPercentage / grades.length;
    }

    // Get attendance rate
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .in('student_id', studentIds);

    let attendanceRate = 0;
    if (attendance && attendance.length > 0) {
      const presentCount = attendance.filter(a => a.status === 'present').length;
      attendanceRate = (presentCount / attendance.length) * 100;
    }

    // Get pending fees
    const { data: fees } = await supabase
      .from('fees')
      .select('amount')
      .in('student_id', studentIds)
      .eq('status', 'unpaid');

    const pendingFeesTotal = fees?.reduce((sum, f) => sum + f.amount, 0) || 0;

    // Get upcoming events count
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('classroom_id', classroomIds)
      .gte('event_date', new Date().toISOString());

    setStats({
      totalClassrooms: classroomIds.length,
      averageGrade: Math.round(averageGrade),
      attendanceRate: Math.round(attendanceRate),
      pendingFees: pendingFeesTotal,
      upcomingEvents: eventsCount || 0,
    });
  };

  const fetchRecentGrades = async () => {
    // Get classrooms parent is member of
    const { data: memberships } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .eq('user_id', user?.id);

    const classroomIds = memberships?.map(m => m.classroom_id) || [];

    // Get students in these classrooms
    const { data: studentMembers } = await supabase
      .from('classroom_members')
      .select('user_id')
      .in('classroom_id', classroomIds)
      .eq('role', 'student');

    const studentIds = studentMembers?.map(m => m.user_id) || [];

    const { data } = await supabase
      .from('grades')
      .select(`
        id,
        assignment_title,
        grade,
        max_grade,
        created_at,
        student_id,
        classrooms(name),
        profiles!grades_student_id_fkey(first_name, last_name)
      `)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
      .limit(5);

    const formattedGrades = data?.map((grade: any) => ({
      id: grade.id,
      assignment_title: grade.assignment_title,
      grade: grade.grade,
      max_grade: grade.max_grade,
      classroom_name: grade.classrooms?.name || 'Unknown',
      student_name: `${grade.profiles?.first_name || ''} ${grade.profiles?.last_name || ''}`.trim(),
      created_at: grade.created_at,
    })) || [];

    setRecentGrades(formattedGrades);
  };

  const fetchRecentAttendance = async () => {
    // Get classrooms parent is member of
    const { data: memberships } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .eq('user_id', user?.id);

    const classroomIds = memberships?.map(m => m.classroom_id) || [];

    // Get students in these classrooms
    const { data: studentMembers } = await supabase
      .from('classroom_members')
      .select('user_id')
      .in('classroom_id', classroomIds)
      .eq('role', 'student');

    const studentIds = studentMembers?.map(m => m.user_id) || [];

    const { data } = await supabase
      .from('attendance')
      .select(`
        id,
        date,
        status,
        student_id,
        classrooms(name),
        profiles!attendance_student_id_fkey(first_name, last_name)
      `)
      .in('student_id', studentIds)
      .order('date', { ascending: false })
      .limit(5);

    const formattedAttendance = data?.map((record: any) => ({
      id: record.id,
      date: record.date,
      status: record.status,
      classroom_name: record.classrooms?.name || 'Unknown',
      student_name: `${record.profiles?.first_name || ''} ${record.profiles?.last_name || ''}`.trim(),
    })) || [];

    setRecentAttendance(formattedAttendance);
  };

  const fetchPendingFees = async () => {
    // Get classrooms parent is member of
    const { data: memberships } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .eq('user_id', user?.id);

    const classroomIds = memberships?.map(m => m.classroom_id) || [];

    // Get students in these classrooms
    const { data: studentMembers } = await supabase
      .from('classroom_members')
      .select('user_id')
      .in('classroom_id', classroomIds)
      .eq('role', 'student');

    const studentIds = studentMembers?.map(m => m.user_id) || [];

    const { data } = await supabase
      .from('fees')
      .select(`
        *,
        profiles!fees_student_id_fkey(first_name, last_name)
      `)
      .in('student_id', studentIds)
      .in('status', ['unpaid', 'overdue'])
      .order('due_date', { ascending: true });

    const formattedFees = data?.map((fee: any) => ({
      ...fee,
      student_name: `${fee.profiles?.first_name || ''} ${fee.profiles?.last_name || ''}`.trim(),
    })) || [];

    setPendingFees(formattedFees);
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'absent': return AlertCircle;
      case 'late': return Clock;
      default: return AlertCircle;
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-500';
      case 'absent': return 'text-red-500';
      case 'late': return 'text-yellow-500';
      default: return 'text-gray-500';
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
        <div>
          <h1 className="text-3xl font-bold">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor your child's academic progress</p>
        </div>
        <Button>
          <MessageSquare className="h-4 w-4 mr-2" />
          Message Teacher
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardCard
          title="Classrooms"
          icon={Users}
          action={{
            label: "View All",
            onClick: () => window.location.href = "/dashboard/classrooms"
          }}
        >
          <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
          <p className="text-xs text-muted-foreground">Connected classes</p>
        </DashboardCard>

        <DashboardCard
          title="Average Grade"
          icon={TrendingUp}
        >
          <div className="text-2xl font-bold">{stats.averageGrade}%</div>
          <p className="text-xs text-muted-foreground">Child's performance</p>
        </DashboardCard>

        <DashboardCard
          title="Attendance"
          icon={CheckCircle}
        >
          <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
          <p className="text-xs text-muted-foreground">Attendance rate</p>
        </DashboardCard>

        <DashboardCard
          title="Pending Fees"
          icon={DollarSign}
        >
          <div className="text-2xl font-bold">${stats.pendingFees}</div>
          <p className="text-xs text-muted-foreground">Due amount</p>
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
        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentGrades.length === 0 ? (
              <p className="text-muted-foreground">No grades yet</p>
            ) : (
              <div className="space-y-4">
                {recentGrades.map((grade) => (
                  <UpdateCard
                    key={grade.id}
                    icon={GraduationCap}
                    title={grade.assignment_title}
                    subtitle={`${grade.student_name} - ${grade.classroom_name}`}
                    content={
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">
                          {grade.grade}/{grade.max_grade}
                        </span>
                        <Badge variant={
                          (grade.grade / grade.max_grade * 100) >= 80 ? "default" :
                          (grade.grade / grade.max_grade * 100) >= 60 ? "secondary" : "destructive"
                        }>
                          {Math.round(grade.grade / grade.max_grade * 100)}%
                        </Badge>
                      </div>
                    }
                    timestamp={format(new Date(grade.created_at), 'MMM d, h:mm a')}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="text-muted-foreground">No attendance records</p>
            ) : (
              <div className="space-y-4">
                {recentAttendance.map((record) => {
                  const Icon = getAttendanceIcon(record.status);
                  return (
                    <UpdateCard
                      key={record.id}
                      icon={Icon}
                      title={`${record.student_name} - ${record.classroom_name}`}
                      subtitle={format(new Date(record.date), 'MMMM d, yyyy')}
                      content={
                        <Badge 
                          variant={record.status === 'present' ? 'default' : 'destructive'}
                          className={getAttendanceColor(record.status)}
                        >
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      }
                      timestamp={format(new Date(record.date), 'MMM d')}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Fees */}
      {pendingFees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Pending Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{fee.fee_type}</h4>
                    <p className="text-sm text-muted-foreground">
                      {fee.student_name} - Due: {format(new Date(fee.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${fee.amount}</p>
                    <Badge variant={fee.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {fee.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParentDashboard;