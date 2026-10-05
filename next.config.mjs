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
            // All app pages - StaleWhileRevalidate (serve cache, update in background)
            urlPattern: /^https:\/\/gams-app\.vercel\.app\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'gams-pages-cache',
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 86400 * 7,
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
                    maxEntries: 100,
                    maxAgeSeconds: 86400,
                },
                networkTimeoutSeconds: 5,
            },
        },
        {
            // Static assets - CacheFirst (never changes)
            urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?)$/,
            handler: 'CacheFirst',
            options: {
                cacheName: 'gams-static-cache',
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 86400 * 30,
                },
            },
        },
    ],
});

const nextConfig = {};

export default pwaConfig(nextConfig);
