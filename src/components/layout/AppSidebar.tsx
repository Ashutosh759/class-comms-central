import { Link, useLocation } from "react-router-dom";
import {
  Home, MessageSquare, Calendar, Users, BookOpen, GraduationCap, Settings
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type UserRole = "teacher" | "student" | "parent";

interface AppSidebarProps {
  userRole: UserRole;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  // Common navigation items for all roles
  const commonItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Classrooms", url: "/dashboard/classrooms", icon: BookOpen },
    { title: "Messages", url: "/dashboard/messages", icon: MessageSquare },
    { title: "Calendar", url: "/calendar", icon: Calendar },
  ];

  // Role-specific items
  const teacherItems = [
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const studentParentItems = [
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const roleSpecificItems = userRole === "teacher" ? teacherItems : studentParentItems;

  const getNavClasses = (isActiveRoute: boolean) => 
    isActiveRoute 
      ? "bg-primary text-primary-foreground shadow-sm" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="flex items-center px-4 py-6 border-b">
          <div className="bg-gradient-primary p-2 rounded-lg mr-3">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold">ClassConnect</h2>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commonItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.url} 
                      className={`transition-all duration-200 ${
                        state === "collapsed" 
                          ? "justify-center px-2" 
                          : "justify-start px-3"
                      } ${location.pathname === item.url ? "bg-accent text-accent-foreground" : ""}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && (
                        <span className="ml-3">{item.title}</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Role-specific Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {userRole === "teacher" ? "Teaching Tools" : "Learning"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roleSpecificItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.url} 
                      className={`transition-all duration-200 ${
                        state === "collapsed" 
                          ? "justify-center px-2" 
                          : "justify-start px-3"
                      } ${location.pathname === item.url ? "bg-accent text-accent-foreground" : ""}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && (
                        <span className="ml-3">{item.title}</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}