import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { AuthForm } from "@/components/auth/AuthForm";
import { AppSidebar } from "@/components/layout/AppSidebar";
import DashboardPage from "./DashboardPage";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

type UserRole = "teacher" | "student" | "parent";
type AppState = "welcome" | "auth" | "dashboard";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("welcome");
  const [userRole, setUserRole] = useState<UserRole>("student");
  const [userName] = useState("Alex Johnson"); // Mock user name

  const handleWelcomeContinue = () => {
    setAppState("auth");
  };

  const handleAuthBack = () => {
    setAppState("welcome");
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setAppState("dashboard");
  };

  const handleLogout = () => {
    setAppState("welcome");
  };

  if (appState === "welcome") {
    return <WelcomeScreen onContinue={handleWelcomeContinue} />;
  }

  if (appState === "auth") {
    return <AuthForm onBack={handleAuthBack} onLogin={handleLogin} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar userRole={userRole} />
        
        <main className="flex-1">
          {/* Header */}
          <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold">ClassConnect Dashboard</h1>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              Logout
            </Button>
          </header>

          {/* Main Content */}
          <DashboardPage userRole={userRole} userName={userName} />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
