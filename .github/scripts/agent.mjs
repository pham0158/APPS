#!/usr/bin/env node
// agent.mjs — Auto-diagnose failed routes, open a fix PR, and send email notification.
// Triggered by monitor.yml when health checks fail.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const {
  FAILED_ROUTES,
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  EMAILJS_SERVICE_ID,
} = process.env;

if (!FAILED_ROUTES || !ANTHROPIC_API_KEY || !GITHUB_TOKEN || !EMAILJS_SERVICE_ID) {
  console.error('Missing required env vars: FAILED_ROUTES, ANTHROPIC_API_KEY, GITHUB_TOKEN, EMAILJS_SERVICE_ID');
  process.exit(1);
}

// Step 1: Read homepage.html for context
console.log('✅ Step 1: Reading environment variables');
let homepageHtml = '';
try {
  homepageHtml = readFileSync('homepage.html', 'utf8');
  console.log('✅ Step 2: Read homepage.html successfully');
} catch (err) {
  console.warn('⚠️  Step 2: Could not read homepage.html:', err.message);
}

// Step 3: Call Claude API
console.log('⏳ Step 3: Calling Claude API...');
const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `The following routes are failing health checks:\n${FAILED_ROUTES}\n\nHomepage source (homepage.html):\n${homepageHtml}\n\nAnalyze the failed routes and return ONLY valid JSON with no markdown fences, no explanation — just raw JSON with exactly these fields:\n{\n  "diagnosis": "<short explanation of likely cause>",\n  "fix_file": "<relative file path to fix, e.g. homepage.html>",\n  "fix_content": "<full corrected file content>",\n  "pr_title": "<short PR title>",\n  "pr_body": "<PR description with diagnosis and fix summary>"\n}`,
      },
    ],
  }),
});

const anthropicData = await anthropicRes.json();
const rawContent = anthropicData?.content?.[0]?.text ?? '';
console.log('✅ Step 3: Claude responded');

// Step 4: Strip ```json fences and parse
let parsed;
try {
  const stripped = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  parsed = JSON.parse(stripped);
  console.log('✅ Step 4: Claude JSON parsed successfully');
} catch (err) {
  console.error('❌ Step 4: Failed to parse Claude response as JSON');
  console.error('Raw response:', rawContent);
  process.exit(1);
}

const { diagnosis, fix_file, fix_content, pr_title, pr_body } = parsed;

// Step 5: Create git branch
const branch = `auto-fix/${Date.now()}`;
execSync(`git config user.email "bot@gogreenvue.com"`);
execSync(`git config user.name "GoGreenVue Bot"`);
execSync(`git checkout -b ${branch}`);
console.log(`✅ Step 5: Created branch ${branch}`);

// Step 6: Write fix to file
writeFileSync(fix_file, fix_content, 'utf8');
console.log(`✅ Step 6: Wrote fix to ${fix_file}`);

// Step 7: git add, commit, push
execSync(`git add ${fix_file}`);
execSync(`git commit -m "${pr_title.replace(/"/g, "'")}"`);
execSync(`git push origin ${branch}`);
console.log(`✅ Step 7: Committed and pushed branch ${branch}`);

// Step 8: Open GitHub PR
console.log('⏳ Step 8: Opening GitHub PR...');
const prRes = await fetch('https://api.github.com/repos/pham0158/APPS/pulls', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'authorization': `Bearer ${GITHUB_TOKEN}`,
    'accept': 'application/vnd.github+json',
  },
  body: JSON.stringify({
    title: pr_title,
    body: pr_body,
    head: branch,
    base: 'main',
  }),
});

const prData = await prRes.json();
const prUrl = prData?.html_url ?? '(no URL returned)';
console.log(`✅ Step 8: PR opened at ${prUrl}`);

// Step 9: Send EmailJS notification
console.log('⏳ Step 9: Sending email notification...');
const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    service_id: EMAILJS_SERVICE_ID,
    template_id: 'template_dtkmdlr',
    user_id: 'HAsGlq5KZDk4pD8fz',
    template_params: {
      to_email: 'gogreenvue@gmail.com',
      subject: pr_title,
      message: `${diagnosis}\n\nPR: ${prUrl}`,
    },
  }),
});

const emailText = await emailRes.text();
console.log(`✅ Step 9: Email sent (EmailJS response: ${emailText})`);

console.log('✅ Step 10: agent.mjs completed successfully');
