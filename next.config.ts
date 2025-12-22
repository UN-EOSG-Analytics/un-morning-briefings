import type { NextConfig } from 'next'

// Set to your repository name for GitHub Pages, or '' for custom domain
const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '/un-website-boilerplate') : ''

// NOTE: use basePath variable for Image src 
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images

const nextConfig: NextConfig = {
    output: 'export',
    trailingSlash: true,
    basePath: basePath,
    assetPrefix: basePath,
    reactStrictMode: true,
    poweredByHeader: false,
    images: {
        unoptimized: true
    },
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
}

export default nextConfig