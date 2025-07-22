import { useState } from "react";
import { DashboardCard } from "./DashboardCard";
import { UpdateCard } from "./UpdateCard";
import { 
  Users, TrendingUp, Calendar, DollarSign,
  CheckCircle, AlertCircle, Clock, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type UserRole = "teacher" | "student" | "parent";

interface DashboardProps {
  userRole: UserRole;
  userName: string;
}

export function Dashboard({ userRole, userName }: DashboardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const mockUpdates = [
    {
      icon: CheckCircle,
      title: "Attendance Update",
      subtitle: "Today's attendance recorded",
      content: <div className="flex items-center space-x-2">
        <span className="text-success font-medium">Present</span>
        <span className="text-muted-foreground">- Math Class</span>
      </div>,
      badge: { text: "New", variant: "default" as const },
      timestamp: "2 hours ago"
    },
    {
      icon: TrendingUp,
      title: "Performance Update",
      subtitle: "Weekly progress report",
      content: <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Math</span>
          <span className="font-medium">85%</span>
        </div>
        <Progress value={85} className="h-2" />
      </div>,
      timestamp: "5 hours ago"
    },
    {
      icon: Calendar,
      title: "Event Reminder",
      subtitle: "Science Fair next week",
      content: <p className="text-sm">Don't forget to prepare your project presentation for the annual science fair.</p>,
      badge: { text: "Upcoming", variant: "secondary" as const },
      timestamp: "1 day ago"
    },
    {
      icon: DollarSign,
      title: "Fee Update",
      subtitle: "Monthly fee reminder",
      content: <div className="flex items-center justify-between">
        <span className="text-sm">Due: ₹2,500</span>
        <Button size="sm" variant="outline" className="text-xs h-6">Pay Now</Button>
      </div>,
      badge: { text: "Due", variant: "destructive" as const },
      timestamp: "3 days ago"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-primary rounded-2xl p-6 text-primary-foreground">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
          {getGreeting()}, {userName}!
        </h1>
        <p className="text-primary-foreground/80">
          {userRole === "teacher" && "Ready to inspire young minds today?"}
          {userRole === "student" && "Ready to learn something new today?"}
          {userRole === "parent" && "Here's what's happening with your child's education."}
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Classes"
          icon={BookOpen}
          action={{ label: "View All", onClick: () => {} }}
        >
          <div className="text-2xl font-bold text-primary">12</div>
          <p className="text-xs text-muted-foreground">Active this semester</p>
        </DashboardCard>

        <DashboardCard
          title="Attendance Rate"
          icon={CheckCircle}
          action={{ label: "Details", onClick: () => {} }}
        >
          <div className="text-2xl font-bold text-success">94%</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </DashboardCard>

        <DashboardCard
          title="Upcoming Events"
          icon={Calendar}
          action={{ label: "View Calendar", onClick: () => {} }}
        >
          <div className="text-2xl font-bold text-accent">3</div>
          <p className="text-xs text-muted-foreground">Next 7 days</p>
        </DashboardCard>

        <DashboardCard
          title="Messages"
          icon={Users}
          action={{ label: "Open Chat", onClick: () => {} }}
        >
          <div className="text-2xl font-bold text-foreground">8</div>
          <p className="text-xs text-muted-foreground">Unread messages</p>
        </DashboardCard>
      </div>

      {/* Recent Updates Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Updates</h2>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
        
        <div className="space-y-3">
          {mockUpdates.map((update, index) => (
            <UpdateCard key={index} {...update} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-muted/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {userRole === "teacher" && (
            <>
              <Button className="bg-gradient-primary text-primary-foreground h-auto py-3 px-4 flex-col space-y-1">
                <Users className="h-5 w-5" />
                <span className="text-xs">Create Class</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 px-4 flex-col space-y-1">
                <BookOpen className="h-5 w-5" />
                <span className="text-xs">New Assignment</span>
              </Button>
            </>
          )}
          {(userRole === "student" || userRole === "parent") && (
            <>
              <Button className="bg-gradient-success text-success-foreground h-auto py-3 px-4 flex-col space-y-1">
                <Users className="h-5 w-5" />
                <span className="text-xs">Join Class</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 px-4 flex-col space-y-1">
                <CheckCircle className="h-5 w-5" />
                <span className="text-xs">View Tasks</span>
              </Button>
            </>
          )}
          <Button variant="outline" className="h-auto py-3 px-4 flex-col space-y-1">
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Schedule</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 px-4 flex-col space-y-1">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">Reports</span>
          </Button>
        </div>
      </div>
    </div>
  );
}