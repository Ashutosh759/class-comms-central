import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface UpdateCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  content: ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  timestamp: string;
}

export function UpdateCard({ icon: Icon, title, subtitle, content, badge, timestamp }: UpdateCardProps) {
  return (
    <Card className="shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              {badge && (
                <Badge variant={badge.variant || "default"} className="text-xs">
                  {badge.text}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
            
            <div className="text-sm text-foreground mb-2">
              {content}
            </div>
            
            <p className="text-xs text-muted-foreground">{timestamp}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}