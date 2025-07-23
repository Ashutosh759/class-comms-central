import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleWelcomeContinue = () => {
    navigate("/auth");
  };

  // If user is already authenticated, redirect to dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  return <WelcomeScreen onContinue={handleWelcomeContinue} />;
};

export default Index;
