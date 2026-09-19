import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  HandCoins,
  FileBarChart,
  Repeat,
  Users,
  TrendingUp,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/forecast", label: "Forecast", icon: TrendingUp },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/expenses", label: "Expenses", icon: Receipt },
      { to: "/income", label: "Income", icon: Wallet },
      { to: "/budget", label: "Budget", icon: PiggyBank },
      { to: "/recurring", label: "Recurring", icon: Repeat },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/debts", label: "Money Owed", icon: HandCoins },
      { to: "/groups", label: "Groups", icon: Users },
    ],
  },
  {
    label: "Insights",
    items: [{ to: "/reports", label: "Reports", icon: FileBarChart }],
  },
];

/** Title of the page at `pathname`, for the top bar. */
export function pageTitle(pathname: string): string {
  const all = NAV_GROUPS.flatMap((g) => g.items);
  const match = all.find((i) => (i.to === "/" ? pathname === "/" : pathname.startsWith(i.to)));
  return match?.label ?? "";
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/" onClick={() => setOpenMobile(false)}>
                <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <PiggyBank className="size-4" />
                </span>
                <span className="font-semibold tracking-tight">Finance</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ to, label, icon: Icon }) => {
                  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
                  return (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <NavLink to={to} onClick={() => setOpenMobile(false)}>
                          <Icon />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="bg-accent text-accent-foreground rounded-lg text-sm font-medium">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name || "Account"}</span>
                    <span className="text-muted-foreground truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                <DropdownMenuLabel className="text-muted-foreground truncate font-normal">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
