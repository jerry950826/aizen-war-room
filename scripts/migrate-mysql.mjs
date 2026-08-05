import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const sslEnabled = /^(true|required|1)$/i.test(process.env.MYSQL_SSL ?? "");
const sql = await readFile(new URL("../db/mysql/001-war-room.sql", import.meta.url), "utf8");
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  ssl: sslEnabled ? {} : undefined,
  multipleStatements: true,
  charset: "utf8mb4",
});

try {
  await connection.query(sql);
  const [[counts]] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM departments) AS departments,
      (SELECT COUNT(*) FROM members) AS members,
      (SELECT COUNT(*) FROM systems) AS systems,
      (SELECT COUNT(*) FROM member_system_permissions) AS permissions
  `);
  console.log(JSON.stringify({ ok: true, ...counts }));
} finally {
  await connection.end();
}
