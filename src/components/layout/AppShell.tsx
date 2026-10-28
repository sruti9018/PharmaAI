"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Pill,
  FileText,
  Radio,
  Share2,
  Bell,
  Settings,
  Search,
  Menu as MenuIcon,
  Activity,
  LogOut,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Bot,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/lib/authContext";

// Coss UI components strictly:
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipPopup,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toolbar, ToolbarButton } from "@/components/ui/toolbar";
import {
  Drawer,
  DrawerTrigger,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  CommandDialog,
  CommandDialogPopup,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Inventory", href: "/inventory", icon: Pill },
  { title: "Prescriptions", href: "/prescriptions", icon: FileText, badge: "OCR" },
  { title: "RFID Lookup", href: "/rfid-lookup", icon: Radio, badge: "Live" },
  { title: "Medical Share", href: "/share", icon: Share2 },
  { title: "Alerts", href: "/alerts", icon: Bell },
  { title: "Agent", href: "/agent", icon: Bot, badge: "AI" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery("max-md");
  const { user, logout, switchShift } = useAuth();

  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(2);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Poll alerts count periodically
  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const res = await fetch("/api/alerts?limit=5");
        if (res.ok) {
          const data = await res.json();
          if (data.unreadCount !== undefined) {
            setUnreadAlerts(data.unreadCount);
          }
        }
      } catch {
        // quiet ignore
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const currentNav = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  if (pathname?.startsWith("/share/") && pathname !== "/share") {
    return (
      <div className="min-h-svh w-full bg-background overflow-y-auto p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-svh w-full overflow-hidden" style={{ background: "transparent" }}>
      {/* Desktop Sidebar — Glass Panel, z-40, fixed left */}
      <aside className="hidden md:flex w-68 flex-col border-r border-slate-200 text-sidebar-foreground relative z-40"
        style={{
          background: "#ffffff",
          boxShadow: "4px 0 24px rgba(0,0,0,0.04)"
        }}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/50">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="size-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-foreground">
              <span>PharmaLink</span>
              <span className="text-primary font-black">AI</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              ESP32 Smart Pharmacy
            </span>
          </div>
        </div>

        {/* Navigation links inside Coss ScrollArea with generous spacing */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Menu
          </div>

          <div className="space-y-2">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden",
                    active
                      ? "bg-neutral-100/90 text-neutral-900 font-semibold shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/80"
                  )}
                >
                  {/* Left accent indicator bar on active item */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-md bg-primary"
                    />
                  )}

                  <div className="flex items-center gap-3.5 ps-1">
                    <Icon className={cn("size-5 shrink-0 transition-colors", active ? "text-neutral-900" : "text-neutral-500")} />
                    <span className="tracking-tight">{item.title}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "bg-neutral-100 text-neutral-600"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.title === "Alerts" && unreadAlerts > 0 && (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
                      {unreadAlerts}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </ScrollArea>

        {/* Pharmacist Profile at bottom */}
        <div className="p-4 border-t border-white/50">
          <div className="flex items-center justify-between rounded-xl p-2.5 border border-white/60"
            style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="size-8.5">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  SJ
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.name || "Dr. Sarah Jenkins"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.role || "Lead Pharmacist"} • {user?.shift || "Morning"}
                </p>
              </div>
            </div>

            <Menu>
              <MenuTrigger
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Pharmacist user menu"
              >
                <UserCheck className="size-4" />
              </MenuTrigger>
              <MenuPopup align="end" side="top" sideOffset={8}>
                <div className="px-2 py-1.5 font-semibold text-foreground text-xs truncate">
                  {user?.name}
                </div>
                <div className="px-2.5 py-1 text-[11px] text-muted-foreground">
                  License: {user?.licenseNumber || "PH-89104"}
                </div>
                <MenuSeparator />
                <MenuItem onClick={() => switchShift("Morning")}>
                  Shift: Morning (08:00 - 16:00)
                </MenuItem>
                <MenuItem onClick={() => switchShift("Evening")}>
                  Shift: Evening (16:00 - 00:00)
                </MenuItem>
                <MenuItem onClick={() => switchShift("Night")}>
                  Shift: Night (00:00 - 08:00)
                </MenuItem>
                <MenuSeparator />
                <MenuItem onClick={logout} className="text-destructive">
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </MenuItem>
              </MenuPopup>
            </Menu>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar — Glass Panel, z-40 */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-6 relative z-40"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 0 rgba(0,0,0,0.06)"
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger (Only shown on mobile) */}
            <Drawer
              open={mobileDrawerOpen}
              onOpenChange={setMobileDrawerOpen}
              position="left"
            >
              <DrawerTrigger
                className="md:hidden inline-flex size-9 items-center justify-center rounded-lg border border-input bg-background text-foreground"
                aria-label="Open navigation menu"
              >
                <MenuIcon className="size-5" />
              </DrawerTrigger>

              <DrawerPopup className="w-72 p-0">
                <DrawerHeader className="border-b px-5 py-4">
                  <DrawerTitle className="flex items-center gap-2">
                    <Activity className="size-5 text-primary" />
                    <span className="font-bold text-foreground">PharmaLink AI</span>
                  </DrawerTitle>
                </DrawerHeader>

                <div className="p-4 space-y-2">
                  <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    Menu
                  </div>
                  {navItems.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <DrawerClose key={item.href} render={<span />}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={cn(
                            "relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all overflow-hidden",
                            active
                              ? "bg-neutral-100/90 text-neutral-900 font-semibold"
                              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                          )}
                        >
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-md bg-primary"
                            />
                          )}
                          <div className="flex items-center gap-3.5 ps-1">
                            <Icon className={cn("size-5 shrink-0", active ? "text-neutral-900" : "text-neutral-500")} />
                            <span>{item.title}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                active
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </DrawerClose>
                    );
                  })}
                </div>
              </DrawerPopup>
            </Drawer>

            {/* Coss Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentNav?.title || "Overview"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Top Actions: Search Cmd+K, Hardware Toolbar, Dark Mode, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Coss Toolbar for Quick Hardware Pills */}
            <Toolbar className="hidden lg:flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/80">
              <ToolbarButton
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/rfid-lookup")}
              >
                <CheckCircle2 className="size-3.5 text-success" />
                <span>ESP32 Ready</span>
              </ToolbarButton>
              <Separator orientation="vertical" className="h-3.5" />
              <ToolbarButton
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/agent")}
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>AI Agent</span>
              </ToolbarButton>
            </Toolbar>

            {/* Quick Command Search (Cmd+K) */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setCommandOpen(true)}
                  />
                }
              >
                <Search className="size-3.5" />
                <span className="text-xs">Search pharmacy...</span>
                <Kbd className="text-[10px]">⌘K</Kbd>
              </TooltipTrigger>
              <TooltipPopup>Open command palette (⌘K)</TooltipPopup>
            </Tooltip>

            {/* Alerts link with badge */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => router.push("/alerts")}
                    aria-label="View alerts"
                  />
                }
              >
                <Bell className="size-4 text-foreground" />
                {unreadAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
                )}
              </TooltipTrigger>
              <TooltipPopup>
                {unreadAlerts > 0 ? `${unreadAlerts} unread alerts` : "No new alerts"}
              </TooltipPopup>
            </Tooltip>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Global Command Dialog (Cmd+K) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandDialogPopup>
          <Command>
            <CommandInput placeholder="Search medicines, pages, or hardware commands..." />
            <CommandList>
              <CommandEmpty>No matching commands or medications found.</CommandEmpty>
              
              <CommandGroup>
                <CommandGroupLabel>Navigation</CommandGroupLabel>
                <CommandItem
                  onSelect={() => {
                    router.push("/");
                    setCommandOpen(false);
                  }}
                >
                  <LayoutDashboard className="size-4 me-2 text-muted-foreground" />
                  <span>Dashboard Overview</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/inventory");
                    setCommandOpen(false);
                  }}
                >
                  <Pill className="size-4 me-2 text-muted-foreground" />
                  <span>Medicine Inventory &amp; Stock</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/prescriptions");
                    setCommandOpen(false);
                  }}
                >
                  <FileText className="size-4 me-2 text-muted-foreground" />
                  <span>Prescription Queue &amp; OCR</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/rfid-lookup");
                    setCommandOpen(false);
                  }}
                >
                  <Radio className="size-4 me-2 text-muted-foreground" />
                  <span>Live RFID Scan &amp; Load Cell</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/share");
                    setCommandOpen(false);
                  }}
                >
                  <Share2 className="size-4 me-2 text-muted-foreground" />
                  <span>Generate Medical Share Link</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/alerts");
                    setCommandOpen(false);
                  }}
                >
                  <Bell className="size-4 me-2 text-muted-foreground" />
                  <span>Hardware &amp; Clinical Alerts</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/agent");
                    setCommandOpen(false);
                  }}
                >
                  <Bot className="size-4 me-2 text-primary" />
                  <span>PharmaLink AI Agent</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup>
                <CommandGroupLabel>Quick Hardware Actions</CommandGroupLabel>
                <CommandItem
                  onSelect={() => {
                    router.push("/settings");
                    setCommandOpen(false);
                  }}
                >
                  <Sparkles className="size-4 me-2 text-primary" />
                  <span>Simulate Load Cell Weight Drop (Low Stock)</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    router.push("/rfid-lookup");
                    setCommandOpen(false);
                  }}
                >
                  <Radio className="size-4 me-2 text-primary" />
                  <span>Simulate RFID Tag Scan</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialogPopup>
      </CommandDialog>
    </div>
  );
}

