"use client";

import { useEffect, useState } from "react";
import { authService, UserRole } from "@/services/authService";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import SalesDashboard from "@/components/dashboard/SalesDashboard";
import OpsDashboard from "@/components/dashboard/OpsDashboard";

export default function DashboardOverview() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const user = authService.getUser();
  const currentRole = user?.role;

  if (!isMounted || !user) {
    return (
       <div className="flex h-[80vh] items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-neon-blue)]"></div>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Dashboard Loader based on Real Auth */}
      <div className="transition-all duration-500">
        {(currentRole === 'ADMIN_TENANT' || currentRole === 'SUPERADMIN') && <AdminDashboard />}
        {currentRole === 'AGENT' && <SalesDashboard />}
        {currentRole === 'TECHNICIAN' && <OpsDashboard />}
      </div>
    </div>
  );
}
