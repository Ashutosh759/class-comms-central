import { Dashboard } from "@/components/dashboard/Dashboard";

type UserRole = "teacher" | "student" | "parent";

interface DashboardPageProps {
  userRole: UserRole;
  userName: string;
}

export default function DashboardPage({ userRole, userName }: DashboardPageProps) {
  return (
    <div className="p-6">
      <Dashboard userRole={userRole} userName={userName} />
    </div>
  );
}