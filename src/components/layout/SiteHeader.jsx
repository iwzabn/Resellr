import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "next-themes";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Shield,
  Store,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCategories } from "@/hooks/use-categories";



export function SiteHeader() {
  const categories = useCategories();
  const categoryOptions = [{ slug: "", name: "All categories" }, ...categories];
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [unread, setUnread] = useState(0);

  // The bell reflects unseen notifications; it re-reads on navigation so
  // opening a notification clears the count.
  useEffect(() => {
    if (!user?.id) {
      setUnread(0);
      return;
    }
    let active = true;
    base44.entities.Notification.count({ user_id: user.id, is_read: false })
      .then((total) => {
        if (active) setUnread(Number(total) || 0);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [user?.id, pathname]);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate({ to: "/marketplace", search: { q: term || undefined, category: category || undefined } });
    setMobileSearch(false);
  };

  const initials = (user?.full_name || user?.email || "R").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-header text-header-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="shrink-0 font-display text-xl font-extrabold tracking-tight">
          Resellr<span className="text-primary">.</span>
        </Link>

        <form onSubmit={submitSearch} className="hidden flex-1 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 shrink-0 text-white/60" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search sneakers, phones, cards…"
            aria-label="Search listings"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
            className="shrink-0 rounded-full border border-white/15 bg-header/60 px-2 py-1 text-xs text-white/80 focus:outline-none"
          >
            {categoryOptions.map((option) => (
              <option key={option.slug} value={option.slug} className="bg-header text-white">
                {option.name}
              </option>
            ))}
          </select>
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          <HeaderLink to="/marketplace">Marketplace</HeaderLink>
          <HeaderLink to="/analytics">Analytics</HeaderLink>
          <HeaderLink to="/sell">Sell an item</HeaderLink>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0 text-white/80 hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setMobileSearch((v) => !v)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="hidden items-center rounded-full border border-white/15 p-0.5 sm:flex">
            <ModePill to="/marketplace" active>
              Buying
            </ModePill>
            <ModePill to="/dashboard">Selling</ModePill>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            asChild
            size="icon"
            variant="ghost"
            className="relative h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Link
              to="/notifications"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-2 transition hover:bg-white/10">
                  <Avatar className="h-7 w-7">
                    {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                    <AvatarFallback className="bg-primary/20 text-xs text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-white/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-sm font-medium">
                  {user?.full_name || user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Seller dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-listings">
                    <Store className="mr-2 h-4 w-4" /> My listings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/enquiries">
                    <Bell className="mr-2 h-4 w-4" /> Enquiries
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="mr-2 h-4 w-4" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
                onClick={navigateToLogin}
              >
                Sign in
              </Button>
              <Button asChild size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/sell">
                  <Plus className="h-4 w-4" /> Sell
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {mobileSearch && (
        <form onSubmit={submitSearch} className="border-t border-white/10 px-4 py-2 md:hidden">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-white/60" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search the marketplace"
              aria-label="Search listings"
              className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/50 focus:outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
              className="max-w-[7.5rem] shrink-0 rounded-full bg-transparent text-xs text-white/70 focus:outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option.slug} value={option.slug} className="bg-header text-white">
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      )}
    </header>
  );
}

function HeaderLink({ to, children }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
      activeProps={{ className: "text-white" }}
    >
      {children}
    </Link>
  );
}

function ModePill({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? "bg-white text-header" : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}