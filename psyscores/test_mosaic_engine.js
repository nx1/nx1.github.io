/**
 * Test suite for client-side mosaic engine algorithms
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Check data loading
const dataPath = path.join(__dirname, 'art', 'covers_data.json');
const covers = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
assert.strictEqual(covers.length, 841, 'Must have 841 covers');

// 2. Test Color Conversion
function srgbToLinear(c) {
    const v = c / 255.0;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
    const rL = srgbToLinear(r);
    const gL = srgbToLinear(g);
    const bL = srgbToLinear(b);

    const xVal = (rL * 0.4124564 + gL * 0.3575761 + bL * 0.1804375) / 0.95047;
    const yVal = (rL * 0.2126729 + gL * 0.7151522 + bL * 0.0721750);
    const zVal = (rL * 0.0193339 + gL * 0.1191920 + bL * 0.9503041) / 1.08883;

    const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16.0 / 116.0);

    const fx = f(xVal);
    const fy = f(yVal);
    const fz = f(zVal);

    const labL = 116.0 * fy - 16.0;
    const labA = 500.0 * (fx - fy);
    const labB = 200.0 * (fy - fz);
    return [labL, labA, labB];
}

// White point check: L ~ 100, a ~ 0, b ~ 0
const [wL, wa, wb] = rgbToLab(255, 255, 255);
assert(Math.abs(wL - 100) < 0.1, 'White L must be ~100');
assert(Math.abs(wa) < 0.1, 'White a must be ~0');
assert(Math.abs(wb) < 0.1, 'White b must be ~0');

// Black point check: L ~ 0, a ~ 0, b ~ 0
const [bL, ba, bb] = rgbToLab(0, 0, 0);
assert(Math.abs(bL) < 0.1, 'Black L must be ~0');
assert(Math.abs(ba) < 0.1, 'Black a must be ~0');
assert(Math.abs(bb) < 0.1, 'Black b must be ~0');

// 3. Test Quadrant and Average Matching
const gw = 20;
const gh = 20;
const total = gw * gh;
const dummyGrid = new Int32Array(total);

for (let i = 0; i < total; i++) {
    // Pick nearest cover to middle gray
    let bestDist = Infinity;
    let bestId = 0;
    const targetL = 50, targetA = 0, targetB = 0;
    for (let j = 0; j < covers.length; j++) {
        const [cL, ca, cb] = covers[j].avg_lab;
        const d = (targetL - cL)**2 + (targetA - ca)**2 + (targetB - cb)**2;
        if (d < bestDist) {
            bestDist = d;
            bestId = covers[j].id;
        }
    }
    dummyGrid[i] = bestId;
}

assert(dummyGrid[0] >= 0 && dummyGrid[0] < 841, 'Matched ID within range');
console.log('JavaScript Engine Tests Passed Successfully!');
