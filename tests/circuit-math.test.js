import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function to parse user numbers with comma or dot
function parseUserNumber(input) {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return NaN;
  const clean = input.trim().replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(clean);
}

// Tolerance validator
function validateMagnitude(userInput, expected, isZeroCheck = false) {
  const parsed = parseUserNumber(userInput);
  if (isNaN(parsed)) return false;

  if (isZeroCheck) {
    // Absolute tolerance ±0.05 A for zero neutral current
    return Math.abs(parsed - expected) <= 0.05;
  }

  // Relative tolerance ±1% for non-zero values
  const relativeDiff = Math.abs((parsed - expected) / expected);
  return relativeDiff <= 0.01;
}

// Phasor sum calculation for unbalanced Y load
function calculateUnbalancedNeutralCurrent(V_rms, RA, RB, RC) {
  // Balanced phase voltages, sequence ABC:
  // V_A = V_rms ∠0°
  // V_B = V_rms ∠-120°
  // V_C = V_rms ∠120°
  const IA_mag = V_rms / RA;
  const IB_mag = V_rms / RB;
  const IC_mag = V_rms / RC;

  // Rectangular components:
  // IA = IA_mag * (cos(0) + j sin(0)) = IA_mag + j0
  const IA_real = IA_mag;
  const IA_imag = 0;

  // IB = IB_mag * (cos(-120°) + j sin(-120°)) = IB_mag * (-0.5 - j(√3/2))
  const IB_real = IB_mag * Math.cos((-120 * Math.PI) / 180);
  const IB_imag = IB_mag * Math.sin((-120 * Math.PI) / 180);

  // IC = IC_mag * (cos(120°) + j sin(120°)) = IC_mag * (-0.5 + j(√3/2))
  const IC_real = IC_mag * Math.cos((120 * Math.PI) / 180);
  const IC_imag = IC_mag * Math.sin((120 * Math.PI) / 180);

  // In standard Y-Y connection with neutral: IN = -(IA + IB + IC) or magnitude |IA + IB + IC|
  const sum_real = IA_real + IB_real + IC_real;
  const sum_imag = IA_imag + IB_imag + IC_imag;
  const IN_mag = Math.sqrt(sum_real * sum_real + sum_imag * sum_imag);

  return {
    IA: IA_mag,
    IB: IB_mag,
    IC: IC_mag,
    IN_mag
  };
}

test('Nivel 2: Cálculos trifásicos equilibrados fijos', () => {
  const V_phase = 120;
  const R_phase = 12;

  const expected_VL = Math.sqrt(3) * V_phase; // 207.846...
  const expected_I_phase = V_phase / R_phase; // 10 A
  const expected_IL = expected_I_phase; // 10 A
  const expected_IN = 0; // 0 A

  // Comprueba valor de VL ≈ 207.85 V
  assert.ok(Math.abs(expected_VL - 207.85) < 0.01);
  assert.equal(expected_I_phase, 10);
  assert.equal(expected_IL, 10);
  assert.equal(expected_IN, 0);

  // Comprueba aceptación de punto y coma decimal con tolerancia de 1%
  assert.ok(validateMagnitude('207.85', expected_VL));
  assert.ok(validateMagnitude('207,85', expected_VL));
  assert.ok(validateMagnitude('206.5', expected_VL)); // dentro de ±1%
  assert.ok(validateMagnitude('209.5', expected_VL)); // dentro de ±1%
  assert.ok(!validateMagnitude('220', expected_VL)); // fuera de tolerancia

  // Comprueba corriente de neutro con tolerancia absoluta ±0.05
  assert.ok(validateMagnitude('0', expected_IN, true));
  assert.ok(validateMagnitude('0.03', expected_IN, true));
  assert.ok(validateMagnitude('-0.04', expected_IN, true));
  assert.ok(!validateMagnitude('0.1', expected_IN, true));
});

test('Nivel 3: Cálculos trifásicos desequilibrados (Red Nexo-3)', () => {
  const V_phase = 120;
  const RA = 12;
  const RB = 15;
  const RC = 10;

  const results = calculateUnbalancedNeutralCurrent(V_phase, RA, RB, RC);

  assert.equal(results.IA, 10);
  assert.equal(results.IB, 8);
  assert.equal(results.IC, 12);

  // |IN| = sqrt((10 - 4 - 6)^2 + (0 - 6.9282 + 10.3923)^2)
  // real sum = 10 - 4 - 6 = 0
  // imag sum = 0 - 8*sin(60°) + 12*sin(60°) = 4*sin(60°) = 4 * 0.866025 = 3.4641 A
  assert.ok(Math.abs(results.IN_mag - 3.4641) < 0.001);

  // Validaciones con entradas de usuario
  assert.ok(validateMagnitude('10', results.IA));
  assert.ok(validateMagnitude('8', results.IB));
  assert.ok(validateMagnitude('12', results.IC));
  assert.ok(validateMagnitude('3.46', results.IN_mag));
  assert.ok(validateMagnitude('3,46', results.IN_mag));
  assert.ok(validateMagnitude('3.48', results.IN_mag)); // dentro de ±1%
});
