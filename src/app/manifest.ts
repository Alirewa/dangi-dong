import type { MetadataRoute } from 'next';

const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${bp}/`,
    name: 'دنگ‌بندی — تقسیم هزینه گروهی',
    short_name: 'دنگ‌بندی',
    description:
      'تقسیم هزینه‌های مشترک بین دوستان و هم‌خانه‌ای‌ها، با ضریب و تسویه هوشمند. کاملاً آفلاین.',
    start_url: `${bp}/`,
    scope: `${bp}/`,
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    lang: 'fa',
    dir: 'rtl',
    background_color: '#f8fafc',
    theme_color: '#0f766e',
    categories: ['finance', 'productivity', 'utilities'],
    icons: [
      // Separate `any` and `maskable` entries: Chrome deprecates the combined
      // "any maskable" value and renders a badly-cropped Android launcher icon.
      { src: `${bp}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${bp}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: `${bp}/icons/maskable-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${bp}/icons/maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
