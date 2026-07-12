'use strict';

async function testHealth(name, url) {
  try {
    console.log(`Testing health for ${name} at ${url}...`);
    const res = await fetch(url);
    const body = await res.text();
    console.log(`- Status: ${res.status}`);
    console.log(`- Response: ${body.substring(0, 150)}`);
  } catch (err) {
    console.error(`✗ Health check failed for ${name}:`, err.message);
  }
}

async function run() {
  console.log('=== Checking Production Servers Reachability ===');

  await testHealth('NPC Backend', 'https://api.sdk.vayunexsolution.com/api/v1/platform/health');
  await testHealth('MedNex Backend', 'https://api.mednex.vayunexsolution.com/api/v1/platform/health');

  process.exit(0);
}

run();
