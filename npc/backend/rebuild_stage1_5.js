const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');

const envPath = '/home/vayunexs/api.sdk.vayunexsolution.com/.env';
const lockPath = '/home/vayunexs/api.sdk.vayunexsolution.com/tmp/deployment.lock';
const backupPath = '/tmp/backup_vayunexs_npc.sql';

const report = {
  stage1: { title: "STAGE-01: Environment Validation", status: "PENDING", details: {} },
  stage2: { title: "STAGE-02: Deployment Lock", status: "PENDING", details: {} },
  stage3: { title: "STAGE-03: Database Backup", status: "PENDING", details: {} },
  stage4: { title: "STAGE-04: Backup Verification", status: "PENDING", details: {} },
  stage5: { title: "STAGE-05: Safety Audit", status: "PENDING", details: {} }
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
  console.log("=== NPC Clean Rebuild & Audit Script (Stages 1-5) ===");

  // ==========================================
  // STAGE-01: Environment Validation
  // ==========================================
  console.log("\nRunning STAGE-01: Environment Validation...");
  const env = parseEnv(envPath);
  if (!env) {
    report.stage1.status = "FAILED";
    report.stage1.details.error = `.env file not found at expected path: ${envPath}`;
    printReportAndExit();
  }

  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'PORT', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(v => !env[v]);
  
  if (missingVars.length > 0) {
    report.stage1.status = "FAILED";
    report.stage1.details.error = `Missing mandatory env variables: ${missingVars.join(', ')}`;
    printReportAndExit();
  }

  report.stage1.details.parsedVars = requiredVars.filter(v => v !== 'DB_PASSWORD' && v !== 'JWT_SECRET');

  const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT),
    dialect: 'mysql',
    logging: false
  });

  try {
    await sequelize.authenticate();
    report.stage1.status = "SUCCESS";
    report.stage1.details.dbConnection = "SUCCESSFUL";
  } catch (e) {
    report.stage1.status = "FAILED";
    report.stage1.details.error = `Database connection failed: ${e.message}`;
    printReportAndExit();
  }

  // ==========================================
  // STAGE-02: Deployment Lock
  // ==========================================
  console.log("Running STAGE-02: Deployment Lock...");
  try {
    const tmpDir = path.dirname(lockPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    if (fs.existsSync(lockPath)) {
      const existingPid = fs.readFileSync(lockPath, 'utf-8').trim();
      let isRunning = false;
      try {
        process.kill(parseInt(existingPid), 0);
        isRunning = true;
      } catch (e) {}

      if (isRunning) {
        report.stage2.status = "FAILED";
        report.stage2.details.error = `Concurrent deployment detected. Lock file exists with active PID: ${existingPid}`;
        printReportAndExit();
      } else {
        console.log(`Stale lock file found (PID ${existingPid} is not running). Overriding lock.`);
      }
    }

    fs.writeFileSync(lockPath, process.pid.toString(), 'utf-8');
    report.stage2.status = "SUCCESS";
    report.stage2.details.lockAcquired = true;
    report.stage2.details.pid = process.pid;
  } catch (e) {
    report.stage2.status = "FAILED";
    report.stage2.details.error = `Failed to manage lock file: ${e.message}`;
    printReportAndExit();
  }

  // ==========================================
  // STAGE-03: Database Backup
  // ==========================================
  console.log("Running STAGE-03: Database Backup...");
  try {
    // Execute mysqldump safely passing password via env variable to prevent exposure in process lists
    const dumpCmd = `mysqldump -h ${env.DB_HOST} -P ${env.DB_PORT} -u ${env.DB_USER} ${env.DB_NAME} > ${backupPath}`;
    execSync(dumpCmd, {
      env: Object.assign({}, process.env, { MYSQL_PWD: env.DB_PASSWORD })
    });

    report.stage3.status = "SUCCESS";
    report.stage3.details.backupPath = backupPath;
  } catch (e) {
    report.stage3.status = "FAILED";
    report.stage3.details.error = `mysqldump failed: ${e.message}`;
    cleanupLock();
    printReportAndExit();
  }

  // ==========================================
  // STAGE-04: Backup Verification
  // ==========================================
  console.log("Running STAGE-04: Backup Verification...");
  try {
    if (!fs.existsSync(backupPath)) {
      report.stage4.status = "FAILED";
      report.stage4.details.error = "Backup file was not created.";
      cleanupLock();
      printReportAndExit();
    }

    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      report.stage4.status = "FAILED";
      report.stage4.details.error = "Backup file is empty (0 bytes).";
      cleanupLock();
      printReportAndExit();
    }

    // SHA-256 Checksum (FIX-003)
    const fileBuffer = fs.readFileSync(backupPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const sha256 = hashSum.digest('hex');

    // Read first lines
    const lines = fileBuffer.toString('utf-8').split('\n').slice(0, 10);
    const hasHeader = lines.some(l => l.toLowerCase().includes('dump') || l.includes('CREATE TABLE') || l.includes('INSERT INTO'));

    if (!hasHeader) {
      report.stage4.status = "FAILED";
      report.stage4.details.error = "Backup file does not contain valid MySQL dump signature.";
      cleanupLock();
      printReportAndExit();
    }

    report.stage4.status = "SUCCESS";
    report.stage4.details.exists = true;
    report.stage4.details.sizeBytes = stats.size;
    report.stage4.details.sha256 = sha256;
    report.stage4.details.sqlPreview = lines.filter(l => l.trim().length > 0).slice(0, 3);
  } catch (e) {
    report.stage4.status = "FAILED";
    report.stage4.details.error = `Verification failed: ${e.message}`;
    cleanupLock();
    printReportAndExit();
  }

  // ==========================================
  // STAGE-05: Safety Audit
  // ==========================================
  console.log("Running STAGE-05: Safety Audit...");
  try {
    const [tables] = await sequelize.query('SHOW TABLES');
    const tableList = tables.map(t => Object.values(t)[0]);

    const rowCounts = {};
    const targetTables = [
      'plat_tenants', 'users', 'plat_api_keys', 'plat_applications',
      'plat_businesses', 'plat_branches', 'plat_user_sessions', 'plat_refresh_tokens'
    ];

    for (const t of targetTables) {
      if (tableList.includes(t)) {
        const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM \`${t}\``);
        rowCounts[t] = count;
      } else {
        rowCounts[t] = 0;
      }
    }

    const hasProductionTenants = rowCounts.plat_tenants > 0;
    const hasActiveApps = rowCounts.plat_applications > 0;
    const userCount = rowCounts.users;

    let onlyDefaultAdminUser = false;
    if (userCount === 1) {
      const [[user]] = await sequelize.query("SELECT email FROM users LIMIT 1");
      if (user && user.email === 'yashkr4748@gmail.com') {
        onlyDefaultAdminUser = true;
      }
    }

    const safeToRebuild = !hasProductionTenants && !hasActiveApps && (userCount === 0 || onlyDefaultAdminUser);

    report.stage5.status = "SUCCESS";
    report.stage5.details.rowCounts = rowCounts;
    report.stage5.details.safeToRebuild = safeToRebuild;

    if (!safeToRebuild) {
      report.stage5.status = "FAILED";
      report.stage5.details.error = "Production Safety Audit failed: unexpected active data detected.";
      cleanupLock();
      printReportAndExit();
    }

  } catch (e) {
    report.stage5.status = "FAILED";
    report.stage5.details.error = `Safety Audit query failed: ${e.message}`;
    cleanupLock();
    printReportAndExit();
  }

  // Success print
  printReportAndExit();
}

function cleanupLock() {
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch (e) {}
}

function printReportAndExit() {
  console.log("\n=== EXECUTION AUDIT REPORT ===");
  console.log(JSON.stringify(report, null, 2));
  
  const anyFailed = Object.values(report).some(s => s.status === "FAILED");
  if (anyFailed) {
    console.log("\nStatus: ABORTED (One or more validation stages failed)");
    process.exit(1);
  } else {
    console.log("\nStatus: STAGES 1-5 COMPLETED SUCCESSFULLY");
    console.log("Next step: Wait for User Confirmation before destructive operations.");
    process.exit(0);
  }
}

main();
