"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navbar as HeroNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { motion } from "framer-motion";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [internalUnreadCount, setInternalUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const pathname = usePathname();

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

  // Fetch unread notification count separately
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

  // Check if a route is active
  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  );

  // Check if any item in a dropdown is active
  const isDropdownActive = useCallback(
    (items: { href: string }[]) => items.some((item) => isActive(item.href)),
    [isActive]
  );

  // Close mobile menu when navigating
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <HeroNavbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="bg-white/5 backdrop-blur-xl border-b border-white/10"
      maxWidth="full"
      height="4rem"
    >
      {/* Mobile Menu Toggle */}
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="text-white"
        />
      </NavbarContent>

      {/* Brand */}
      <NavbarContent justify="start">
        <NavbarBrand as={Link} href="/" className="gap-2">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
          >
            <Hexagon className="w-8 h-8 text-indigo-400" />
          </motion.div>
          <span className="font-bold text-xl text-gradient">NEXUS</span>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Navigation */}
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {/* Dashboard - Direct Link */}
        <NavbarItem isActive={isActive("/dashboard")}>
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 transition-colors ${
              isActive("/dashboard") ? "text-white font-medium" : "text-white/70 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </NavbarItem>

        {/* Community Dropdown */}
        <Dropdown>
          <NavbarItem isActive={isDropdownActive(communityItems)}>
            <DropdownTrigger>
              <Button
                variant="light"
                className={`transition-colors p-0 min-w-0 h-auto bg-transparent data-[hover=true]:bg-transparent ${
                  isDropdownActive(communityItems) ? "text-white font-medium" : "text-white/70 hover:text-white"
                }`}
                endContent={<ChevronDown className="w-3 h-3" />}
              >
                <Users className="w-4 h-4 mr-2" />
                Community
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu
            aria-label="Community features"
            className="w-[240px] bg-black/90 backdrop-blur-xl border border-white/10"
            itemClasses={{
              base: "gap-4",
            }}
          >
            {communityItems.map((item) => (
              <DropdownItem
                key={item.href}
                as={Link}
                href={item.href}
                description={item.description}
                startContent={<item.icon className="w-5 h-5 text-indigo-400" />}
                className="text-white/80 hover:text-white"
              >
                {item.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        {/* Explore Dropdown */}
        <Dropdown>
          <NavbarItem isActive={isDropdownActive(exploreItems)}>
            <DropdownTrigger>
              <Button
                variant="light"
                className={`transition-colors p-0 min-w-0 h-auto bg-transparent data-[hover=true]:bg-transparent ${
                  isDropdownActive(exploreItems) ? "text-white font-medium" : "text-white/70 hover:text-white"
                }`}
                endContent={<ChevronDown className="w-3 h-3" />}
              >
                <ListTodo className="w-4 h-4 mr-2" />
                Explore
              </Button>
            </DropdownTrigger>
          </NavbarItem>
          <DropdownMenu
            aria-label="Explore features"
            className="w-[240px] bg-black/90 backdrop-blur-xl border border-white/10"
            itemClasses={{
              base: "gap-4",
            }}
          >
            {exploreItems.map((item) => (
              <DropdownItem
                key={item.href}
                as={Link}
                href={item.href}
                description={item.description}
                startContent={<item.icon className="w-5 h-5 text-purple-400" />}
                className="text-white/80 hover:text-white"
              >
                {item.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        {/* Messages - Direct Link with Badge */}
        <NavbarItem isActive={isActive("/messages")}>
          <Link
            href="/messages"
            className={`flex items-center gap-2 transition-colors ${
              isActive("/messages") ? "text-white font-medium" : "text-white/70 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages</span>
            {unreadCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[18px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </NavbarItem>

        {/* Connections - Direct Link */}
        <NavbarItem isActive={isActive("/connections")}>
          <Link
            href="/connections"
            className={`flex items-center gap-2 transition-colors ${
              isActive("/connections") ? "text-white font-medium" : "text-white/70 hover:text-white"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Connections</span>
          </Link>
        </NavbarItem>

        {/* Wallet - Direct Link */}
        <NavbarItem isActive={isActive("/wallet")}>
          <Link
            href="/wallet"
            className={`flex items-center gap-2 transition-colors ${
              isActive("/wallet") ? "text-white font-medium" : "text-white/70 hover:text-white"
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallet</span>
          </Link>
        </NavbarItem>
      </NavbarContent>

      {/* User Actions */}
      <NavbarContent justify="end">
        {/* Language Switcher - always visible */}
        <NavbarItem className="hidden sm:flex">
          <LanguageSwitcher />
        </NavbarItem>

        {user ? (
          <>
            {/* Search */}
            <NavbarItem className="hidden sm:flex">
              <Link href="/search">
                <Button
                  isIconOnly
                  variant="light"
                  className="text-white/70 hover:text-white"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" aria-hidden="true" />
                </Button>
              </Link>
            </NavbarItem>

            {/* Create Dropdown */}
            <Dropdown placement="bottom-end">
              <NavbarItem className="hidden sm:flex">
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    aria-label="Create new"
                  >
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </DropdownTrigger>
              </NavbarItem>
              <DropdownMenu
                aria-label="Create options"
                className="bg-black/90 backdrop-blur-xl border border-white/10"
              >
                {createItems.map((item) => (
                  <DropdownItem
                    key={item.href}
                    as={Link}
                    href={item.href}
                    startContent={<item.icon className="w-4 h-4 text-indigo-400" />}
                    className="text-white/80 hover:text-white"
                  >
                    {item.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>

            {/* Notifications */}
            <NavbarItem className="hidden sm:flex">
              <Link href="/notifications">
                <Button
                  isIconOnly
                  variant="light"
                  className="text-white/70 hover:text-white relative"
                  aria-label={`Notifications${notificationUnreadCount > 0 ? `, ${notificationUnreadCount} unread` : ""}`}
                >
                  <Bell className="w-5 h-5" aria-hidden="true" />
                  {notificationUnreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full"
                      aria-hidden="true"
                    >
                      {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            </NavbarItem>

            {/* Admin Link (only for admins) */}
            {(user.role === "admin" || user.role === "super_admin") && (
              <NavbarItem className="hidden sm:flex">
                <Link href="/admin">
                  <Button
                    isIconOnly
                    variant="light"
                    className="text-amber-400 hover:text-amber-300"
                    aria-label="Admin Panel"
                  >
                    <Shield className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </Link>
              </NavbarItem>
            )}

            {/* User Dropdown */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <AvatarWithFallback
                  as="button"
                  name={`${user.first_name} ${user.last_name}`}
                  size="sm"
                  className="transition-transform cursor-pointer ring-2 ring-white/20 hover:ring-indigo-500/50"
                  aria-label={`User menu for ${user.first_name} ${user.last_name}`}
                />
              </DropdownTrigger>
              <DropdownMenu
                aria-label="User actions"
                className="bg-black/80 backdrop-blur-xl border border-white/10"
              >
                <DropdownItem
                  key="profile"
                  className="h-14 gap-2"
                  textValue="Profile"
                >
                  <p className="font-semibold text-white">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-sm text-white/50">{user.email}</p>
                </DropdownItem>
                <DropdownItem
                  key="my-profile"
                  as={Link}
                  href="/profile"
                  startContent={<User className="w-4 h-4" />}
                  className="text-white/80 hover:text-white"
                >
                  My Profile
                </DropdownItem>
                <DropdownItem
                  key="dashboard"
                  as={Link}
                  href="/dashboard"
                  startContent={<LayoutDashboard className="w-4 h-4" />}
                  className="text-white/80 hover:text-white"
                >
                  Dashboard
                </DropdownItem>
                <DropdownItem
                  key="settings"
                  as={Link}
                  href="/settings"
                  startContent={<Settings className="w-4 h-4" />}
                  className="text-white/80 hover:text-white"
                >
                  Settings
                </DropdownItem>
                <DropdownItem
                  key="nexus-score"
                  as={Link}
                  href="/nexus-score"
                  startContent={<TrendingUp className="w-4 h-4" />}
                  className="text-white/80 hover:text-white"
                >
                  NexusScore
                </DropdownItem>
                <DropdownItem
                  key="reviews"
                  as={Link}
                  href="/reviews"
                  startContent={<Star className="w-4 h-4" />}
                  className="text-white/80 hover:text-white"
                >
                  My Reviews
                </DropdownItem>
                <DropdownItem
                  key="about"
                  as={Link}
                  href="/about"
                  startContent={<Info className="w-4 h-4" />}
                  className="text-white/80 hover:text-white"
                >
                  About
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={<LogOut className="w-4 h-4" />}
                  onPress={onLogout}
                  className="text-red-400"
                >
                  Log Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        ) : (
          <>
            <NavbarItem className="hidden sm:flex">
              <Link href="/login">
                <Button variant="light" className="text-white/80 hover:text-white">
                  Log In
                </Button>
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link href="/register">
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium"
                >
                  Sign Up
                </Button>
              </Link>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-black/90 backdrop-blur-xl pt-6 overflow-y-auto">
        {/* Main Navigation */}
        <NavbarMenuItem>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0 }}
          >
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                isActive("/dashboard") ? "text-white font-medium" : "text-white/80 hover:text-white"
              }`}
              onClick={closeMenu}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </motion.div>
        </NavbarMenuItem>

        {/* Search */}
        <NavbarMenuItem>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Link
              href="/search"
              className="flex items-center gap-3 w-full py-3 text-lg text-white/80 hover:text-white transition-colors"
              onClick={closeMenu}
            >
              <Search className="w-5 h-5" />
              <span>Search</span>
            </Link>
          </motion.div>
        </NavbarMenuItem>

        {/* Community Section */}
        <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Community</p>
        </NavbarMenuItem>
        {communityItems.map((item, index) => (
          <NavbarMenuItem key={item.href}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                  isActive(item.href) ? "text-white font-medium" : "text-white/80 hover:text-white"
                }`}
                onClick={closeMenu}
              >
                <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-indigo-300" : "text-indigo-400"}`} />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          </NavbarMenuItem>
        ))}

        {/* Explore Section */}
        <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Explore</p>
        </NavbarMenuItem>
        {exploreItems.map((item, index) => (
          <NavbarMenuItem key={item.href}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                  isActive(item.href) ? "text-white font-medium" : "text-white/80 hover:text-white"
                }`}
                onClick={closeMenu}
              >
                <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-purple-300" : "text-purple-400"}`} />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          </NavbarMenuItem>
        ))}

        {/* Social Section */}
        <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Social</p>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/messages"
              className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                isActive("/messages") ? "text-white font-medium" : "text-white/80 hover:text-white"
              }`}
              onClick={closeMenu}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Messages</span>
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[18px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </motion.div>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Link
              href="/connections"
              className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                isActive("/connections") ? "text-white font-medium" : "text-white/80 hover:text-white"
              }`}
              onClick={closeMenu}
            >
              <UserPlus className="w-5 h-5" />
              <span>Connections</span>
            </Link>
          </motion.div>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              href="/notifications"
              className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                isActive("/notifications") ? "text-white font-medium" : "text-white/80 hover:text-white"
              }`}
              onClick={closeMenu}
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
              {notificationUnreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[18px]">
                  {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                </span>
              )}
            </Link>
          </motion.div>
        </NavbarMenuItem>

        {/* Account Section */}
        <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Account</p>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Link
              href="/wallet"
              className={`flex items-center gap-3 w-full py-3 text-lg transition-colors ${
                isActive("/wallet") ? "text-white font-medium" : "text-white/80 hover:text-white"
              }`}
              onClick={closeMenu}
            >
              <Wallet className="w-5 h-5" />
              <span>Wallet</span>
            </Link>
          </motion.div>
        </NavbarMenuItem>
        {user && (
          <>
            <NavbarMenuItem>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Link
                  href="/profile"
                  className="flex items-center gap-3 w-full py-3 text-lg text-white/80 hover:text-white transition-colors"
                  onClick={closeMenu}
                >
                  <User className="w-5 h-5" />
                  <span>My Profile</span>
                </Link>
              </motion.div>
            </NavbarMenuItem>
            <NavbarMenuItem>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 }}
              >
                <Link
                  href="/settings"
                  className="flex items-center gap-3 w-full py-3 text-lg text-white/80 hover:text-white transition-colors"
                  onClick={closeMenu}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </motion.div>
            </NavbarMenuItem>
          </>
        )}

        {/* Admin Link (mobile) */}
        {(user?.role === "admin" || user?.role === "super_admin") && (
          <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link
                href="/admin"
                className="flex items-center gap-3 w-full py-3 text-lg text-amber-400 hover:text-amber-300 transition-colors"
                onClick={closeMenu}
              >
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </Link>
            </motion.div>
          </NavbarMenuItem>
        )}

        {/* Create Section (mobile) */}
        {user && (
          <>
            <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Create</p>
            </NavbarMenuItem>
            {createItems.map((item, index) => (
              <NavbarMenuItem key={item.href}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 w-full py-3 text-lg text-white/80 hover:text-white transition-colors"
                    onClick={closeMenu}
                  >
                    <item.icon className="w-5 h-5 text-indigo-400" />
                    <span>{item.label}</span>
                  </Link>
                </motion.div>
              </NavbarMenuItem>
            ))}
          </>
        )}

        {/* Login (if not authenticated) */}
        {!user && (
          <NavbarMenuItem className="mt-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href="/login"
                className="block w-full py-3 text-lg text-white/80 hover:text-white transition-colors"
                onClick={closeMenu}
              >
                Log In
              </Link>
            </motion.div>
          </NavbarMenuItem>
        )}

        {/* About */}
        <NavbarMenuItem className="mt-4 border-t border-white/10 pt-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Link
              href="/about"
              className="flex items-center gap-3 w-full py-3 text-lg text-white/60 hover:text-white transition-colors"
              onClick={closeMenu}
            >
              <Info className="w-5 h-5" />
              <span>About</span>
            </Link>
          </motion.div>
        </NavbarMenuItem>
      </NavbarMenu>
    </HeroNavbar>
  );
}
