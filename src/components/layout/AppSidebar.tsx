import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, MessageSquare, Calendar, TrendingUp, CheckSquare, 
  User, Users, PlusCircle, BookOpen, GraduationCap
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
  SidebarTrigger,
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
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Events", url: "/events", icon: Calendar },
    { title: "Performance", url: "/performance", icon: TrendingUp },
    { title: "Tasks", url: "/tasks", icon: CheckSquare },
    { title: "Profile", url: "/profile", icon: User },
  ];

  // Role-specific items
  const teacherItems = [
    { title: "Create Class", url: "/create-class", icon: PlusCircle },
    { title: "Manage Classes", url: "/manage-classes", icon: Users },
    { title: "Assignments", url: "/assignments", icon: BookOpen },
  ];

  const studentParentItems = [
    { title: "Join Class", url: "/join-class", icon: Users },
    { title: "Attendance", url: "/attendance", icon: CheckSquare },
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
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses(isActive(item.url))}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
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
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses(isActive(item.url))}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
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