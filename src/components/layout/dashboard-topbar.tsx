"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, LogOut, User, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebar } from "./dashboard-sidebar";
import { LanguageSwitcher } from "./language-switcher";

export function DashboardTopbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    const loginUrl =
      session?.user?.role === "super_admin"
        ? "/admin/login"
        : "/company/login";
    await signOut({ redirect: false });
    router.push(loginUrl);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {session?.user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm">{session?.user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              프로필
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
