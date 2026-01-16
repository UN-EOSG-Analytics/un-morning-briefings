import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    images: {
        unoptimized: false
    },
    // Add caching headers for better performance
    onDemandEntries: {
        maxInactiveAge: 60 * 1000, // 60 seconds
        pagesBufferLength: 5,
    }
}

export default nextConfig