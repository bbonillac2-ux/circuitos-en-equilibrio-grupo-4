import test from 'node:test';
import assert from 'node:assert/strict';

// Item scoring calculator based on attempt number
function calculateItemScore(basePoints, attemptNumber, isCorrect) {
  if (!isCorrect) return 0;
  if (attemptNumber === 1) return basePoints;
  if (attemptNumber === 2) return basePoints * 0.8;
  if (attemptNumber === 3) return basePoints * 0.6;
  return 0;
}

// Level threshold and mission evaluation
function evaluateMission(level1Score, level2Score, level3Score, hasCriticalError) {
  const totalScore = parseFloat((level1Score + level2Score + level3Score).toFixed(1));
  const l1Passed = level1Score >= 15;
  const l2Passed = level2Score >= 26;
  const l3Passed = level3Score >= 34;
  const thresholdPassed = l1Passed && l2Passed && l3Passed;

  const passed = totalScore >= 80 && thresholdPassed && !hasCriticalError;

  let certificationLevel = 'none';
  let recoveryNeeded = false;

  if (!passed || totalScore < 80) {
    recoveryNeeded = true;
  } else if (totalScore >= 90) {
    certificationLevel = 'excelencia';
  } else if (totalScore >= 80) {
    certificationLevel = 'aprobado';
  }

  return {
    totalScore,
    l1Passed,
    l2Passed,
    l3Passed,
    passed,
    certificationLevel,
    recoveryNeeded
  };
}

test('Sistema de puntuación por intentos y conservación de mejor nota', () => {
  const basePoints = 5;

  assert.equal(calculateItemScore(basePoints, 1, true), 5);
  assert.equal(calculateItemScore(basePoints, 2, true), 4);
  assert.equal(calculateItemScore(basePoints, 3, true), 3);
  assert.equal(calculateItemScore(basePoints, 4, true), 0);
  assert.equal(calculateItemScore(basePoints, 1, false), 0);

  // Simulación de ítem con mejor nota previa
  let itemBestScore = 0;
  // Intento 1 falló
  itemBestScore = Math.max(itemBestScore, calculateItemScore(basePoints, 1, false));
  assert.equal(itemBestScore, 0);

  // Intento 2 acertó (80% = 4 pts)
  itemBestScore = Math.max(itemBestScore, calculateItemScore(basePoints, 2, true));
  assert.equal(itemBestScore, 4);

  // Si volviera a intentar y fuera intento 3, no debe degradar la puntuación (conserva 4)
  const scoreIfAttempt3 = calculateItemScore(basePoints, 3, true); // 3 pts
  itemBestScore = Math.max(itemBestScore, scoreIfAttempt3);
  assert.equal(itemBestScore, 4);
});

test('Evaluación de condiciones de logro, umbrales y error crítico', () => {
  // Caso 1: Aprobado con excelencia (>= 90 pts, sin error crítico)
  const res1 = evaluateMission(18, 32, 42, false);
  assert.equal(res1.totalScore, 92);
  assert.ok(res1.passed);
  assert.equal(res1.certificationLevel, 'excelencia');
  assert.ok(!res1.recoveryNeeded);

  // Caso 2: Aprobado estándar (entre 80 y 89.9 pts)
  const res2 = evaluateMission(16, 28, 38, false);
  assert.equal(res2.totalScore, 82);
  assert.ok(res2.passed);
  assert.equal(res2.certificationLevel, 'aprobado');
  assert.ok(!res2.recoveryNeeded);

  // Caso 3: Fallo global (< 80 pts)
  const res3 = evaluateMission(16, 26, 35, false);
  assert.equal(res3.totalScore, 77);
  assert.ok(!res3.passed);
  assert.ok(res3.recoveryNeeded);

  // Caso 4: Puntaje alto pero no superó el umbral del Nivel 2 (< 26)
  const res4 = evaluateMission(20, 24, 44, false); // total 88 pero L2 falló
  assert.equal(res4.totalScore, 88);
  assert.ok(!res4.l2Passed);
  assert.ok(!res4.passed);
  assert.ok(res4.recoveryNeeded);

  // Caso 5: Puntaje perfecto (100) pero con Error Crítico activo (ej. desconectó el neutro)
  const res5 = evaluateMission(20, 35, 45, true);
  assert.equal(res5.totalScore, 100);
  assert.ok(!res5.passed); // Debe bloquear aprobación hasta corregir
  assert.ok(res5.recoveryNeeded);
});
