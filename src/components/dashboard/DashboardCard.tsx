import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function DashboardCard({ title, icon: Icon, children, action, className = "" }: DashboardCardProps) {
  return (
    <Card className={`shadow-card hover:shadow-glow transition-all duration-300 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center">
          <Icon className="h-4 w-4 mr-2 text-primary" />
          {title}
        </CardTitle>
        {action && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={action.onClick}
            className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
          >
            {action.label}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}