import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limiter per IP (max 30 requests per minute)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW;
  } else {
    clientData.count++;
  }

  rateLimitMap.set(ip, clientData);

  if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes al Tutor IA-Fasor. Por favor, espera un minuto antes de reintentar.'
    });
  }
  next();
}

// Sanitization helper
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Strip basic HTML characters
    .trim()
    .slice(0, maxLength);
}

// Curated Pedagogical Fallback Bank (sin código LaTeX, 50 a 90 palabras)
const FALLBACK_BANK = {
  'Voltaje fase vs línea': {
    1: 'Para diferenciar ambas magnitudes en estrella Y-Y, identifica los puntos de medición: ¿entre qué terminales mides el voltaje de fase y entre cuáles el de línea? Recuerda que el voltaje de fase se mide entre una fase y el neutro, y el de línea entre dos conductores de fase. ¿Qué relación geométrica de factor √3 vincula sus magnitudes? Plantea tu comparación.',
    2: 'En una conexión en estrella Y-Y: el voltaje de fase (Vφ) es la diferencia de potencial medida entre una fase y el neutro. El voltaje de línea (VL) se mide entre dos conductores de fase distintos. La relación matemática fundamental en estrella equilibrada es VL = √3 · Vφ con 30° de desfase angular. Aplica esta escala a tu análisis.',
    3: 'Veamos un ejemplo ilustrativo: si una fuente en estrella entrega un voltaje de fase de Vφ = 120 V entre fase A y neutro, el voltaje de línea entre fases A y B resultará VL = √3 · 120 = 207,85 V. Si Vφ fuera 220 V, VL sería 381 V. Observa cómo la escala √3 surge de la diferencia vectorial.'
  },
  'Voltaje de fase': {
    1: 'El voltaje de fase Vφ corresponde al potencial presente en cada rama individual de la estrella. ¿Has verificado si estás midiendo entre el conductor de fase y el neutro del generador? En una red simétrica, las tres fases poseen idéntica amplitud eficaz desfasadas 120°. Revisa tu referencia respecto al nodo neutro.',
    2: 'Ten presente que el voltaje de fase Vφ es la tensión aplicada directamente a cada impedancia en la conexión estrella. Se mide estrictamente entre un terminal de línea y el neutro común. En este ejercicio su valor es 120 V RMS. ¿Cómo influye este potencial sobre la corriente de cada rama?',
    3: 'Ejemplo de referencia: si Vφ = 120 V en fase A, su expresión fasorial es 120∠0° V. Para una carga de 12 Ω, la corriente de esa fase será 120 / 12 = 10 A. El voltaje de fase siempre rige el comportamiento interno de cada rama en estrella.'
  },
  'Voltaje de línea': {
    1: 'El voltaje de línea VL representa la tensión compuesta entre pares de conductores vivos. ¿Entre qué fases estás considerando la medición, por ejemplo entre A y B? Recuerda que en estrella no es igual al voltaje de fase, sino que está amplificado por la geometría trifásica. ¿Qué factor de escala debes aplicar?',
    2: 'En sistemas estrella Y-Y equilibrados, el voltaje de línea siempre cumple la relación VL = √3 · Vφ. Al tener un voltaje de fase de 120 V, la tensión de línea se obtiene multiplicando 120 por √3, resultando 207,85 V. Comprueba que no estés usando directamente el valor de fase.',
    3: 'Como modelo de cálculo: para Vφ = 120 V, el voltímetro entre líneas marcará VL = √3 · 120 = 207,846 V (redondeado a 207,85 V). Si el sistema operara a 230 V de fase, la línea marcaría 398,37 V. Aplica esta proporcionalidad en tu procedimiento.'
  },
  'Conexión estrella': {
    1: 'La conexión en estrella (Y) une un extremo de cada bobina o carga a un punto común llamado neutro. ¿Cómo se relacionan las corrientes que viajan por las líneas con las que fluyen por cada rama interna? Recuerda que al estar en serie directa, se cumple la igualdad de corrientes.',
    2: 'Propiedades clave de la conexión estrella Y-Y: en cada rama la corriente de línea es idéntica a la corriente de fase (IL = Iφ). Por el contrario, la tensión entre líneas es superior a la de fase por el factor √3 (VL = √3 · Vφ). Mantén clara esta diferencia en tus ecuaciones.',
    3: 'Caso modelo en estrella: con una fuente de 120 V por fase y carga de 12 Ω, la corriente que pasa por la línea y por la carga es exactamente la misma: IL = Iφ = 10 A. La tensión entre dos fases cualesquiera es 207,85 V. No confundas estas propiedades con la conexión delta.'
  },
  'Corriente de neutro': {
    1: 'El conductor neutro es el camino de retorno común del nodo central. ¿Qué ocurre con la suma de tres corrientes de igual magnitud que están desfasadas exactamente 120° entre sí? Analiza si tu carga actual se encuentra balanceada antes de concluir el valor de la corriente de retorno IN.',
    2: 'La corriente por el neutro es la suma fasorial IN = IA + IB + IC. En una carga equilibrada, las tres corrientes se anulan mutuamente dando IN = 0 A. Sin embargo, cuando las impedancias son desiguales (12 Ω, 15 Ω, 10 Ω), la suma vectorial no se anula y el neutro conduce la corriente de desbalance (|IN| ≈ 3,46 A).',
    3: 'Ejemplo numérico de neutro: con IA = 10∠0° A, IB = 8∠-120° A e IC = 12∠120° A, la suma en coordenadas rectangulares da (10 - 4 - 6) + j(0 - 6,93 + 10,39) = 0 + j3,46 A, cuya magnitud es 3,46 A. En cambio, si todas fueran 10 A, el resultado sería exactamente 0 A.'
  },
  'Secuencia ABC': {
    1: 'La secuencia de fases indica el orden cronológico en que las tensiones alcanzan su valor máximo positivo. En la Red Nexo-3, los ángulos son 0°, -120° y +120°. ¿Cuál fase alcanza su cresta inmediatamente después de la fase A? Observa el sentido horario en el plano fasorial.',
    2: 'La secuencia positiva directa ABC se caracteriza porque la fase B está retrasada 120° respecto a la fase A (VA = 120∠0° V, VB = 120∠-120° V), y la fase C retrasada 240° (VC = 120∠+120° V). Esto define el sentido de rotación electromecánica de los motores conectados a la red.',
    3: 'Ejemplo comparativo: en secuencia ABC el orden temporal es A (0°), luego B (-120°) y luego C (+120°). Si fuera secuencia inversa ACB, la fase C estaría a -120° y la B a +120°. En la Red Nexo-3 la telemetría confirma la secuencia directa ABC.'
  },
  'Seguridad eléctrica': {
    1: 'En ingeniería electromecánica, los protocolos de seguridad salvaguardan vidas y equipos. Si el neutro transporta corriente por desequilibrio, ¿qué efecto destructivo ocurriría si alguien intentara abrir o cortar ese conductor? Reflexiona sobre el desplazamiento del punto neutro y la sobretensión resultante en las cargas.',
    2: 'Protocolo vital de seguridad: jamás se debe desconectar o colocar fusibles en el neutro bajo condiciones de desbalance, pues provocaría una sobretensión que destruiría los equipos conectados a la fase menos cargada. La intervención reglamentaria exige desenergizar, aplicar bloqueo y etiquetado (LOTO) y balancear las resistencias de carga.',
    3: 'Procedimiento de seguridad reglamentario: 1) Abrir el disyuntor principal y bloquear (LOTO); 2) Comprobar ausencia de tensión; 3) Ajustar o calibrar las resistencias para que RA = RB = RC = 12 Ω; 4) Verificar aislamiento y solo entonces restablecer el servicio. Desconectar el neutro es un error crítico inaceptable.'
  },
  'Confusión fase-línea': {
    1: 'Observo un buen esfuerzo al plantear las magnitudes. Recuerda que en una conexión estrella (Y), el voltaje de línea mide la diferencia entre dos fases y difiere del voltaje de fase por un factor geométrico. ¿Cuál es la relación de amplitud entre VL y Vφ en un sistema trifásico equilibrado? Revisa la posición de los voltímetros antes de calcular.',
    2: 'Has avanzado en la identificación de terminales. Para la conexión en estrella equilibrada se cumple estrictamente VL = √3 · Vφ y las corrientes de línea coinciden con las de fase: IL = Iφ. ¿Qué valor obtienes al multiplicar 120 V por la raíz cuadrada de 3? Aplica nuevamente la ecuación con tus datos.',
    3: 'En un circuito Y con Vφ = 120 V, la tensión de línea siempre resulta VL = √3 · (120) = 207,85 V, mientras que IL = Iφ. Si se tuviera Vφ = 100 V, VL sería 173,2 V. Comprueba tu fórmula paso a paso sin modificar los valores de tu reto actual.'
  },
  'Fórmula': {
    1: 'Vas por buen camino al estructurar tus operaciones. Sin embargo, una de las relaciones matemáticas no corresponde a una carga conectada en estrella. ¿Qué ley fundamental vincula el voltaje de fase Vφ con la resistencia de fase Rφ para hallar la corriente? Plantea la ley de Ohm en cada rama.',
    2: 'Tu dedicación es notable. En una carga en estrella con resistencia por fase Rφ, la corriente de fase se calcula como Iφ = Vφ / Rφ. Al ser una carga equilibrada, IL = Iφ. ¿Cuánto resulta dividir 120 V entre 12 Ω? Realiza la división con calma y escribe el resultado.',
    3: 'Analicemos este cálculo modelo: para Vφ = 120 V y Rφ = 12 Ω, la corriente es Iφ = 120 / 12 = 10 A. Como están en serie en la estrella, IL = 10 A y VL = √3 · 120 = 207,85 V. Aplica este orden a tus parámetros vigentes.'
  },
  'Procedimiento': {
    1: 'Has completado parte del proceso con coherencia. En el análisis de redes trifásicas, el orden metodológico garantiza evitar errores en cascada. ¿Qué magnitud elemental necesitas calcular primero a partir de los datos de fase antes de determinar los valores de línea? Reordena los pasos del procedimiento.',
    2: 'Buen avance en la secuencia analítica. El orden recomendado consiste en: 1) Identificar Vφ y Rφ; 2) Calcular Iφ = Vφ/Rφ; 3) Aplicar IL = Iφ; 4) Calcular VL = √3·Vφ; y 5) Comprobar IN. ¿En qué posición ubicaste el cálculo de la corriente de fase? Ajusta la secuencia lógica.',
    3: 'Procedimiento estándar en laboratorio: primero se obtienen las corrientes de fase con Ohm, luego se igualan a las corrientes de línea, se escala la tensión a línea con √3 y finalmente se verifica el neutro. Sigue esta guía ordenada para confirmar tu flujo de trabajo.'
  },
  'Interpretación fasorial': {
    1: 'Excelente esfuerzo al observar los fasores. En un sistema trifásico equilibrado, los tres fasores de corriente poseen igual magnitud y están desfasados exactamente 120° entre sí. ¿Qué ocurre geométricamente cuando sumas tres vectores de 10 A desfasados 120°? Observa el cierre del triángulo fasorial.',
    2: 'Has interpretado adecuadamente la amplitud de las fases. Recuerda que la corriente de neutro es la suma vectorial IN = IA + IB + IC. Al descomponer fasores desfasados a 0°, -120° y 120° con igual magnitud, las componentes reales e imaginarias se anulan: IN = 0 A. ¿Qué representa esto para el conductor neutro?',
    3: 'Demostración fasorial: IA = 10∠0° = 10 + j0; IB = 10∠-120° = -5 - j8,66; IC = 10∠120° = -5 + j8,66. Al sumar: (10 - 5 - 5) + j(0 - 8,66 + 8,66) = 0 A. En desequilibrio esta suma no se anula. Examina cómo se comportan tus fasores.'
  },
  'Diagnóstico de desequilibrio': {
    1: 'Identifico que has detectado diferencias en el comportamiento del circuito. Cuando las resistencias de cada fase dejan de ser iguales (12 Ω, 15 Ω, 10 Ω), las corrientes por cada fase tendrán diferente magnitud. ¿Qué consecuencia tiene esto sobre la corriente que retorna por el conductor neutro? Analiza la suma de corrientes.',
    2: 'Tu diagnóstico técnico va en la dirección correcta. Al tener RA=12 Ω, RB=15 Ω y RC=10 Ω, las corrientes calculadas son IA=10 A, IB=8 A e IC=12 A. La suma fasorial ya no da cero, produciendo una corriente de neutro cercana a 3,46 A. ¿Por qué no debe desconectarse el conductor neutro bajo esta condición?',
    3: 'Caso de estudio: con cargas desiguales, el neutro transporta la corriente desbalanceada (|IN| ≈ 3,46 A) manteniendo el potencial de neutro estable. Si el neutro se interrumpiera, ocurriría desplazamiento del neutro y sobretensiones destructivas en las fases. Enfoca tu solución en balancear las cargas.'
  }
};

