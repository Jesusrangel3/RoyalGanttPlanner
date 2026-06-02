const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const envPath = path.join(__dirname, '.env.local');
const envConfig = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      envConfig[key] = val;
    }
  });
}

const config = {
  user: envConfig.DB_USER || 'sa',
  password: envConfig.DB_PASSWORD,
  server: envConfig.DB_SERVER || 'localhost',
  database: envConfig.DB_DATABASE || 'RoyalGanttPlanner',
  port: parseInt(envConfig.DB_PORT || '1433', 10),
  options: {
    encrypt: envConfig.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  }
};

sql.connect(config).then(pool => {
  return pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Notifications'");
}).then(res => {
  console.log(JSON.stringify(res.recordset, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
