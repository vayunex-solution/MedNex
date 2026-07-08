const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');

const envPath = '/home/vayunexs/api.sdk.vayunexsolution.com/.env';
const lockPath = '/home/vayunexs/api.sdk.vayunexsolution.com/tmp/deployment.lock';
const migrationsDir = '/home/vayunexs/api.sdk.vayunexsolution.com/src/shared/database/migrations';

const seqConfigPath = '/tmp/seq_config.json';
const inventoryPath = '/home/vayunexs/api.sdk.vayunexsolution.com/migration_inventory.md';
const migrationReportPath = '/home/vayunexs/api.sdk.vayunexsolution.com/migration_report.md';
const rollbackReportPath = '/home/vayunexs/api.sdk.vayunexsolution.com/rollback_report.md';
const schemaDiffPath = '/home/vayunexs/api.sdk.vayunexsolution.com/schema_diff.md';
const fingerprintPath = '/home/vayunexs/api.sdk.vayunexsolution.com/schema_fingerprint.json';

const report = {
  preCheck: { status: "PENDING", details: {} },
  stage6: { status: "PENDING", details: {} },
  stage7: { status: "PENDING", details: {} },
  rollback: { status: "PENDING", details: {} }
};

function parseEnv(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.trim().match(/^([\w.-]+)\s*=\s*(.*)?\s*$/);
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

async function main() {
  console.log("=== NPC Clean Rebuild & Audit Script (Stages 6-7) ===");

  const env = parseEnv(envPath);
  if (!env) {
    console.error("Error: .env not found.");
    process.exit(1);
  }

  const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT),
    dialect: 'mysql',
    logging: false
  });

  // ==========================================
  // PRE-CHECK: Migration Inventory
  // ==========================================
  console.log("\nRunning PRE-CHECK: Migration Inventory...");
  try {
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
    
    // Check duplicate timestamps
    const timestamps = migrationFiles.map(f => f.split('-')[0]);
    const duplicateTimestamps = timestamps.filter((item, index) => timestamps.indexOf(item) !== index);
    if (duplicateTimestamps.length > 0) {
      report.preCheck.status = "FAILED";
      report.preCheck.details.error = `Duplicate migration timestamps detected: ${duplicateTimestamps.join(', ')}`;
      printReportAndExit(false);
    }

    // Get current SequelizeMeta
    let currentMeta = [];
    try {
      const [meta] = await sequelize.query('SELECT name FROM SequelizeMeta ORDER BY name');
      currentMeta = meta.map(m => m.name);
    } catch (e) {
      console.log("SequelizeMeta table not found (this is normal if first run failed).");
    }

    const inventory = migrationFiles.map(file => {
      const executed = currentMeta.includes(file);
      return {
        file,
        status: executed ? "EXECUTED" : "PENDING"
      };
    });

    const missing = migrationFiles.filter(f => !currentMeta.includes(f));
    const extraInDb = currentMeta.filter(f => !migrationFiles.includes(f));

    // Write migration_inventory.md
    let inventoryMd = `# Migration Inventory\n\n`;
    inventoryMd += `| Migration Filename | Status |\n| --- | --- |\n`;
    inventory.forEach(i => {
      inventoryMd += `| ${i.file} | ${i.status} |\n`;
    });
    inventoryMd += `\n- **Total Local Migrations:** ${migrationFiles.length}\n`;
    inventoryMd += `- **Total Registered in DB:** ${currentMeta.length}\n`;
    inventoryMd += `- **Missing Migrations:** ${missing.length}\n`;
    inventoryMd += `- **Extra Registered (Not found in filesystem):** ${extraInDb.length}\n`;
    inventoryMd += `- **Execution Order:**\n`;
    migrationFiles.forEach((f, idx) => {
      inventoryMd += `  ${idx + 1}. ${f}\n`;
    });

    fs.writeFileSync(inventoryPath, inventoryMd, 'utf-8');

    report.preCheck.status = "SUCCESS";
    report.preCheck.details.totalFiles = migrationFiles.length;
    report.preCheck.details.missingCount = missing.length;
  } catch (e) {
    report.preCheck.status = "FAILED";
    report.preCheck.details.error = `Precheck failed: ${e.message}`;
    printReportAndExit(false);
  }

  // ==========================================
  // STAGE-06: Safe Table Cleanup
  // ==========================================
  console.log("Running STAGE-06: Safe Table Cleanup...");
  try {
    // Acquire lock
    fs.writeFileSync(lockPath, process.pid.toString(), 'utf-8');

    // Drop tables except preserved
    const [tables] = await sequelize.query('SHOW TABLES');
    const tableList = tables.map(t => Object.values(t)[0]);

    const preserved = ['users', 'plat_roles', 'plat_permissions', 'plat_role_permissions'];
    const toDrop = tableList.filter(t => !preserved.includes(t) && (t.startsWith('plat_') || t === 'SequelizeMeta'));

    console.log(`Dropping ${toDrop.length} tables, keeping: ${preserved.join(', ')}`);
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    for (const table of toDrop) {
      await sequelize.query(`DROP TABLE IF EXISTS \`${table}\`;`);
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    const [remainingTables] = await sequelize.query('SHOW TABLES');
    const remainingList = remainingTables.map(t => Object.values(t)[0]);

    report.stage6.status = "SUCCESS";
    report.stage6.details.dropped = toDrop;
    report.stage6.details.remaining = remainingList;
  } catch (e) {
    report.stage6.status = "FAILED";
    report.stage6.details.error = `Cleanup failed: ${e.message}`;
    cleanupLock();
    printReportAndExit(false);
  }

  // ==========================================
  // STAGE-07: Migration Execution
  // ==========================================
  console.log("Running STAGE-07: Migration Execution...");
  const migrationLog = [];
  try {
    // Run CLI migrations
    const migrateCmd = `npx sequelize-cli db:migrate --config ${seqConfigPath} --migrations-path ${migrationsDir}`;
    const output = execSync(migrateCmd, {
      env: Object.assign({}, process.env, { NODE_ENV: 'production' })
    }).toString();

    migrationLog.push(output);

    // Verify after migrations
    const [meta] = await sequelize.query('SELECT name FROM SequelizeMeta ORDER BY name');
    const executedMeta = meta.map(m => m.name);

    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();
    const allRegistered = migrationFiles.every(f => executedMeta.includes(f));

    if (!allRegistered) {
      report.stage7.status = "FAILED";
      report.stage7.details.error = "Not all migrations are registered in SequelizeMeta after run.";
      report.stage7.details.registered = executedMeta;
      cleanupLock();
      printReportAndExit(false);
    }

    report.stage7.status = "SUCCESS";
    report.stage7.details.registered = executedMeta;
  } catch (e) {
    report.stage7.status = "FAILED";
    report.stage7.details.error = `Migration execution failed: ${e.message}`;
    cleanupLock();
    printReportAndExit(false);
  }

  // ==========================================
  // ROLLBACK VALIDATION
  // ==========================================
  console.log("Running ROLLBACK VALIDATION...");
  try {
    async function getFingerprint() {
      const [tables] = await sequelize.query('SHOW TABLES');
      const tableNames = tables.map(t => Object.values(t)[0]).filter(t => t.startsWith('plat_') || t === 'users').sort();
      const schema = {};
      for (const t of tableNames) {
        const [cols] = await sequelize.query(`DESCRIBE \`${t}\``);
        schema[t] = cols.map(c => `${c.Field}:${c.Type}:${c.Null}`);
      }
      return schema;
    }

    // 1. Fingerprint before rollback
    const fpBefore = await getFingerprint();

    // 2. Undo latest migration
    const undoCmd = `npx sequelize-cli db:migrate:undo --config ${seqConfigPath} --migrations-path ${migrationsDir}`;
    const undoOutput = execSync(undoCmd, {
      env: Object.assign({}, process.env, { NODE_ENV: 'production' })
    }).toString();

    // 3. Fingerprint after undo
    const fpUndo = await getFingerprint();

    // 4. Redo migration
    const redoCmd = `npx sequelize-cli db:migrate --config ${seqConfigPath} --migrations-path ${migrationsDir}`;
    const redoOutput = execSync(redoCmd, {
      env: Object.assign({}, process.env, { NODE_ENV: 'production' })
    }).toString();

    // 5. Fingerprint after redo
    const fpAfter = await getFingerprint();

    // Verify schema unchanged
    const match = JSON.stringify(fpBefore) === JSON.stringify(fpAfter);
    const undoWorked = JSON.stringify(fpBefore) !== JSON.stringify(fpUndo);

    if (!match) {
      report.rollback.status = "FAILED";
      report.rollback.details.error = "Fingerprints before and after rollback cycle do not match!";
      cleanupLock();
      printReportAndExit(false);
    }

    if (!undoWorked) {
      report.rollback.status = "FAILED";
      report.rollback.details.error = "Rollback (undo) command did not modify the schema structure.";
      cleanupLock();
      printReportAndExit(false);
    }

    fs.writeFileSync(fingerprintPath, JSON.stringify(fpAfter, null, 2), 'utf-8');

    // Write reports
    fs.writeFileSync(migrationReportPath, `# Migration Report\n\nExecution Log:\n\`\`\`\n${migrationLog.join('\n')}\n\`\`\`\n`, 'utf-8');
    fs.writeFileSync(rollbackReportPath, `# Rollback Validation Report\n\nUndo Log:\n\`\`\`\n${undoOutput}\n\`\`\`\n\nRedo Log:\n\`\`\`\n${redoOutput}\n\`\`\`\n`, 'utf-8');
    fs.writeFileSync(schemaDiffPath, `# Schema Diff Report\n\nNo mismatch detected. Schemas match fingerprint perfectly.\n`, 'utf-8');

    report.rollback.status = "SUCCESS";
    report.rollback.details.matched = true;
  } catch (e) {
    report.rollback.status = "FAILED";
    report.rollback.details.error = `Rollback validation cycle failed: ${e.message}`;
    cleanupLock();
    printReportAndExit(false);
  }

  cleanupLock();
  printReportAndExit(true);
}

function cleanupLock() {
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (e) {}
}

function printReportAndExit(allPass) {
  console.log("\n=== EXECUTION AUDIT REPORT ===");
  console.log(JSON.stringify(report, null, 2));
  
  if (allPass) {
    console.log("\nREADY_FOR_STAGE_08=true");
    process.exit(0);
  } else {
    console.log("\nREADY_FOR_STAGE_08=false");
    process.exit(1);
  }
}

main();
