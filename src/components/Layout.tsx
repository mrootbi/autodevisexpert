import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import AdSenseScript from './AdSenseScript';
import AdSenseUnit from './AdSenseUnit';
import SiteNavigationJsonLd from './SiteNavigationJsonLd';
import { useSettings } from '../lib/settingsContext';
import { canRenderAdSlot } from '../lib/adsConfig';

export default function Layout() {
  const { pathname, hash } = useLocation();
  const { adsConfig, loading } = useSettings();
  const isAdmin = pathname.startsWith('/mouadbi');
  const showHeaderAd = !isAdmin && !loading && canRenderAdSlot(adsConfig, 'header');

  // Scroll to top on route change, unless we have a hash anchor.
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteNavigationJsonLd />
      <AdSenseScript />
      <Navbar />
      {showHeaderAd && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6 lg:px-8">
          <AdSenseUnit slot="header" placement="header" className="rounded-xl" />
        </div>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
