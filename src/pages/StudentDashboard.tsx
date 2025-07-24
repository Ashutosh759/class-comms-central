import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Calendar, 
  GraduationCap,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { UpdateCard } from "@/components/dashboard/UpdateCard";
import { format } from "date-fns";

interface StudentStats {
  totalClassrooms: number;
  averageGrade: number;
  attendanceRate: number;
  pendingFees: number;
  upcomingEvents: number;
}

interface Grade {
  id: string;
  assignment_title: string;
  grade: number;
  max_grade: number;
  classroom_name: string;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  classroom_name: string;
}

interface FeeRecord {
  id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  status: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<StudentStats>({
    totalClassrooms: 6,
    averageGrade: 85,
    attendanceRate: 92,
    pendingFees: 250,
    upcomingEvents: 4,
  });
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingFees, setPendingFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      
      // Set up real-time subscriptions
      const gradeSubscription = supabase
        .channel('student-grades')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'grades', filter: `student_id=eq.${user.id}` },
          () => fetchRecentGrades()
        )
        .subscribe();

      const attendanceSubscription = supabase
        .channel('student-attendance')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'attendance', filter: `student_id=eq.${user.id}` },
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
    // Get classrooms student is member of
    const { data: memberships } = await supabase
      .from('classroom_members')
      .select('classroom_id')
      .eq('user_id', user?.id);

    const classroomIds = memberships?.map(m => m.classroom_id) || [];

    // Get average grade
    const { data: grades } = await supabase
      .from('grades')
      .select('grade, max_grade')
      .eq('student_id', user?.id);

    let averageGrade = 0;
    if (grades && grades.length > 0) {
      const totalPercentage = grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0);
      averageGrade = totalPercentage / grades.length;
    }

    // Get attendance rate
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', user?.id);

    let attendanceRate = 0;
    if (attendance && attendance.length > 0) {
      const presentCount = attendance.filter(a => a.status === 'present').length;
      attendanceRate = (presentCount / attendance.length) * 100;
    }

    // Get pending fees
    const { data: fees } = await supabase
      .from('fees')
      .select('amount')
      .eq('student_id', user?.id)
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
    // Sample data for demonstration
    const sampleGrades = [
      {
        id: '1',
        assignment_title: 'React Component Architecture',
        grade: 94,
        max_grade: 100,
        classroom_name: 'Web Development',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        assignment_title: 'Binary Tree Implementation',
        grade: 87,
        max_grade: 100,
        classroom_name: 'Data Structures & Algorithms',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        assignment_title: 'MongoDB Query Optimization',
        grade: 91,
        max_grade: 100,
        classroom_name: 'NoSQL Databases',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '4',
        assignment_title: 'REST API Design Project',
        grade: 88,
        max_grade: 100,
        classroom_name: 'Backend Development',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    setRecentGrades(sampleGrades);
  };

  const fetchRecentAttendance = async () => {
    // Sample data for demonstration
    const sampleAttendance = [
      {
        id: '1',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'present',
        classroom_name: 'Web Development',
      },
      {
        id: '2',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'present',
        classroom_name: 'Data Structures & Algorithms',
      },
      {
        id: '3',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'late',
        classroom_name: 'NoSQL Databases',
      },
      {
        id: '4',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'present',
        classroom_name: 'Machine Learning',
      }
    ];

    setRecentAttendance(sampleAttendance);
  };

  const fetchPendingFees = async () => {
    // Sample data for demonstration
    const sampleFees = [
      {
        id: '1',
        fee_type: 'Cloud Platform Access',
        amount: 150,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'unpaid',
        description: 'AWS/Azure lab environment access'
      },
      {
        id: '2',
        fee_type: 'Software License',
        amount: 100,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'unpaid',
        description: 'JetBrains IDE license for development'
      }
    ];

    setPendingFees(sampleFees);
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
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">Track your academic progress</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardCard
          title="Classrooms"
          icon={BookOpen}
          action={{
            label: "View All",
            onClick: () => window.location.href = "/dashboard/classrooms"
          }}
        >
          <div className="text-2xl font-bold">{stats.totalClassrooms}</div>
          <p className="text-xs text-muted-foreground">Enrolled classes</p>
        </DashboardCard>

        <DashboardCard
          title="Average Grade"
          icon={TrendingUp}
        >
          <div className="text-2xl font-bold">{stats.averageGrade}%</div>
          <p className="text-xs text-muted-foreground">Overall performance</p>
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
                    subtitle={grade.classroom_name}
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
                      title={record.classroom_name}
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
                      Due: {format(new Date(fee.due_date), 'MMM d, yyyy')}
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

export default StudentDashboard;