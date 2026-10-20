const path = require('path')

/** @type {import('next').NextConfig} */
module.exports = {
  // Alias '@/...' dipasang eksplisit agar tidak bergantung pada pembacaan tsconfig.json oleh TypeScript
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname)
    return config
  },
}
