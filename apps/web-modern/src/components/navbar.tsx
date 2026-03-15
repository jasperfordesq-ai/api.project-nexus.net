"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hexagon,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Wallet,
  Settings,
  LogOut,
  User,
  Bell,
  Sparkles,
  Info,
  Users,
  Calendar,
  Newspaper,
  UserPlus,
  Search,
  Shield,
  ChevronDown,
  UsersRound,
  Plus,
  ArrowLeftRight,
  Award,
  Briefcase,
  Heart,
  Building2,
  BarChart3,
  Target,
  Lightbulb,
  BookOpen,
  HelpCircle,
  TrendingUp,
  MapPin,
  Star,
  CheckCheck,
  Menu,
  X,
} from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { AvatarWithFallback } from "./avatar-with-fallback";

interface NavbarProps {
  user?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
  unreadCount?: number;
  onLogout?: () => void;
}

// Community dropdown items
const communityItems = [
  { label: "Feed", href: "/feed", icon: Newspaper, description: "See what's happening" },
  { label: "Groups", href: "/groups", icon: UsersRound, description: "Join community groups" },
  { label: "Events", href: "/events", icon: Calendar, description: "Discover local events" },
  { label: "Members", href: "/members", icon: Users, description: "Find members" },
  { label: "Organisations", href: "/organisations", icon: Building2, description: "Community partners" },
  { label: "Volunteering", href: "/volunteering", icon: Heart, description: "Give back" },
  { label: "Polls", href: "/polls", icon: BarChart3, description: "Vote on decisions" },
];

// Explore dropdown items
const exploreItems = [
  { label: "Listings", href: "/listings", icon: ListTodo, description: "Browse all listings" },
  { label: "Exchanges", href: "/exchanges", icon: ArrowLeftRight, description: "Track your exchanges" },
  { label: "Jobs", href: "/jobs", icon: Briefcase, description: "Find opportunities" },
  { label: "Skills", href: "/skills", icon: Award, description: "Skills & endorsements" },
  { label: "Matching", href: "/matching", icon: Users, description: "Smart member matching" },
  { label: "Nearby", href: "/location", icon: MapPin, description: "Discover nearby" },
  { label: "Ideas", href: "/ideas", icon: Lightbulb, description: "Community proposals" },
  { label: "Blog", href: "/blog", icon: BookOpen, description: "News & updates" },
  { label: "Knowledge Base", href: "/kb", icon: HelpCircle, description: "FAQs & guides" },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles, description: "Get help from AI" },
];

// Create dropdown items
const createItems = [
  { label: "New Listing", href: "/listings/new", icon: ListTodo },
  { label: "New Event", href: "/events/new", icon: Calendar },
  { label: "New Group", href: "/groups/new", icon: UsersRound },
];

