// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import type { ResourceProps } from "@refinedev/core";
import React from "react";
import {
  UserOutlined,
  TeamOutlined,
  BankOutlined,
  ContactsOutlined,
  FileSearchOutlined,
  AppstoreOutlined,
  ReadOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  TrophyOutlined,
  ApiOutlined,
  ScheduleOutlined,
  BellOutlined,
  MailOutlined,
  TranslationOutlined,
  SafetyCertificateOutlined,
  AuditOutlined,
  IdcardOutlined,
  SettingOutlined,
  ToolOutlined,
  NotificationOutlined,
  LockOutlined,
  HeartOutlined,
  BarChartOutlined,
  SearchOutlined,
  SendOutlined,
  QuestionCircleOutlined,
  SafetyOutlined,
  ClusterOutlined,
  GlobalOutlined,
  FlagOutlined,
  SolutionOutlined,
  DesktopOutlined,
} from "@ant-design/icons";

const e = React.createElement;

export const resources: ResourceProps[] = [
  // ─── People ────────────────────────────────────
  {
    name: "users",
    list: "/users",
    show: "/users/:id",
    edit: "/users/:id/edit",
    meta: { label: "Users", icon: e(UserOutlined), parent: "people", apiPath: "/api/admin/users" },
  },
  {
    name: "crm",
    list: "/crm",
    meta: { label: "CRM", icon: e(ContactsOutlined), parent: "people", apiPath: "/api/admin/crm" },
  },
  {
    name: "organisations",
    list: "/organisations",
    meta: { label: "Organisations", icon: e(BankOutlined), parent: "people", apiPath: "/api/admin/organisations" },
  },
  {
    name: "broker",
    list: "/broker",
    meta: { label: "Broker", icon: e(TeamOutlined), parent: "people", apiPath: "/api/admin/broker" },
  },
  {
    name: "saved-searches",
    list: "/saved-searches",
    meta: { label: "Saved Searches", icon: e(SearchOutlined), parent: "people" },
  },
  {
    name: "sub-accounts",
    list: "/sub-accounts",
    meta: { label: "Sub-Accounts", icon: e(UserOutlined), parent: "people" },
  },

  // ─── Content ───────────────────────────────────
  {
    name: "moderation",
    list: "/moderation",
    meta: { label: "Moderation", icon: e(FileSearchOutlined), parent: "content", apiPath: "/api/admin/listings/pending" },
  },
  {
    name: "categories",
    list: "/categories",
    create: "/categories/create",
    edit: "/categories/:id/edit",
    meta: { label: "Categories", icon: e(AppstoreOutlined), parent: "content", apiPath: "/api/admin/categories" },
  },
  {
    name: "blog",
    list: "/blog",
    create: "/blog/create",
    edit: "/blog/:id/edit",
    meta: { label: "Blog", icon: e(ReadOutlined), parent: "content", apiPath: "/api/admin/blog" },
  },
  {
    name: "pages",
    list: "/pages-cms",
    meta: { label: "Pages", icon: e(FileTextOutlined), parent: "content", apiPath: "/api/admin/pages" },
  },
  {
    name: "faq",
    list: "/faq",
    meta: { label: "FAQ", icon: e(QuestionCircleOutlined), parent: "content", apiPath: "/api/faqs" },
  },
  {
    name: "reports",
    list: "/reports",
    meta: { label: "Reports", icon: e(FlagOutlined), parent: "content", apiPath: "/api/admin/reports" },
  },

  // ─── Community ─────────────────────────────────
  {
    name: "events",
    list: "/events",
    meta: { label: "Events", icon: e(CalendarOutlined), parent: "community", apiPath: "/api/admin/events" },
  },
  {
    name: "groups",
    list: "/groups",
    meta: { label: "Groups", icon: e(UsergroupAddOutlined), parent: "community", apiPath: "/api/admin/groups" },
  },
  {
    name: "gamification",
    list: "/gamification",
    meta: { label: "Gamification", icon: e(TrophyOutlined), parent: "community", apiPath: "/api/admin/gamification" },
  },
  {
    name: "matching",
    list: "/matching",
    meta: { label: "Matching", icon: e(ApiOutlined), parent: "community", apiPath: "/api/admin/matching" },
  },
  {
    name: "jobs",
    list: "/jobs",
    meta: { label: "Jobs", icon: e(ScheduleOutlined), parent: "community", apiPath: "/api/admin/jobs" },
  },

  // ─── Communication ─────────────────────────────
  {
    name: "notifications",
    list: "/notifications",
    meta: { label: "Notifications", icon: e(BellOutlined), parent: "communication", apiPath: "/api/admin/notifications" },
  },
  {
    name: "email-templates",
    list: "/email-templates",
    meta: { label: "Email Templates", icon: e(MailOutlined), parent: "communication", apiPath: "/api/admin/emails" },
  },
  {
    name: "translations",
    list: "/translations",
    meta: { label: "Translations", icon: e(TranslationOutlined), parent: "communication", apiPath: "/api/admin/translations" },
  },
  {
    name: "newsletter",
    list: "/newsletter",
    meta: { label: "Newsletter", icon: e(SendOutlined), parent: "communication", apiPath: "/api/admin/newsletter" },
  },

  // ─── Security ──────────────────────────────────
  {
    name: "roles",
    list: "/roles",
    create: "/roles/create",
    edit: "/roles/:id/edit",
    meta: { label: "Roles & Permissions", icon: e(SafetyCertificateOutlined), parent: "security", apiPath: "/api/admin/roles" },
  },
  {
    name: "vetting",
    list: "/vetting",
    meta: { label: "Vetting", icon: e(IdcardOutlined), parent: "security", apiPath: "/api/admin/vetting" },
  },
  {
    name: "audit",
    list: "/audit",
    meta: { label: "Audit Logs", icon: e(AuditOutlined), parent: "security", apiPath: "/api/admin/audit" },
  },
  {
    name: "registration",
    list: "/registration",
    meta: { label: "Registration", icon: e(IdcardOutlined), parent: "security", apiPath: "/api/registration/admin" },
  },

  // ─── System ────────────────────────────────────
  {
    name: "system-settings",
    list: "/system/settings",
    meta: { label: "Settings", icon: e(SettingOutlined), parent: "system", apiPath: "/api/admin/system/settings" },
  },
  {
    name: "tenant-config",
    list: "/system/config",
    meta: { label: "Tenant Config", icon: e(ToolOutlined), parent: "system", apiPath: "/api/admin/config" },
  },
  {
    name: "announcements",
    list: "/system/announcements",
    meta: { label: "Announcements", icon: e(NotificationOutlined), parent: "system", apiPath: "/api/admin/system/announcements" },
  },
  {
    name: "lockdown",
    list: "/system/lockdown",
    meta: { label: "Lockdown", icon: e(LockOutlined), parent: "system", apiPath: "/api/admin/system/lockdown" },
  },
  {
    name: "health",
    list: "/system/health",
    meta: { label: "Health", icon: e(HeartOutlined), parent: "system", apiPath: "/api/admin/system/health" },
  },
  {
    name: "analytics",
    list: "/analytics",
    meta: { label: "Analytics", icon: e(BarChartOutlined), parent: "system", apiPath: "/api/admin/analytics" },
  },
  {
    name: "search-admin",
    list: "/search-admin",
    meta: { label: "Search", icon: e(SearchOutlined), parent: "system", apiPath: "/api/admin/search" },
  },
  {
    name: "gdpr",
    list: "/gdpr",
    meta: { label: "GDPR", icon: e(SafetyOutlined), parent: "system", apiPath: "/api/admin/gdpr" },
  },
  {
    name: "enterprise",
    list: "/enterprise",
    meta: { label: "Enterprise", icon: e(ClusterOutlined), parent: "system", apiPath: "/api/admin/enterprise" },
  },
  {
    name: "federation",
    list: "/federation",
    meta: { label: "Federation", icon: e(GlobalOutlined), parent: "system", apiPath: "/api/admin/system/federation" },
  },
  {
    name: "staffing",
    list: "/staffing",
    meta: { label: "Staffing", icon: e(SolutionOutlined), parent: "system", apiPath: "/api/admin/staffing" },
  },
  {
    name: "sessions",
    list: "/sessions",
    meta: { label: "Sessions", icon: e(DesktopOutlined), parent: "system", apiPath: "/api/admin/sessions" },
  },
];
