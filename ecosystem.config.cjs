module.exports = {
  apps: [
    {
      name: 'vps-monitor-bot',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
