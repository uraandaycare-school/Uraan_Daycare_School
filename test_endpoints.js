/**
 * URAAN-WEB-2026: Security & Integration Verification Script
 * Validates:
 * 1. Security Headers (Helmet, Content-Security-Policy, HSTS, Frame Options)
 * 2. Rate Limiting (Brute-force / spam protection yielding HTTP 429)
 * 3. Schema and Input Validation (XSS payload rejection)
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('====================================================');
console.log(' STARTING URAAN SECURITY PORTAL INTEGRATION TESTS...');
console.log('====================================================');

// Spawn the server as a background process on a test port (3002)
const testPort = 3002;
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: testPort, NODE_ENV: 'test' }
});

// Capture server output to detect when it's online
serverProcess.stdout.on('data', (data) => {
  const message = data.toString();
  if (message.includes('LOCAL')) {
    console.log(`[TEST SERVER] Sandbox Server launched on port ${testPort}`);
    runTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[TEST SERVER ERROR] ${data}`);
});

let failedTests = 0;
let passedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[\x1b[32mPASS\x1b[0m] ${message}`);
    passedTests++;
  } else {
    console.error(`[\x1b[31mFAIL\x1b[0m] ${message}`);
    failedTests++;
  }
}

// Helper to send HTTP requests using Node standard http module
function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  try {
    // ----------------------------------------------------
    // TEST 1: Security Headers Verification
    // ----------------------------------------------------
    console.log('\n--- Running Test 1: Security Headers Verification ---');
    const getRes = await request({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/',
      method: 'GET'
    });

    assert(getRes.statusCode === 200, 'Server responded to root page GET request');
    assert(getRes.headers['content-security-policy'] !== undefined, 'CSP Security Header is present');
    assert(getRes.headers['content-security-policy'].includes("https://challenges.cloudflare.com"), 'CSP allows Cloudflare Turnstile');
    assert(getRes.headers['x-frame-options'] === 'SAMEORIGIN', 'Frame options restricted to SAMEORIGIN');
    assert(getRes.headers['x-content-type-options'] === 'nosniff', 'Nosniff headers configured');

    // ----------------------------------------------------
    // TEST 2: Input Validation & XSS Injection Mitigation
    // ----------------------------------------------------
    console.log('\n--- Running Test 2: Input Validation / Injection Rejection ---');
    // Payload with script tags (XSS check) and invalid child age (underage 0 yrs)
    const malformedPayload = {
      childName: '<script>alert("hack")</script>',
      childDob: '2026-06-25', // 0 years old
      program: 'montessori',
      parentName: 'Jane Doe',
      parentPhone: '03001234567',
      parentEmail: 'jane@email.com',
      emergencyContact: '03331234567',
      shift: 'morning',
      captchaToken: '1x00000000000000000000AA' // turnstile sandbox pass token
    };

    const postRes = await request({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/admissions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, malformedPayload);

    assert(postRes.statusCode === 400, 'Server rejected XSS name injection with status 400');
    const parsedBody = JSON.parse(postRes.body);
    assert(parsedBody.success === false, 'Error response flag indicates failure');
    assert(parsedBody.message.includes('Invalid child name'), 'Error message correctly states validation issue');

    // ----------------------------------------------------
    // TEST 3: Rate Limiting Enforcement (Brute Force Block)
    // ----------------------------------------------------
    console.log('\n--- Running Test 3: API Rate Limiter Verification ---');
    console.log('Sending multiple requests to exceed rate limits (Max 5 requests allowed)...');
    
    const contactPayload = {
      name: 'Test Inquirer',
      email: 'test@email.com',
      phone: '03009999999',
      message: 'Hello, please send information package.',
      captchaToken: '1x00000000000000000000AA'
    };

    let rateLimitTriggered = false;
    let hitCount = 0;

    // Send 7 rapid contact inquiries (limit is 5)
    for (let i = 0; i < 7; i++) {
      try {
        const contactRes = await request({
          hostname: '127.0.0.1',
          port: testPort,
          path: '/api/contact',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }, contactPayload);

        hitCount++;
        if (contactRes.statusCode === 429) {
          rateLimitTriggered = true;
          console.log(`[RATE LIMITER] Request #${i+1} successfully blocked with status 429`);
          break;
        }
      } catch (err) {
        console.error(`Request #${i+1} failed to send:`, err.message);
      }
    }

    assert(rateLimitTriggered === true, 'Rate limiter block was triggered correctly');
    assert(hitCount <= 6, 'Spam blocked within the specified threshold limit');

  } catch (error) {
    console.error('Integration tests encountered an error:', error);
    failedTests++;
  } finally {
    // Shutdown the server process safely
    console.log('\n====================================================');
    console.log(` TESTS COMPLETED: ${passedTests} Passed, ${failedTests} Failed.`);
    console.log('====================================================');
    
    serverProcess.kill('SIGINT');
    process.exit(failedTests > 0 ? 1 : 0);
  }
}
