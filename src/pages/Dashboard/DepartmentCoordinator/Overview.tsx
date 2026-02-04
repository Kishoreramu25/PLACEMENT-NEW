import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/shared/StatsCard";
import { CardSkeleton } from "@/components/shared/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CalendarDays, Users, TrendingUp, Download, Upload, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlacementRecordTable } from "@/components/shared/PlacementRecordTable";
import { StudentPlacementTable } from "@/components/placement/StudentPlacementTable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function CoordinatorOverview() {
  const { departmentId } = useAuth();

  // Fetch department info
  const { data: department } = useQuery({
    queryKey: ["department", departmentId],
    queryFn: async () => {
      if (!departmentId) return null;
      const { data } = await supabase
        .from("departments")
        .select("name, code")
        .eq("id", departmentId)
        .single();
      return data;
    },
    enabled: !!departmentId,
  });

  // Fetch drives for this department
  const { data: drivesCount, isLoading: loadingDrives } = useQuery({
    queryKey: ["dept-drives-count", departmentId],
    queryFn: async () => {
      if (!department?.code) return 0;
      // Count unique companies for this dept from student_placements
      const { data } = await supabase
        .from("student_placements" as any)
        .select("company_name")
        .eq("department", department.code);

      if (!data) return 0;
      const uniqueCompanies = new Set(data.map((r: any) => r.company_name?.toLowerCase().trim()));
      return uniqueCompanies.size;
    },
    enabled: !!department?.code,
  });

  const { data: deptStats, isLoading: loadingStats } = useQuery({
    queryKey: ["dept-statistics", departmentId],
    queryFn: async () => {
      // Return defaults if no department code
      const defaults = { appeared: 0, selected: 0, ppo: 0, pieData: [], barData: [] };
      if (!department?.code) return defaults;

      const { data } = await supabase
        .from("student_placements" as any)
        .select("*")
        .eq("department", department.code);

      if (!data || data.length === 0) return defaults;

      // Basic Counts - Use offer_type
      const placedCount = data.filter((r: any) =>
        r.offer_type?.toLowerCase().includes('placed') ||
        r.offer_type?.toLowerCase().includes('on campus') ||
        r.offer_type?.toLowerCase().includes('off campus')
      ).length;

      const internshipCount = data.filter((r: any) =>
        r.offer_type?.toLowerCase().includes('internship')
      ).length;

      const bothCount = data.filter((r: any) =>
        r.offer_type?.toLowerCase().includes('both')
      ).length;

      // Stats for cards (Both counts as placed for "Students Placed" usually, or handled separately)
      // Here: Selected = Placed + Both
      const selected = placedCount + bothCount;

      // Data for Pie Chart
      const pieData = [
        { name: 'Placed', value: placedCount },
        { name: 'Internship', value: internshipCount },
        { name: 'Both', value: bothCount },
      ].filter(d => d.value > 0);

      // Data for Bar Chart (Year-wise placement trend)
      const yearMap = new Map();
      data.forEach((r: any) => {
        // Extract year from join_date or created_at
        const dateStr = r.join_date || r.created_at;
        const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'Unknown';
        yearMap.set(year, (yearMap.get(year) || 0) + 1);
      });

      const barData = Array.from(yearMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year));

      return {
        appeared: data.length,
        selected,
        ppo: internshipCount + bothCount,
        pieData,
        barData
      };
    },
    enabled: !!department?.code,
  });


  const placementRate =
    deptStats && deptStats.appeared > 0
      ? Math.round((deptStats.selected / deptStats.appeared) * 100)
      : 0;

  if (!departmentId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No department assigned to your profile.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {department?.name || "Department"} Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of placement activities for your department
          </p>
        </div>

        {/* Quick Actions & Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-4 border rounded-lg bg-card shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/THALA TEMPLATE.xlsx" download="THALA TEMPLATE.xlsx">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </a>
            </Button>
          </div>
          {/* Global search is now integrated into the Placement Record Table below */}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loadingStats ? (
            <CardSkeleton />
          ) : (
            <StatsCard
              title="Eligible Drives"
              value={drivesCount || 0}
              icon={<CalendarDays className="h-6 w-6" />}
              variant="primary"
            />
          )}
          {loadingStats ? (
            <CardSkeleton />
          ) : (
            <StatsCard
              title="Students Appeared"
              value={deptStats?.appeared || 0}
              icon={<Users className="h-6 w-6" />}
              variant="default"
            />
          )}
          {loadingStats ? (
            <CardSkeleton />
          ) : (
            <StatsCard
              title="Students Placed"
              value={deptStats?.selected || 0}
              icon={<TrendingUp className="h-6 w-6" />}
              variant="success"
            />
          )}
          {loadingStats ? (
            <CardSkeleton />
          ) : (
            <StatsCard
              title="Placement Rate"
              value={`${placementRate}%`}
              icon={<Building2 className="h-6 w-6" />}
              variant="warning"
            />
          )}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Placement Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Placement Status</CardTitle>
              <CardDescription>Distribution of student offers</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {deptStats?.pieData && deptStats.pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptStats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deptStats.pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={["#10b981", "#3b82f6", "#f59e0b"][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Year-wise Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Yearly Placement Trend</CardTitle>
              <CardDescription>Placed students over different years</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {deptStats?.barData && deptStats.barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptStats.barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="count" name="Placed Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Placement Record Table (Company Drives) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Placement Drives</h2>
          </div>
          <PlacementRecordTable />
        </div>

        {/* Student Placement Table (Individual Offers) */}
        <div className="space-y-4 pt-8">
          <StudentPlacementTable />
        </div>
      </div>
    </DashboardLayout >
  );
}