"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * The product area's nav: a fixed 64px icon rail, ported from the approved
 * Claude Design project ("Crypto dashboard homepage design",
 * `Tokenix Dashboard.dc.html`, screens 1a/1c).
 *
 * Icon set and path data are copied from that file's `icons` object verbatim
 * — five items (Overview, Insights, Forecast, Budgets, Reports), not the six
 * the written brief carried. Benchmark and Connect are not in the design's
 * rail at all; Connect's key/onboarding flow is reachable through the
 * account menu's "API keys" item instead (also from the design), and
 * Benchmark is folded into Insights as a `?view=benchmark` sub-view rather
 * than getting its own item — see app/(app)/dashboard/insights/page.tsx.
 *
 * Deliberately not shadcn's own Sidebar primitive — that one assumes a
 * labelled, collapsible panel with its own SidebarProvider/SidebarInset
 * plumbing built for the "many nested sections" case. This rail is always
 * exactly 64px and never grows a label, so that machinery has nothing to do
 * here; a plain flex column composed from Tooltip + Avatar + DropdownMenu,
 * per the brief, is the whole component.
 *
 * Colours below are the design's literal hex values, not the token file's
 * generic surface variables — the same "port the mockup" approach the
 * marketing sections use for one-off values that don't map cleanly onto a
 * shared name. The interactive mechanics (open/close, focus, portal
 * rendering, keyboard nav) come from the real shadcn/base-ui primitives
 * rather than the design file's static absolute-position hack, since a
 * shipped tooltip has to be a real accessible tooltip.
 */
const NAV: { label: string; href: string; paths: string[] }[] = [
  { label: "Overview", href: "/dashboard", paths: ["M3 10.5 10 4l7 6.5", "M5 9.5V16h10V9.5"] },
  { label: "Insights", href: "/dashboard/insights", paths: ["M3 16V8", "M8 16V4", "M13 16v-6", "M18 16v-9"] },
  { label: "Forecast", href: "/dashboard/forecast", paths: ["M3 13c3.5 0 4-7 7.5-7S14 13 17 13", "M3 16.5h14"] },
  { label: "Budgets", href: "/dashboard/budgets", paths: ["M10 3a7 7 0 1 0 7 7h-7z", "M10 3v7h7"] },
  { label: "Reports", href: "/dashboard/reports", paths: ["M5 3h7l3 3v11H5z", "M8 9h5M8 12.5h5"] },
];

/** Active on an exact match, or on any deeper path — so a future /dashboard/insights/x still lights Insights. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function NavIcon({ paths }: { paths: string[] }) {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const displayName = user?.fullName ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <nav
      aria-label="Product navigation"
      style={{
        width: 64,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "16px 0 14px",
        background: "#0e0e10",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Link
        href="/dashboard"
        aria-label="Tokenix overview"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          marginBottom: 22,
          borderRadius: 8,
          background: "#ffa515",
          color: "#0b0b0c",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        T
      </Link>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {NAV.map(({ label, href, paths }) => {
          const active = isActive(pathname, href);
          return (
            <Tooltip key={href}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      color: active ? "#ffa515" : "#7c7c85",
                      background: active ? "rgba(255,255,255,0.07)" : "transparent",
                      transition: "background 0.15s ease, color 0.15s ease",
                    }}
                  />
                }
              >
                <NavIcon paths={paths} />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={10}
                style={{
                  background: "#212126",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "#ededf0",
                  fontSize: 12,
                  padding: "5px 10px",
                  borderRadius: 7,
                  boxShadow: "0 10px 24px -10px rgba(0,0,0,0.8)",
                }}
              >
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                aria-label="Account menu"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "#2b2b31",
                  padding: 0,
                  cursor: "pointer",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                }}
              />
            }
          >
            <Avatar style={{ width: 34, height: 34 }}>
              <AvatarImage src={user?.imageUrl} alt="" />
              <AvatarFallback style={{ background: "#2b2b31", color: "#c8c8d0", fontSize: 12, fontWeight: 500 }}>
                {initials(displayName, email)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            style={{
              background: "#212126",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#ededf0",
              fontSize: 12,
              padding: "5px 10px",
              borderRadius: 7,
            }}
          >
            {displayName ?? email ?? "Account"}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          side="right"
          align="end"
          style={{
            background: "#17171a",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 11,
            padding: 6,
            minWidth: 186,
            boxShadow: "0 22px 50px -18px rgba(0,0,0,0.9)",
          }}
        >
          {/*
            A plain div, not <DropdownMenuLabel>: that component renders Base
            UI's MenuGroupLabel, which throws ("MenuGroupRootContext is
            missing") unless it sits inside a <Menu.Group>. This is account
            info shown once above the actions, not a label for a group of
            items below it, so it never had a group to belong to — the fix is
            not using this primitive here, rather than adding an empty group.
          */}
          <div
            style={{
              padding: "9px 10px 11px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 5,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 450, color: "#ededf0" }}>
              {displayName ?? "Your workspace"}
            </div>
            {email && <div style={{ fontSize: 11, color: "#8a8a93", marginTop: 2 }}>{email}</div>}
          </div>

          {/*
            The design's third item, "Workspace settings", has no page behind
            it yet — there is no settings surface in this codebase to send
            someone to. Rather than link it to something that isn't actually
            workspace settings, it's left out until that page exists.
          */}
          <DropdownMenuItem
            render={<Link href="/dashboard/connect" />}
            style={{ padding: "8px 10px", fontSize: 13, color: "#c8c8d0", borderRadius: 7 }}
          >
            API keys
          </DropdownMenuItem>

          <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />

          <SignOutButton redirectUrl="/">
            <DropdownMenuItem
              variant="destructive"
              style={{ padding: "8px 10px", fontSize: 13, borderRadius: 7 }}
            >
              <LogOut size={14} />
              Sign out
            </DropdownMenuItem>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
