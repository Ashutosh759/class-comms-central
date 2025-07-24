import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, MessageCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import classroomHero from "@/assets/classroom-hero.jpg";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        
        {/* Logo and Title */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-primary p-4 rounded-2xl shadow-glow mr-4">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ParentPing
            </h1>
          </div>
          
          <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Where teachers, students, and parents connect in real-time. 
            Your communication hub for seamless school collaboration.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-12 relative">
          <img 
            src={classroomHero} 
            alt="ParentPing - School Communication Platform" 
            className="w-full max-w-3xl mx-auto rounded-2xl shadow-card"
          />
          <div className="absolute inset-0 bg-gradient-primary/10 rounded-2xl"></div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl shadow-soft">
            <Users className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Connect Everyone</h3>
            <p className="text-muted-foreground text-sm">Teachers, students, and parents in one unified platform</p>
          </div>
          
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl shadow-soft">
            <MessageCircle className="h-8 w-8 text-success mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Real-time Chat</h3>
            <p className="text-muted-foreground text-sm">Instant messaging with file sharing and announcements</p>
          </div>
          
          <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl shadow-soft">
            <TrendingUp className="h-8 w-8 text-accent mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
            <p className="text-muted-foreground text-sm">Monitor attendance, performance, and upcoming events</p>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          onClick={onContinue}
          className="bg-gradient-primary text-primary-foreground px-8 py-6 text-lg font-semibold rounded-xl shadow-glow hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}