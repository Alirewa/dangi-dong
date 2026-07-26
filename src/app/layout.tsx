import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreHydrator } from '@/components/layout/StoreHydrator';
import { DocumentAttrs } from '@/components/layout/DocumentAttrs';
import { ToastHost } from '@/components/ui/ToastHost';
import { PwaBootstrap } from '@/components/layout/PwaBootstrap';
import { OnboardingSheet } from '@/components/layout/OnboardingSheet';
import { StarPrompt } from '@/components/layout/StarPrompt';
import { STORAGE_KEY } from '@/lib/storageKey';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'دنگی دنگ | تقسیم هزینه گروهی',
  description:
    'تقسیم هزینه‌های مشترک بین دوستان و هم‌خانه‌ای‌ها، با ضریب و تسویه هوشمند. کاملاً آفلاین و بدون نیاز به حساب کاربری.',
  applicationName: 'دنگی دنگ',
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: 'دنگی دنگ',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {
        url: `${basePath}/icons/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: `${basePath}/icons/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [{ url: `${basePath}/icons/apple-touch-icon-180.png`, sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) to report real values.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f766e' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  // Deliberately no maximumScale / userScalable: factor-saz pins maximumScale
  // to 1, which blocks pinch-zoom. This app targets users of all ages.
};

/**
 * Blocking, before first paint: read the persisted theme and locale and stamp
 * them on <html>. Without this the page renders light-and-LTR and then snaps,
 * which every sibling project does and which looks broken.
 *
 * Reads the zustand persist envelope ({ state, version }) directly, since the
 * store itself is not loaded yet.
 */
const themeInit = `(function(){try{
var raw=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
var st=raw?JSON.parse(raw).state:null;
var s=(st&&st.settings)||{};
var t=s.theme||'system';
var l=s.locale||'fa';
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
if(dark)r.classList.add('dark');
r.lang=l;r.dir=(l==='fa')?'rtl':'ltr';
}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script id="theme-init" dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body suppressHydrationWarning>
        <StoreHydrator />
        <DocumentAttrs />
        <PwaBootstrap />
        {children}
        <OnboardingSheet />
        <StarPrompt />
        <ToastHost />
      </body>
    </html>
  );
}