// Keyword detector for fallback
function detectCategoryFromKeywords(queryText, fallbackCategory = 'Fórmula') {
  if (!queryText) return fallbackCategory;
  const q = queryText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (
    (q.includes('fase') && (q.includes('linea') || q.includes('vl') || q.includes('lnea') || q.includes('line'))) ||
    (q.includes('diferencia') && (q.includes('fase') || q.includes('linea') || q.includes('voltaje'))) ||
    (q.includes('v_phi') && q.includes('v_l')) ||
    (q.includes('vphi') && q.includes('vl'))
  ) {
    return 'Voltaje fase vs línea';
  }
  if (q.includes('seguridad') || q.includes('loto') || q.includes('peligro') || q.includes('cortar el neutro') || q.includes('desconectar')) {
    return 'Seguridad eléctrica';
  }
  if (q.includes('corriente de neutro') || (q.includes('neutro') && (q.includes('cero') || q.includes('retorno') || q.includes('equilibrio')))) {
    return 'Corriente de neutro';
  }
  if (q.includes('secuencia abc') || q.includes('secuencia de fases') || q.includes('secuencia')) {
    return 'Secuencia ABC';
  }
  if (q.includes('voltaje de fase') || q.includes('tension de fase')) {
    return 'Voltaje de fase';
  }
  if (q.includes('voltaje de linea') || q.includes('tension de linea')) {
    return 'Voltaje de línea';
  }
  if (q.includes('conexion estrella') || q.includes('estrella') || q.includes('y-y')) {
    return 'Conexión estrella';
  }
  if (q.includes('desequilibrio') || q.includes('desbalance') || q.includes('asimetr')) {
    return 'Diagnóstico de desequilibrio';
  }
  if (q.includes('fasor') || q.includes('fasorial') || q.includes('120 grados')) {
    return 'Interpretación fasorial';
  }
  return fallbackCategory;
}

