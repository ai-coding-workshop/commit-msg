#!/usr/bin/env node

/**
 * Test script to verify compatibility across different Node.js versions
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

function getNodeVersion() {
  const version = process.version;
  const major = parseInt(version.split('.')[0].replace('v', ''));
  return { version, major };
}

function testBuild() {
  console.log('🔨 Testing build...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build successful');
    return true;
  } catch (error) {
    console.log('❌ Build failed');
    return false;
  }
}

function testProductionMode() {
  console.log('🚀 Testing production mode...');
  try {
    const output = execSync('node dist/bin/commit-msg.js --version', {
      encoding: 'utf-8',
    });
    if (output.includes('@ai-coding-workshop/commit-msg:')) {
      console.log('✅ Production mode works');
      return true;
    } else {
      console.log('❌ Production mode failed - unexpected output');
      return false;
    }
  } catch (error) {
    console.log('❌ Production mode failed');
    return false;
  }
}

function testDevelopmentMode(script) {
  console.log(`🧪 Testing development mode with: ${script}`);
  try {
    const output = execSync(`npm run ${script} -- --version`, {
      encoding: 'utf-8',
    });
    if (output.includes('@ai-coding-workshop/commit-msg:')) {
      console.log(`✅ Development mode works with ${script}`);
      return true;
    } else {
      console.log(
        `❌ Development mode failed with ${script} - unexpected output`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Development mode failed with ${script}`);
    return false;
  }
}

function testTests() {
  console.log('🧪 Running tests...');
  try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ Tests passed');
    return true;
  } catch (error) {
    console.log('❌ Tests failed');
    return false;
  }
}

function main() {
  const { version, major } = getNodeVersion();

  console.log(
    `\n🔍 Testing compatibility for Node.js ${version} (major: ${major})`
  );
  console.log('='.repeat(60));

  let results = {
    build: false,
    production: false,
    development: false,
    tests: false,
  };

  // Test build
  results.build = testBuild();

  if (results.build) {
    // Test production mode
    results.production = testProductionMode();

    // Test development mode based on Node.js version
    if (major >= 20) {
      results.development = testDevelopmentMode('dev');
    } else if (major === 18) {
      results.development = testDevelopmentMode('dev:node18');
    } else {
      results.development = testDevelopmentMode('dev:compat');
    }

    // Test tests
    results.tests = testTests();
  }

  // Summary
  console.log('\n📊 Compatibility Summary');
  console.log('='.repeat(60));
  console.log(`Node.js Version: ${version}`);
  console.log(`Build: ${results.build ? '✅' : '❌'}`);
  console.log(`Production Mode: ${results.production ? '✅' : '❌'}`);
  console.log(`Development Mode: ${results.development ? '✅' : '❌'}`);
  console.log(`Tests: ${results.tests ? '✅' : '❌'}`);

  const allPassed = Object.values(results).every((r) => r);
  if (allPassed) {
    console.log('\n🎉 All compatibility tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some compatibility tests failed');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
