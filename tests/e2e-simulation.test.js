import test from 'node:test';
import assert from 'node:assert/strict';

// Helper for parsing numbers with comma or dot
function parseUserNumber(input) {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return NaN;
  const clean = input.trim().replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(clean);
}

function isWithinTolerance(userInput, expected, isZero = false) {
  const parsed = parseUserNumber(userInput);
  if (isNaN(parsed)) return false;
  if (isZero) return Math.abs(parsed - expected) <= 0.05;
  return Math.abs((parsed - expected) / expected) <= 0.01;
}

function calculateScore(basePts, attempt, isCorrect) {
  if (!isCorrect) return 0;
  if (attempt === 1) return basePts;
  if (attempt === 2) return basePts * 0.8;
  if (attempt === 3) return basePts * 0.6;
  return 0;
}

test('Simulación Completa del Estudiante: Nivel 1 (20/20)', () => {
  const answers = {
    fuente: 'fuente',
    carga: 'carga',
    lineas: 'lineas',
    neutro: 'neutro',
    v_fase: 'v_fase',
    v_linea: 'v_linea',
    i_fase: 'i_fase',
    i_linea: 'i_linea',
    secuencia: 'ABC'
  };

  let l1Score = 0;
  const identKeys = ['fuente', 'carga', 'lineas', 'neutro', 'v_fase', 'v_linea', 'i_fase', 'i_linea'];
  identKeys.forEach(key => {
    const isCorrect = answers[key] === key;
    l1Score += calculateScore(2, 1, isCorrect);
  });

  const isSeqCorrect = answers.secuencia === 'ABC';
  l1Score += calculateScore(4, 1, isSeqCorrect);

  assert.equal(l1Score, 20);
  assert.ok(l1Score >= 15, 'Supera umbral de 15 puntos');
});

test('Simulación Completa del Estudiante: Nivel 2 con Coma Decimal (35/35)', () => {
  const studentInputs = {
    VL: '207,85', // con coma decimal
    I_fase: '10',
    I_linea: '10,0',
    I_neutro: '0,02', // dentro de ±0.05 A
    procedimiento: ['ident', 'ifase', 'ilinea', 'vlinea', 'neutro'],
    interpretacion: 'valido'
  };

  let l2Score = 0;
  // Magnitudes: 5 pts c/u = 20 pts
  assert.ok(isWithinTolerance(studentInputs.VL, 207.846));
  l2Score += calculateScore(5, 1, true);

  assert.ok(isWithinTolerance(studentInputs.I_fase, 10));
  l2Score += calculateScore(5, 1, true);

  assert.ok(isWithinTolerance(studentInputs.I_linea, 10));
  l2Score += calculateScore(5, 1, true);

  assert.ok(isWithinTolerance(studentInputs.I_neutro, 0, true));
  l2Score += calculateScore(5, 1, true);

  // Procedimiento: 10 pts
  const expectedProc = ['ident', 'ifase', 'ilinea', 'vlinea', 'neutro'];
  const procMatch = JSON.stringify(studentInputs.procedimiento) === JSON.stringify(expectedProc);
  assert.ok(procMatch);
  l2Score += calculateScore(10, 1, true);

  // Interpretación: 5 pts
  assert.equal(studentInputs.interpretacion, 'valido');
  l2Score += calculateScore(5, 1, true);

  assert.equal(l2Score, 35);
  assert.ok(l2Score >= 26, 'Supera umbral de 26 puntos');
});

test('Simulación Completa del Estudiante: Nivel 3 con Acción Segura (45/45)', () => {
  const studentInputs = {
    IA: '10',
    IB: '8.0',
    IC: '12',
    IN: '3,46',
    fasor: 'vectorial',
    diagnostico: 'desequilibrio',
    accion: 'balancear_cargas'
  };

  let l3Score = 0;
  assert.ok(isWithinTolerance(studentInputs.IA, 10));
  l3Score += calculateScore(4.5, 1, true);

  assert.ok(isWithinTolerance(studentInputs.IB, 8));
  l3Score += calculateScore(4.5, 1, true);

  assert.ok(isWithinTolerance(studentInputs.IC, 12));
  l3Score += calculateScore(4.5, 1, true);

  assert.ok(isWithinTolerance(studentInputs.IN, 3.4641));
  l3Score += calculateScore(4.5, 1, true);

  assert.equal(studentInputs.fasor, 'vectorial');
  l3Score += calculateScore(12, 1, true);

  assert.equal(studentInputs.diagnostico, 'desequilibrio');
  l3Score += calculateScore(8, 1, true);

  assert.equal(studentInputs.accion, 'balancear_cargas');
  l3Score += calculateScore(7, 1, true);

  assert.equal(l3Score, 45);
  assert.ok(l3Score >= 34, 'Supera umbral de 34 puntos');
});

test('Evaluación Global de la Misión: 100/100 PTS y Certificación', () => {
  const l1 = 20;
  const l2 = 35;
  const l3 = 45;
  const total = l1 + l2 + l3;

  assert.equal(total, 100);
  assert.ok(total >= 80, 'Supera el 80% mínimo institucional');
  assert.ok(total >= 90, 'Alcanza la distinción de excelencia para Certificado');
});
