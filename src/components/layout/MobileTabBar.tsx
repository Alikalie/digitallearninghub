import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MessageSquare, BookOpen, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Courses", href: "/courses", icon: BookOpen },
  { name: "Classes", href: "/classrooms", icon: Users },
  { name: "Profile", href: "/profile", icon: User },
];

export function MobileTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border lg:hidden safe-bottom shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.href ||
            location.pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[11px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.name}</span>
              {isActive && (
                <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
