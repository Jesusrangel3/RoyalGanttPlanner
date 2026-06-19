module.exports = {
  apps: [
    {
      name: 'royal-gantt-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      cwd: 'c:\\PROGRAMAS\\RoyalGanttPlanner\\ganttpro-proyecto',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 3000,
      out_file: 'c:\\PROGRAMAS\\RoyalGanttPlanner\\logs\\app-out.log',
      error_file: 'c:\\PROGRAMAS\\RoyalGanttPlanner\\logs\\app-err.log',
      time: true,
    },
    {
      name: 'royal-gantt-socket',
      script: 'socket-server.js',
      cwd: 'c:\\PROGRAMAS\\RoyalGanttPlanner\\ganttpro-proyecto',
      env: {
        NODE_ENV: 'development',
        SOCKET_PORT: 3001,
        SOCKET_ALLOWED_ORIGINS: 'http://localhost:3000',
      },
      watch: false,
      max_memory_restart: '200M',
      restart_delay: 3000,
      out_file: 'c:\\PROGRAMAS\\RoyalGanttPlanner\\logs\\socket-out.log',
      error_file: 'c:\\PROGRAMAS\\RoyalGanttPlanner\\logs\\socket-err.log',
      time: true,
    },
  ],
};
