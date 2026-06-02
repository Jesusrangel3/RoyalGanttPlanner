const sql = require('mssql');
console.log("typeof sql.NVarChar:", typeof sql.NVarChar);
console.log("sql.NVarChar.validate:", typeof sql.NVarChar.validate);
try {
  const instance = sql.NVarChar();
  console.log("sql.NVarChar() type:", typeof instance);
  console.log("sql.NVarChar().validate type:", typeof instance.validate);
} catch (e) {
  console.log("Error calling sql.NVarChar():", e.message);
}
process.exit(0);
