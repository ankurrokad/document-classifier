module.exports = {
  apps: [
    {
      name: 'doc-api',
      script: 'packages/backend/dist/main.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      // Auto-restart on crash
      autorestart: true,
      // Watch for file changes (disabled for production)
      watch: false,
      // Max memory before restart
      max_memory_restart: '500M',
      // Logging
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Merge logs from all instances
      merge_logs: true,
      // Wait for graceful shutdown
      kill_timeout: 5000,
      // Wait time before considering app online
      listen_timeout: 10000,
    },
    {
      name: 'doc-worker',
      script: 'packages/pipeline/dist/worker.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      // Auto-restart on crash
      autorestart: true,
      // Watch for file changes (disabled for production)
      watch: false,
      // Max memory before restart
      max_memory_restart: '500M',
      // Logging
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Merge logs from all instances
      merge_logs: true,
      // Wait for graceful shutdown
      kill_timeout: 5000,
      // Wait time before considering app online
      listen_timeout: 10000,
    },
  ],
};

