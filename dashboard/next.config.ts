import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this dashboard dir. Without it, Next detects the
  // sibling/parent package-lock.json files and may infer a wrong root (e.g. the
  // home directory), emitting a "multiple lockfiles" warning at dev startup.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
