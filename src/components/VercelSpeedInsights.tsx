'use client';

import Script from 'next/script';

export const VercelSpeedInsights = () => (
  <Script
    id="vercel-speed-insights"
    src="/_vercel/speed-insights/script.js"
    strategy="afterInteractive"
  />
);
