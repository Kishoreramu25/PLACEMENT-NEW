import { useAuth } from "@/hooks/useAuth";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  BarChart3,
  FileText,
  Users,
  GraduationCap,
  TrendingUp,
  PieChart,
  Settings,
  Plus,
  Briefcase,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tpoNavItems: NavItem[] = [
  { title: "Overview", url: "/dashboard/tpo", icon: LayoutDashboard },
  { title: "Companies", url: "/dashboard/tpo/companies", icon: Building2 },
  { title: "Placement Drives", url: "/dashboard/tpo/drives", icon: CalendarDays },
  { title: "Placement Records", url: "/dashboard/tpo/student-placements", icon: Briefcase },
  { title: "Statistics", url: "/dashboard/tpo/statistics", icon: BarChart3 },
  { title: "Reports", url: "/dashboard/tpo/reports", icon: FileText },
  { title: "Master Data", url: "/dashboard/tpo/master-data", icon: Database },
  { title: "Add Placement", url: "/dashboard/tpo/add-placement", icon: Plus },
];

const coordinatorNavItems: NavItem[] = [
  { title: "OVERALL RECORD", url: "/dashboard/coordinator", icon: LayoutDashboard },
  { title: "MY RECORDS", url: "/dashboard/coordinator/student-placements", icon: Briefcase },
];

const managementNavItems: NavItem[] = [
  { title: "Overview", url: "/dashboard/management", icon: LayoutDashboard },
  { title: "Analytics", url: "/dashboard/management/analytics", icon: PieChart },
  { title: "Trends", url: "/dashboard/management/trends", icon: TrendingUp },
];

export function AppSidebar() {
  const { role } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "placement_officer":
        return tpoNavItems;
      case "department_coordinator":
        return coordinatorNavItems;
      case "management":
        return managementNavItems;
      default:
        return [];
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case "placement_officer":
        return <Users className="h-6 w-6" />;
      case "department_coordinator":
        return <GraduationCap className="h-6 w-6" />;
      case "management":
        return <TrendingUp className="h-6 w-6" />;
      default:
        return <LayoutDashboard className="h-6 w-6" />;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "placement_officer":
        return "TPO Dashboard";
      case "department_coordinator":
        return "HOD Dashboard";
      case "management":
        return "Management";
      default:
        return "Dashboard";
    }
  };

  const navItems = getNavItems();

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            {getRoleIcon()}
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {getRoleLabel()}
              </span>
              <span className="text-xs text-sidebar-foreground/60">Placement System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={collapsed ? "Settings" : undefined}>
              <NavLink
                to="/dashboard/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}