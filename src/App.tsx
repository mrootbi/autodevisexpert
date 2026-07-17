import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './lib/settingsContext';
import Layout from './components/Layout';
import GoogleAnalytics from './components/GoogleAnalytics';

/** Lightweight pages stay eager for instant first paint. */
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

/** Heavy / secondary routes — code-split for faster mobile TTI. */
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const LegalMentionsPage = lazy(() => import('./pages/LegalMentionsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const CGUPage = lazy(() => import('./pages/CGUPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const DevisAnalysisPage = lazy(() => import('./pages/DevisAnalysisPage'));
const DevisAnalysesIndexPage = lazy(() => import('./pages/DevisAnalysesIndexPage'));
const SitemapPage = lazy(() => import('./pages/SitemapPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-16" role="status" aria-live="polite">
      <p className="text-sm text-slate-500">Chargement…</p>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <GoogleAnalytics />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/sitemap.xml" element={<SitemapPage />} />

            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<ArticlePage />} />
              <Route path="/devis-analyses" element={<DevisAnalysesIndexPage />} />
              <Route path="/devis-analyses/:pathSlug" element={<DevisAnalysisPage />} />
              <Route path="/mentions-legales" element={<LegalMentionsPage />} />
              <Route path="/politique-de-confidentialite" element={<PrivacyPage />} />
              <Route path="/cgu" element={<CGUPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/mouadbi" element={<AdminPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </SettingsProvider>
  );
}
