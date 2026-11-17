import type { NextConfig } from 'next';

const config: NextConfig = {
  // Local browser checks and users may use the loopback IP instead of localhost.
  // This applies only to Next.js development assets/HMR, not our API origin check.
  allowedDevOrigins: ['127.0.0.1'],
};

export default config;
