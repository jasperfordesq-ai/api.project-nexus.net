// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

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
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/cookies" element={<CookiesPage />} />

              {/* Public community routes */}
              <Route path="/members" element={<MembersPage />} />
              <Route path="/members/:id" element={<MemberProfilePage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:id" element={<GroupDetailPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/organisations" element={<OrganisationsPage />} />
              <Route path="/organisations/:id" element={<OrganisationDetailPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />

              {/* Protected routes */}
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
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
