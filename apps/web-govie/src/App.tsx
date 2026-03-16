// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { AboutPage } from './pages/AboutPage'
import { BlogPage } from './pages/BlogPage'
import { BlogPostPage } from './pages/BlogPostPage'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { ConversationPage } from './pages/ConversationPage'
import { CookiesPage } from './pages/CookiesPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { CreateGroupPage } from './pages/CreateGroupPage'
import { DashboardPage } from './pages/DashboardPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EventsPage } from './pages/EventsPage'
import { ExchangeDetailPage } from './pages/ExchangeDetailPage'
import { ExchangesPage } from './pages/ExchangesPage'
import { FaqPage } from './pages/FaqPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { FeedPage } from './pages/FeedPage'
import { GamificationPage } from './pages/GamificationPage'
import { GroupDetailPage } from './pages/GroupDetailPage'
import { GroupsPage } from './pages/GroupsPage'
import { HomePage } from './pages/HomePage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { JobsPage } from './pages/JobsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { LoginPage } from './pages/LoginPage'
import { MemberProfilePage } from './pages/MemberProfilePage'
import { MembersPage } from './pages/MembersPage'
import { MessagesPage } from './pages/MessagesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OrganisationDetailPage } from './pages/OrganisationDetailPage'
import { OrganisationsPage } from './pages/OrganisationsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ProfileEditPage } from './pages/ProfileEditPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProposeExchangePage } from './pages/ProposeExchangePage'
import { RegisterPage } from './pages/RegisterPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { SearchPage } from './pages/SearchPage'
import { ServiceDetailPage } from './pages/ServiceDetailPage'
import { ServicesPage } from './pages/ServicesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SubmitServicePage } from './pages/SubmitServicePage'
import { TermsPage } from './pages/TermsPage'
import { TransactionDetailPage } from './pages/TransactionDetailPage'
import { TransferPage } from './pages/TransferPage'
import { WalletPage } from './pages/WalletPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/services/submit"
                element={<ProtectedRoute><SubmitServicePage /></ProtectedRoute>}
              />
              <Route path="/services/:id" element={<ServiceDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/cookies" element={<CookiesPage />} />

              {/* Authenticated community routes */}
              <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
              <Route path="/blog" element={<ProtectedRoute><BlogPage /></ProtectedRoute>} />
              <Route path="/blog/:slug" element={<ProtectedRoute><BlogPostPage /></ProtectedRoute>} />

              {/* Protected community routes */}
              <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
              <Route path="/members/:id" element={<ProtectedRoute><MemberProfilePage /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
              <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
              <Route path="/organisations" element={<ProtectedRoute><OrganisationsPage /></ProtectedRoute>} />
              <Route path="/organisations/:id" element={<ProtectedRoute><OrganisationDetailPage /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
              <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />

              {/* Protected routes */}
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><ProfileEditPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
              <Route path="/wallet/transfer" element={<ProtectedRoute><TransferPage /></ProtectedRoute>} />
              <Route path="/wallet/transactions/:id" element={<ProtectedRoute><TransactionDetailPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/messages/:id" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><ConnectionsPage /></ProtectedRoute>} />
              <Route path="/groups/new" element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
              <Route path="/events/new" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
              <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
              <Route path="/gamification" element={<ProtectedRoute><GamificationPage /></ProtectedRoute>} />
              <Route path="/exchanges" element={<ProtectedRoute><ExchangesPage /></ProtectedRoute>} />
              <Route path="/exchanges/new" element={<ProtectedRoute><ProposeExchangePage /></ProtectedRoute>} />
              <Route path="/exchanges/:id" element={<ProtectedRoute><ExchangeDetailPage /></ProtectedRoute>} />
              <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
