import { convertModernColorValue, needsColorConversion } from '../src/lib/colorNormalize';

let failures = 0;
function assertEqual(label: string, actual: string, expected: string) {
  if (actual !== expected) {
    failures++;
    console.error(`FAIL ${label}\n  actual:   ${actual}\n  expected: ${expected}`);
  } else {
    console.log(`PASS ${label}`);
  }
}
function assert(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`PASS ${label}`);
  }
}

// Mock converter: deterministically converts any color function to rgb/rgba.
const convertColor = (colorText: string): string => {
  if (colorText.includes('0.5')) return 'rgba(10, 20, 30, 0.5)';
  return 'rgb(10, 20, 30)';
};

// 1. oklab top-level
assertEqual(
  'oklab top-level',
  convertModernColorValue('oklab(0.5 0.1 0.2)', convertColor),
  'rgba(10, 20, 30, 0.5)',
);

// 2. oklch top-level
assertEqual(
  'oklch top-level',
  convertModernColorValue('oklch(0.7 0.15 200)', convertColor),
  'rgb(10, 20, 30)',
);

// 3. oklab with alpha
assertEqual(
  'oklab alpha',
  convertModernColorValue('oklab(0.5 0.1 0.2 / 0.5)', convertColor),
  'rgba(10, 20, 30, 0.5)',
);

// 4. nested in linear-gradient
assertEqual(
  'gradient nested',
  convertModernColorValue(
    'linear-gradient(to right, oklch(0.7 0.15 200), oklab(0.5 0.1 0.2 / 0.5))',
    convertColor,
  ),
  'linear-gradient(to right, rgb(10, 20, 30), rgba(10, 20, 30, 0.5))',
);

// 5. box-shadow complex
assertEqual(
  'box-shadow complex',
  convertModernColorValue(
    '0 4px 6px -1px oklch(0.7 0.15 200), 0 2px 4px -2px oklab(0.5 0.1 0.2 / 0.3)',
    convertColor,
  ),
  '0 4px 6px -1px rgb(10, 20, 30), 0 2px 4px -2px rgba(10, 20, 30, 0.5)',
);

// 6. needsColorConversion detection
assert('detect oklab', needsColorConversion('oklab(0 0 0)'));
assert('detect oklch', needsColorConversion('oklch(0 0 0)'));
assert('no detect rgb', !needsColorConversion('rgb(1,2,3)'));

// 7. parentheses balanced not truncated
const g = convertModernColorValue('linear-gradient(to right, oklch(0.7 0.15 200), oklab(0.5 0.1 0.2))', convertColor);
assert('balanced parens', (g.match(/\(/g) || []).length === (g.match(/\)/g) || []).length);

// 8. background shorthand with gradient
assertEqual(
  'background shorthand',
  convertModernColorValue(
    'linear-gradient(to right, oklch(0.7 0.15 200), oklab(0.5 0.1 0.2 / 0.3)) center / cover no-repeat',
    convertColor,
  ),
  'linear-gradient(to right, rgb(10, 20, 30), rgba(10, 20, 30, 0.5)) center / cover no-repeat',
);

// 9. box-shadow shorthand with multiple shadows
assertEqual(
  'box-shadow multi',
  convertModernColorValue(
    '0 4px 6px -1px oklch(0.7 0.15 200), 0 2px 4px -2px oklab(0.5 0.1 0.2 / 0.3)',
    convertColor,
  ),
  '0 4px 6px -1px rgb(10, 20, 30), 0 2px 4px -2px rgba(10, 20, 30, 0.5)',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
} else {
  console.log('\nAll color normalization regression checks passed.');
}
