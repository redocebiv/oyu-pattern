/** Minimal assertion harness. No dependencies, no framework. */

export function suite(name) {
  let passed = 0;
  const failures = [];

  const api = {
    check(label, actual, expected) {
      if (Object.is(actual, expected)) passed += 1;
      else failures.push(`${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
      return api;
    },
    ok(label, condition, detail = '') {
      if (condition) passed += 1;
      else failures.push(`${label}${detail ? `\n      ${detail}` : ''}`);
      return api;
    },
    fail(label) {
      failures.push(label);
      return api;
    },
    close(padding = 60) {
      if (failures.length) {
        console.error(`\n  ${name}: ${failures.length} failing\n`);
        for (const failure of failures) console.error(`    ✗ ${failure}`);
        console.error(`\n  ${passed} passed, ${failures.length} failed\n`);
        process.exit(1);
      }
      console.log(`  ✓ ${name.padEnd(padding - 4)} ${passed} assertions`);
    },
  };
  return api;
}
