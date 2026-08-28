/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // fully static HTML/JS/CSS in ./out — deployable straight to S3
  images: { unoptimized: true }, // next/image optimization needs a server; not used here anyway
};

module.exports = nextConfig;
