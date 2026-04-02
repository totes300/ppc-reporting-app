"use client";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { LayoutDashboardIcon, Settings2Icon, BarChart3Icon } from "lucide-react";

const navItems = [
  {
    title: "Irányítópult",
    url: "/",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Beállítások",
    url: "/settings",
    icon: <Settings2Icon />,
  },
];

export function AppSidebar({
  agencyName,
  userEmail,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  agencyName: string;
  userEmail: string;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <BarChart3Icon className="size-5!" />
                <span className="text-base font-semibold">{agencyName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser email={userEmail} />
      </SidebarFooter>
    </Sidebar>
  );
}