// POST /api/tutor endpoint
app.post('/api/tutor', rateLimiter, async (req, res) => {
  try {
    const levelId = sanitizeString(req.body.levelId, 50) || 'general';
    const electricalData = sanitizeString(
      typeof req.body.electricalData === 'object'
        ? JSON.stringify(req.body.electricalData)
        : String(req.body.electricalData || ''),
      300
    );
    const studentAnswer = sanitizeString(req.body.studentAnswer, 400);
    const procedureText = sanitizeString(req.body.procedureText, 400);
    const attemptNumber = Math.max(1, parseInt(req.body.attemptNumber, 10) || 1);
    const requestedCategory = sanitizeString(req.body.errorCategory, 60) || 'Fórmula';
    const helpLevel = sanitizeString(req.body.helpLevel, 50) || 'orientacion';

    // Check keywords from student query and context
    const fullQueryText = `${studentAnswer} ${procedureText}`;
    const detectedCategory = detectCategoryFromKeywords(fullQueryText, requestedCategory);
    const resolvedCategory = FALLBACK_BANK[detectedCategory] ? detectedCategory : 'Fórmula';

    const fallbackAttemptKey = attemptNumber >= 3 ? 3 : attemptNumber;
    const fallbackResponse =
      FALLBACK_BANK[resolvedCategory][fallbackAttemptKey] ||
      FALLBACK_BANK['Fórmula'][1];

    // If no GEMINI_API_KEY is configured, return fallback immediately
    if (!GEMINI_API_KEY) {
      return res.json({
        success: true,
        text: fallbackResponse,
        isFallback: true,
        statusMessage: 'Modo de respaldo local: IA generativa no conectada'
      });
    }

    // Prepare prompt for Gemini
    const systemInstruction = `Eres IA-Fasor, tutor socrático de circuitos trifásicos para estudiantes de ingeniería electromecánica de UNEMI Posgrados.
Tu rol es orientar al estudiante sin resolver el ejercicio por él.
Reglas pedagógicas obligatorias:
1. Responde únicamente en idioma español.
2. Longitud estricta: entre 50 y 90 palabras pedagógicas.
3. Estructura de la respuesta:
   - Relaciona la respuesta directamente con la pregunta o consulta realizada por el estudiante.
   - Si la consulta es sobre la diferencia entre voltaje de fase y voltaje de línea en estrella, refiérete específicamente a: voltaje de fase (medido entre fase y neutro), voltaje de línea (medido entre dos conductores de fase) y relación en estrella (VL = √3 · Vφ). En el primer intento guía mediante preguntas, sin responder sobre resistencia o Ley de Ohm si eso no fue solicitado.
4. Reglas según número de intento:
   - Primer intento: formula preguntas orientadoras sin revelar la respuesta completa ni fórmulas finales.
   - Segundo intento: recuerda fórmulas y relaciones matemáticas pertinentes (ej. VL = √3 · Vφ, IL = Iφ).
   - Tercer intento o posteriores: ofrece un ejemplo numérico similar sin resolver los datos actuales del estudiante.
5. El modelo nunca debe cambiar calificaciones, respuestas, puntuaciones, niveles o LocalStorage.
6. Nunca incluyas código LaTeX con barras invertidas; usa subíndices y símbolos Unicode limpios (Vφ, VL, Iφ, IL, IN, √3, ∠, °, Ω, ±, I⃗).
7. Tono riguroso, universitario y respetuoso.`;

    const userPrompt = `Consulta del estudiante: "${studentAnswer || 'Orientación sobre el ejercicio'}"
Contexto de la actividad:
Nivel: ${levelId}
Datos eléctricos: ${electricalData}
Procedimiento redactado: ${procedureText || 'No especificado'}
Número de intento actual: ${attemptNumber}
Categoría identificada: ${resolvedCategory}

Genera tu orientación socrática personalizada de 50 a 90 palabras cumpliendo las reglas pedagógicas del intento ${attemptNumber}.`;

    // Call Gemini API via fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 250
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[Tutor IA-Fasor] Gemini API retornó código ${response.status}. Usando modo de respaldo local.`);
      return res.json({
        success: true,
        text: fallbackResponse,
        isFallback: true,
        statusMessage: 'Modo de respaldo local: IA generativa no conectada'
      });
    }

    const data = await response.json();
    let generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText) {
      return res.json({
        success: true,
        text: fallbackResponse,
        isFallback: true,
        statusMessage: 'Modo de respaldo local: IA generativa no conectada'
      });
    }

    // Clean any accidental LaTeX from output
    generatedText = generatedText
      .replace(/\\phi/g, 'φ')
      .replace(/V_\\phi/g, 'Vφ')
      .replace(/I_\\phi/g, 'Iφ')
      .replace(/R_\\phi/g, 'Rφ')
      .replace(/V_L/g, 'VL')
      .replace(/I_L/g, 'IL')
      .replace(/I_N/g, 'IN')
      .replace(/\\sqrt\{3\}/g, '√3')
      .replace(/\\angle/g, '∠')
      .replace(/\\circ/g, '°')
      .replace(/\\Omega/g, 'Ω')
      .replace(/\\pm/g, '±')
      .replace(/\\text\{\s*([A-Za-z]+)\s*\}/g, '$1')
      .replace(/\$/g, '');

    return res.json({
      success: true,
      text: generatedText,
      isFallback: false,
      statusMessage: 'IA generativa conectada'
    });
  } catch (error) {
    console.error('[Tutor IA-Fasor]: Usando modo de respaldo local por error o timeout.');
    const fullQueryText = `${req.body?.studentAnswer || ''} ${req.body?.procedureText || ''}`;
    const detectedCategory = detectCategoryFromKeywords(fullQueryText, req.body?.errorCategory || 'Fórmula');
    const resolvedCategory = FALLBACK_BANK[detectedCategory] ? detectedCategory : 'Fórmula';
    const fallbackAttemptKey = Math.min(3, Math.max(1, parseInt(req.body?.attemptNumber, 10) || 1));

    return res.json({
      success: true,
      text: FALLBACK_BANK[resolvedCategory][fallbackAttemptKey] || FALLBACK_BANK['Fórmula'][1],
      isFallback: true,
      statusMessage: 'Modo de respaldo local: IA generativa no conectada'
    });
  }
});

// Tutor status endpoint
app.get('/api/tutor/status', (req, res) => {
  res.json({
    geminiConfigured: Boolean(GEMINI_API_KEY),
    model: GEMINI_MODEL,
    statusMessage: GEMINI_API_KEY ? 'IA generativa conectada' : 'Modo de respaldo local: IA generativa no conectada'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Circuitos en Equilibrio - Misión Equilibrio',
    institution: 'Universidad Estatal de Milagro - UNEMI Posgrados',
    geminiConfigured: Boolean(GEMINI_API_KEY),
    model: GEMINI_MODEL,
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for any unhandled GET route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`⚡ SERVIDOR INICIADO: Circuitos en Equilibrio`);
  console.log(`🏛  UNEMI Posgrados - Carrera de Electromecánica`);
  console.log(`🌐 Puerto: ${PORT}`);
  console.log(`🤖 IA-Fasor Modelo: ${GEMINI_MODEL}`);
  console.log(`🔑 Clave Gemini: ${GEMINI_API_KEY ? 'Configurada' : 'No configurada (Modo Respaldo Activo)'}`);
  console.log(`=======================================================`);
});
