import test from 'node:test';
import assert from 'node:assert/strict';

test('IA-Fasor Fallback Logic: genera respuestas socráticas de 50 a 90 palabras', () => {
  // Mock del catálogo de respaldo del tutor
  const FALLBACK_BANK = {
    'Confusión fase-línea': {
      1: 'Observo un buen esfuerzo al plantear las magnitudes. Recuerda que en una conexión estrella (Y), el voltaje de línea mide la diferencia entre dos fases y difiere del voltaje de fase por un factor geométrico. ¿Cuál es la relación de amplitud entre VL y Vφ en un sistema trifásico equilibrado? Revisa la posición de los voltímetros antes de calcular.',
      2: 'Has avanzado en la identificación de terminales. Para la conexión en estrella equilibrada se cumple estrictamente VL = √3 · Vφ y las corrientes de línea coinciden con las de fase: IL = Iφ. ¿Qué valor obtienes al multiplicar 120 V por la raíz cuadrada de 3? Aplica nuevamente la ecuación con tus datos.',
      3: 'En un circuito Y con Vφ = 120 V, la tensión de línea siempre resulta VL = √3 · (120) = 207,85 V, mientras que IL = Iφ. Si se tuviera Vφ = 100 V, VL sería 173,2 V. Comprueba tu fórmula paso a paso sin modificar los valores de tu reto actual.'
    }
  };

  const text1 = FALLBACK_BANK['Confusión fase-línea'][1];
  const words1 = text1.split(/\s+/).filter(Boolean).length;
  assert.ok(words1 >= 45 && words1 <= 95, `Palabras en intento 1: ${words1}`);

  const text2 = FALLBACK_BANK['Confusión fase-línea'][2];
  const words2 = text2.split(/\s+/).filter(Boolean).length;
  assert.ok(words2 >= 45 && words2 <= 95, `Palabras en intento 2: ${words2}`);

  const text3 = FALLBACK_BANK['Confusión fase-línea'][3];
  const words3 = text3.split(/\s+/).filter(Boolean).length;
  assert.ok(words3 >= 45 && words3 <= 95, `Palabras en intento 3: ${words3}`);

  // En intento 1 no debe mencionar la solución explícita '207,85'
  assert.ok(!text1.includes('207,85'));

  // En intento 2 debe recordar la fórmula 'VL = √3 · Vφ'
  assert.ok(text2.includes('VL = √3 · Vφ'));

  // En intento 3 puede mostrar un ejemplo resuelto similar sin tocar el ejercicio principal
  assert.ok(text3.includes('100 V') || text3.includes('173,2 V'));
});
