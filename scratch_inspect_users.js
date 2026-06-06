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

// Usando la configuración local que conecta vía Trusted Connection o TCP si aplica
// Para conectarse a SQLEXPRESS localmente desde node:
const config = {
  server: envConfig.DB_SERVER || 'localhost',
  database: envConfig.DB_DATABASE || 'RoyalGanttPlanner',
  port: parseInt(envConfig.DB_PORT || '1433', 10),
  options: {
    encrypt: envConfig.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  // Usamos autenticación integrada si no hay usuario
  driver: 'msnodesqlv8'
};

// Si hay usuario/contraseña en .env.local, los agregamos
if (envConfig.DB_USER) {
  config.user = envConfig.DB_USER;
  config.password = envConfig.DB_PASSWORD;
}

// Intentar conectar con mssql o msnodesqlv8
const connectionString = `server=localhost\\SQLEXPRESS;Database=RoyalGanttPlanner;Trusted_Connection=Yes;Driver={ODBC Driver 18 for SQL Server};Encrypt=No;`;

async function main() {
  try {
    const pool = await sql.connect(connectionString);
    const result = await pool.request().query("SELECT * FROM Users");
    console.log("SQL Server Users:");
    console.log(result.recordset);
    pool.close();
  } catch (err) {
    console.error("Error connecting to SQL Server:", err);
  }
}

main();