export function Navbar({ user, unreadCount: externalUnreadCount, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const pathname = usePathname();

  // Controlled dropdown state — mutual exclusion
  const [communityOpen, setCommunityOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const closeAllDropdowns = useCallback(() => {
    setCommunityOpen(false);
    setExploreOpen(false);
    setCreateOpen(false);
    setUserOpen(false);
  }, []);

  const handleCommunityOpenChange = useCallback((open: boolean) => {
    if (open) { setExploreOpen(false); setCreateOpen(false); setUserOpen(false); }
    setCommunityOpen(open);
  }, []);
  const handleExploreOpenChange = useCallback((open: boolean) => {
    if (open) { setCommunityOpen(false); setCreateOpen(false); setUserOpen(false); }
    setExploreOpen(open);
  }, []);
  const handleCreateOpenChange = useCallback((open: boolean) => {
    if (open) { setCommunityOpen(false); setExploreOpen(false); setUserOpen(false); }
    setCreateOpen(open);
  }, []);
  const handleUserOpenChange = useCallback((open: boolean) => {
    if (open) { setCommunityOpen(false); setExploreOpen(false); setCreateOpen(false); }
    setUserOpen(open);
  }, []);

  // Self-fetch unread message count if not provided externally
  useEffect(() => {
    if (externalUnreadCount !== undefined) return;
    if (!user) return;
    let cancelled = false;
    import("@/lib/api").then(({ api }) => {
      api.getUnreadMessageCount()
        .then((res) => { if (!cancelled) setInternalUnreadCount(res?.count || 0); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [user, externalUnreadCount]);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    import("@/lib/api").then(({ api }) => {
      api.getUnreadNotificationCount()
        .then((res) => { if (!cancelled) setNotificationUnreadCount(res?.count || 0); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [user]);

  const unreadCount = externalUnreadCount ?? internalUnreadCount;

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  );

  const isActiveGroup = useCallback(
    (items: { href: string }[]) => items.some((item) => isActive(item.href)),
    [isActive]
  );

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    closeAllDropdowns();
  }, [pathname, closeAllDropdowns]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Dropdown classNames — matching V1's exact pattern
  const dropdownClassNames = {
    base: "bg-black/95 backdrop-blur-xl border border-white/10 shadow-xl max-h-[70vh] overflow-y-auto",
  };

  return (
    <>
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Left: Mobile toggle + Brand */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white/55 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center gap-2">
                <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
                  <Hexagon className="w-8 h-8 text-indigo-400" />
                </motion.div>
                <span className="font-bold text-xl text-gradient">NEXUS</span>
              </Link>
            </div>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center min-w-0" aria-label="Main navigation">
              {/* Dashboard */}
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive("/dashboard")
                    ? "bg-indigo-500/12 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                <span>Dashboard</span>
              </Link>

              {/* Community Dropdown */}
              <Dropdown placement="bottom-start" isOpen={communityOpen} onOpenChange={handleCommunityOpenChange} shouldBlockScroll={false}>
                <DropdownTrigger>
                  <button
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all rounded-lg ${
                      isActiveGroup(communityItems)
                        ? "bg-indigo-500/12 text-white"
                        : "text-white/55 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Users className="w-4 h-4" aria-hidden="true" />
                    <span className="mx-0.5">Community</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${communityOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Community navigation"
                  className="min-w-[240px]"
                  classNames={dropdownClassNames}
                  onAction={(key) => { closeAllDropdowns(); window.location.href = String(key); }}
                >
                  {communityItems.map((item) => (
                    <DropdownItem
                      key={item.href}
                      description={item.description}
                      startContent={<item.icon className="w-4 h-4" aria-hidden="true" />}
                      className={isActive(item.href) ? "bg-indigo-500/12" : ""}
                    >
                      {item.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>

              {/* Explore Dropdown */}
              <Dropdown placement="bottom-start" isOpen={exploreOpen} onOpenChange={handleExploreOpenChange} shouldBlockScroll={false}>
                <DropdownTrigger>
                  <button
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all rounded-lg ${
                      isActiveGroup(exploreItems)
                        ? "bg-indigo-500/12 text-white"
                        : "text-white/55 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ListTodo className="w-4 h-4" aria-hidden="true" />
                    <span className="mx-0.5">Explore</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${exploreOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Explore navigation"
                  className="min-w-[240px]"
                  classNames={dropdownClassNames}
                  onAction={(key) => { closeAllDropdowns(); window.location.href = String(key); }}
                >
                  {exploreItems.map((item) => (
                    <DropdownItem
                      key={item.href}
                      description={item.description}
                      startContent={<item.icon className="w-4 h-4" aria-hidden="true" />}
                      className={isActive(item.href) ? "bg-indigo-500/12" : ""}
                    >
                      {item.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>

              {/* Messages */}
              <Link
                href="/messages"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive("/messages")
                    ? "bg-indigo-500/12 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                <span>Messages</span>
                {unreadCount > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Connections */}
              <Link
                href="/connections"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive("/connections")
                    ? "bg-indigo-500/12 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Connections</span>
              </Link>

              {/* Wallet */}
              <Link
                href="/wallet"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive("/wallet")
                    ? "bg-indigo-500/12 text-white"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                <span>Wallet</span>
              </Link>
            </nav>

            {/* Right: User Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <Link
                href="/search"
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-w-[40px] min-h-[40px] rounded-lg text-white/55 hover:text-white hover:bg-white/5 border border-transparent lg:border-white/10 transition-colors"
                aria-label="Search (Ctrl+K)"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span className="hidden lg:inline text-xs text-white/35">Search</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-medium text-white/35">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Link>

              {user ? (
                <>
                  {/* Create Button */}
                  <Dropdown placement="bottom-end" isOpen={createOpen} onOpenChange={handleCreateOpenChange} shouldBlockScroll={false}>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        size="sm"
                        className="hidden sm:flex bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        aria-label="Create new"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Create actions"
                      classNames={dropdownClassNames}
                      onAction={(key) => { closeAllDropdowns(); window.location.href = String(key); }}
                    >
                      {createItems.map((item) => (
                        <DropdownItem key={item.href} startContent={<item.icon className="w-4 h-4" />}>
                          {item.label}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>

                  {/* Notifications */}
                  <Popover placement="bottom-end" shouldBlockScroll={false}>
                    <PopoverTrigger>
                      <button
                        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg text-white/55 hover:text-white hover:bg-white/5 relative transition-colors"
                        aria-label={`Notifications${notificationUnreadCount > 0 ? `, ${notificationUnreadCount} unread` : ""}`}
                      >
                        <Bell className="w-5 h-5" aria-hidden="true" />
                        {notificationUnreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none ring-2 ring-[#0a0a0f]">
                            {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white">
                          Notifications
                          {notificationUnreadCount > 0 && (
                            <span className="ml-2 text-xs font-normal text-white/35">{notificationUnreadCount} unread</span>
                          )}
                        </h3>
                      </div>
                      <div className="py-6 text-center">
                        {notificationUnreadCount > 0 ? (
                          <>
                            <div className="w-8 h-8 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
                              <Bell className="w-4 h-4 text-indigo-400" />
                            </div>
                            <p className="text-sm text-white/80">
                              You have {notificationUnreadCount} unread notification{notificationUnreadCount !== 1 ? "s" : ""}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-2 opacity-40">
                              <CheckCheck className="w-4 h-4 text-white/35" />
                            </div>
                            <p className="text-sm text-white/35">All caught up</p>
                          </>
                        )}
                      </div>
                      <div className="border-t border-white/10 px-4 py-2.5">
                        <Link href="/notifications" className="flex items-center justify-center w-full text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                          View All Notifications
                        </Link>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Admin */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                      aria-label="Admin Panel"
                    >
                      <Shield className="w-5 h-5" aria-hidden="true" />
                    </Link>
                  )}

                  {/* User Dropdown */}
                  <Dropdown placement="bottom-end" isOpen={userOpen} onOpenChange={handleUserOpenChange} shouldBlockScroll={false}>
                    <DropdownTrigger>
                      <AvatarWithFallback
                        as="button"
                        name={`${user.first_name} ${user.last_name}`}
                        size="sm"
                        className="cursor-pointer ring-2 ring-transparent hover:ring-indigo-500/50 transition-all w-8 h-8 sm:w-9 sm:h-9"
                        aria-label={`User menu for ${user.first_name} ${user.last_name}`}
                      />
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="User actions"
                      classNames={{
                        base: "bg-black/95 backdrop-blur-xl border border-white/10 shadow-xl min-w-[220px] max-h-[70vh] overflow-y-auto",
                      }}
                      onAction={(key) => {
                        const k = String(key);
                        if (k === "profile-header") return;
                        if (k === "logout") { onLogout?.(); closeAllDropdowns(); return; }
                        closeAllDropdowns();
                        window.location.href = k;
                      }}
                    >
                      <DropdownSection showDivider>
                        <DropdownItem key="profile-header" className="h-14 gap-2 cursor-default opacity-100" textValue="Profile" isReadOnly>
                          <p className="font-semibold text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-white/50">{user.email}</p>
                        </DropdownItem>
                      </DropdownSection>

                      <DropdownSection showDivider>
                        <DropdownItem key="/profile" startContent={<User className="w-4 h-4" />}>My Profile</DropdownItem>
                        <DropdownItem key="/dashboard" startContent={<LayoutDashboard className="w-4 h-4" />}>Dashboard</DropdownItem>
                        <DropdownItem key="/wallet" startContent={<Wallet className="w-4 h-4" />}>Wallet</DropdownItem>
                        <DropdownItem key="/settings" startContent={<Settings className="w-4 h-4" />}>Settings</DropdownItem>
                      </DropdownSection>

                      <DropdownSection showDivider>
                        <DropdownItem key="/nexus-score" startContent={<TrendingUp className="w-4 h-4" />}>NexusScore</DropdownItem>
                        <DropdownItem key="/reviews" startContent={<Star className="w-4 h-4" />}>My Reviews</DropdownItem>
                        <DropdownItem key="/about" startContent={<Info className="w-4 h-4" />}>About</DropdownItem>
                      </DropdownSection>

                      <DropdownSection>
                        <DropdownItem key="logout" color="danger" startContent={<LogOut className="w-4 h-4" />} className="text-red-500">
                          Log Out
                        </DropdownItem>
                      </DropdownSection>
                    </DropdownMenu>
                  </Dropdown>
                </>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block">
                    <Button variant="light" size="sm" className="text-white/80 hover:text-white">Log In</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer — pushes page content below the fixed header */}
      <div className="h-14 sm:h-16" />

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed top-14 sm:top-16 left-0 right-0 z-40 lg:hidden max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto bg-black/95 backdrop-blur-xl border-b border-white/10 shadow-2xl"
            >
              <div className="max-w-lg mx-auto px-4 py-4 space-y-1">
                {/* User card */}
                {user && (
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors mb-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <AvatarWithFallback name={`${user.first_name} ${user.last_name}`} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-white/35 truncate">{user.email}</p>
                    </div>
                  </Link>
                )}

                <MobileNavLink href="/search" icon={Search} label="Search" isActive={isActive("/search")} onClick={() => setMobileMenuOpen(false)} />
                <MobileNavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" isActive={isActive("/dashboard")} onClick={() => setMobileMenuOpen(false)} />

                <MobileSectionHeader label="Community" />
                {communityItems.map((item) => (
                  <MobileNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={isActive(item.href)} onClick={() => setMobileMenuOpen(false)} />
                ))}

                <MobileSectionHeader label="Explore" />
                {exploreItems.map((item) => (
                  <MobileNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={isActive(item.href)} onClick={() => setMobileMenuOpen(false)} />
                ))}

                <MobileSectionHeader label="Social" />
                <MobileNavLink href="/messages" icon={MessageSquare} label="Messages" isActive={isActive("/messages")} onClick={() => setMobileMenuOpen(false)} badge={unreadCount} />
                <MobileNavLink href="/connections" icon={UserPlus} label="Connections" isActive={isActive("/connections")} onClick={() => setMobileMenuOpen(false)} />
                <MobileNavLink href="/notifications" icon={Bell} label="Notifications" isActive={isActive("/notifications")} onClick={() => setMobileMenuOpen(false)} badge={notificationUnreadCount} />

                <MobileSectionHeader label="Account" />
                <MobileNavLink href="/wallet" icon={Wallet} label="Wallet" isActive={isActive("/wallet")} onClick={() => setMobileMenuOpen(false)} />
                {user && (
                  <>
                    <MobileNavLink href="/profile" icon={User} label="My Profile" isActive={isActive("/profile")} onClick={() => setMobileMenuOpen(false)} />
                    <MobileNavLink href="/settings" icon={Settings} label="Settings" isActive={isActive("/settings")} onClick={() => setMobileMenuOpen(false)} />
                  </>
                )}

                {isAdmin && (
                  <>
                    <MobileSectionHeader label="Admin" />
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </>
                )}

                {user && (
                  <>
                    <MobileSectionHeader label="Create" />
                    {createItems.map((item) => (
                      <MobileNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={false} onClick={() => setMobileMenuOpen(false)} />
                    ))}
                  </>
                )}

                <div className="border-t border-white/10 pt-3 mt-3 space-y-1">
                  <MobileNavLink href="/about" icon={Info} label="About" isActive={isActive("/about")} onClick={() => setMobileMenuOpen(false)} />
                  {user ? (
                    <button
                      onClick={() => { setMobileMenuOpen(false); onLogout?.(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  ) : (
                    <div className="flex gap-2 pt-2">
                      <Link href="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="bordered" className="w-full border-white/10 text-white" size="sm">Log In</Button>
                      </Link>
                      <Link href="/register" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white" size="sm">Sign Up</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileSectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold px-3 pt-3 pb-1">{label}</p>
  );
}

function MobileNavLink({ href, icon: Icon, label, isActive, onClick, badge }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-indigo-500/12 text-white font-medium"
          : "text-white/80 hover:text-white hover:bg-white/5"
      }`}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
