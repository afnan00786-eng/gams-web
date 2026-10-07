/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    cacheOnFrontEndNav: true,
    reloadOnOnline: true,
    fallbacks: {
        document: '/offline.html',
    },
    runtimeCaching: [
        {
            // Match ANY HTML page navigation across all domains (Vercel, custom domain, localhost)
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
                cacheName: 'gams-pages-cache',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 86400 * 30, // 30 days
                },
                networkTimeoutSeconds: 3,
            },
        },
        {
            // Next.js static files and chunks
            urlPattern: /_next\/static\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'gams-next-static',
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 86400 * 30,
                },
            },
        },
        {
            // API responses - NetworkFirst with cache fallback
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'gams-api-cache',
                expiration: {
                    maxEntries: 150,
                    maxAgeSeconds: 86400 * 7,
                },
                networkTimeoutSeconds: 3,
            },
        },
        {
            // Static assets - CacheFirst (never changes)
            urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?)$/,
            handler: 'CacheFirst',
            options: {
                cacheName: 'gams-static-cache',
                expiration: {
                    maxEntries: 250,
                    maxAgeSeconds: 86400 * 30,
                },
            },
        },
    ],
});

const nextConfig = {};

export default pwaConfig(nextConfig);
