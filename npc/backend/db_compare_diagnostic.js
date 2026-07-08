const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

function parseEnv(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] ? match[2].trim() : '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[match[1]] = value;
      }
    });
    return env;
  } catch (e) {
    return null;
  }
}

async function run() {
  const saasEnv = parseEnv('/home/vayunexs/api.mednex.vayunexsolution.com/.env') || parseEnv(path.join(__dirname, '../../backend/.env')) || {};
  const npcEnv = parseEnv('/home/vayunexs/api.sdk.vayunexsolution.com/.env') || parseEnv(path.join(__dirname, '.env')) || {};

  const dbNex = new Sequelize(
    saasEnv.DB_NAME || 'vayunexs_dbnex_db',
    saasEnv.DB_USER || 'vayunexs_dbnex_user',
    saasEnv.DB_PASSWORD || 'yash0072500725',
    {
      host: saasEnv.DB_HOST || '65.108.76.42',
      port: parseInt(saasEnv.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false
    }
  );

  const dbNpc = new Sequelize(
    npcEnv.DB_NAME || 'vayunexs_npc',
    npcEnv.DB_USER || 'vayunexs_npc_usr',
    npcEnv.DB_PASSWORD || '474800725yash',
    {
      host: npcEnv.DB_HOST || '127.0.0.1',
      port: parseInt(npcEnv.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false
    }
  );

  const migrationsDir = path.join(__dirname, 'src/shared/database/migrations');
  let localMigrations = [];
  try {
    if (fs.existsSync(migrationsDir)) {
      localMigrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
    }
  } catch (e) {}

  async function inspectDatabase(db, dbName) {
    const report = {
      connectedDatabase: dbName,
      mysqlVersion: 'Unknown',
      totalTables: 0,
      platTablesCount: 0,
      hasUsersTable: false,
      sequelizeMetaContents: [],
      rowCounts: {},
      schemas: {},
      indexes: {},
      foreignKeys: {}
    };

    try {
      await db.authenticate();
      
      const [[verResult]] = await db.query('SELECT VERSION() as version');
      report.mysqlVersion = verResult.version;

      const [tables] = await db.query('SHOW TABLES');
      const tableNames = tables.map(t => Object.values(t)[0]);
      report.totalTables = tableNames.length;
      report.hasUsersTable = tableNames.includes('users');

      const platTables = tableNames.filter(t => t.startsWith('plat_') || t === 'users');
      report.platTablesCount = platTables.filter(t => t.startsWith('plat_')).length;

      for (const table of platTables) {
        try {
          const [[countResult]] = await db.query(`SELECT COUNT(*) as count FROM \`${table}\``);
          report.rowCounts[table] = countResult.count;
        } catch (e) {
          report.rowCounts[table] = -1;
        }
      }

      try {
        const [meta] = await db.query('SELECT name FROM SequelizeMeta ORDER BY name');
        report.sequelizeMetaContents = meta.map(m => m.name);
      } catch (e) {}

      for (const table of platTables) {
        try {
          const [cols] = await db.query(`DESCRIBE \`${table}\``);
          report.schemas[table] = cols.map(c => ({
            field: c.Field,
            type: c.Type,
            null: c.Null,
            key: c.Key,
            default: c.Default,
            extra: c.Extra
          }));
        } catch (e) {}

        try {
          const [idxs] = await db.query(`SHOW INDEX FROM \`${table}\``);
          report.indexes[table] = idxs.map(i => ({
            name: i.Key_name,
            column: i.Column_name,
            unique: !i.Non_unique
          }));
        } catch (e) {}

        try {
          const [fks] = await db.query(`
            SELECT 
              COLUMN_NAME, 
              CONSTRAINT_NAME, 
              REFERENCED_TABLE_NAME, 
              REFERENCED_COLUMN_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = :dbName 
              AND TABLE_NAME = :table 
              AND REFERENCED_TABLE_NAME IS NOT NULL
          `, { replacements: { dbName, table } });
          report.foreignKeys[table] = fks.map(f => ({
            column: f.COLUMN_NAME,
            constraint: f.CONSTRAINT_NAME,
            refTable: f.REFERENCED_TABLE_NAME,
            refColumn: f.REFERENCED_COLUMN_NAME
          }));
        } catch (e) {}
      }

      return { success: true, data: report };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  const nexResult = await inspectDatabase(dbNex, saasEnv.DB_NAME || 'vayunexs_dbnex_db');
  const npcResult = await inspectDatabase(dbNpc, npcEnv.DB_NAME || 'vayunexs_npc');

  const comparison = {
    localMigrations,
    dbnex_db: nexResult.success ? nexResult.data : { error: nexResult.error },
    npc_db: npcResult.success ? npcResult.data : { error: npcResult.error }
  };

  console.log(JSON.stringify(comparison, null, 2));

  await dbNex.close();
  await dbNpc.close();
}

run().catch(err => {
  console.error("Fatal Error running inspection:", err);
});
