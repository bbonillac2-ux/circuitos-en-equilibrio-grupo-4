/**
 * Motor de Gamificación, Cálculos Deterministas y Certificación
 * "Circuitos en Equilibrio: Misión Equilibrio – Rescate de la Red Nexo-3"
 * UNEMI Posgrados - 2026
 */

import { AITutor } from './ai-tutor.js';

export const GameEngine = {
  // Game State
  state: {
    currentLevel: 1,
    scores: {
      l1: 0,
      l2: 0,
      l3: 0,
      total: 0
    },
    attempts: {
      l1: 0,
      l2: 0,
      l3: 0,
      items: {}
    },
    itemScores: {}, // itemKey -> bestScore
    levelUnlocked: {
      1: true,
      2: false,
      3: false
    },
    badges: {
      1: false, // Explorador Y-Y
      2: false, // Analista Fasorial
      3: false  // Guardián del Equilibrio
    },
    criticalErrorActive: false,
    errorsCorrectedCount: 0,
    totalAttemptsCount: 0,
    missionCompleted: false
  },

  // Animation state for Phasor Canvas
  phasor: {
    canvas: null,
    ctx: null,
    angle: 0,
    speed: 0.02,
    isPaused: false,
    animId: null
  },

  init() {
    this.loadSavedState();
    this.initPhasorCanvas();
    this.loadCircuitSvg();
    this.bindEvents();
    this.updateHUD();
    this.updateResultsView();
  },

  loadSavedState() {
    try {
      const saved = localStorage.getItem('unemi_nexo3_gamestate');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = Object.assign(this.state, parsed);
      }
    } catch (e) {
      console.warn('Error al restaurar estado de juego:', e);
    }
  },

  saveState() {
    try {
      localStorage.setItem('unemi_nexo3_gamestate', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Error al guardar estado de juego:', e);
    }
  },

  bindEvents() {
    // Level 1 Validate
    const btnValL1 = document.getElementById('btn-validate-l1');
    if (btnValL1) btnValL1.addEventListener('click', () => this.validateLevel1());

    const btnTutorL1 = document.getElementById('btn-ask-tutor-l1');
    if (btnTutorL1) btnTutorL1.addEventListener('click', () => this.consultTutorFromLevel(1));

    // Level 2 Validate
    const btnValL2 = document.getElementById('btn-validate-l2');
    if (btnValL2) btnValL2.addEventListener('click', () => this.validateLevel2());

    const btnTutorL2 = document.getElementById('btn-ask-tutor-l2');
    if (btnTutorL2) btnTutorL2.addEventListener('click', () => this.consultTutorFromLevel(2));

    // Level 3 Validate
    const btnValL3 = document.getElementById('btn-validate-l3');
    if (btnValL3) btnValL3.addEventListener('click', () => this.validateLevel3());

    const btnTutorL3 = document.getElementById('btn-ask-tutor-l3');
    if (btnTutorL3) btnTutorL3.addEventListener('click', () => this.consultTutorFromLevel(3));

    // Level Navigation Pills
    document.querySelectorAll('.level-pill').forEach((btn, idx) => {
      const lvl = idx + 1;
      btn.addEventListener('click', () => {
        if (this.state.levelUnlocked[lvl]) {
          this.switchLevelView(lvl);
        }
      });
    });

    // Phasor Toggle Button
    const btnPhasor = document.getElementById('btn-phasor-toggle');
    if (btnPhasor) {
      btnPhasor.addEventListener('click', () => {
        this.phasor.isPaused = !this.phasor.isPaused;
        btnPhasor.textContent = this.phasor.isPaused ? '▶ Reanudar' : '⏸ Pausar';
      });
    }

    // Reset Zoom for SVG
    const btnSvgZoom = document.getElementById('btn-svg-reset-zoom');
    if (btnSvgZoom) {
      btnSvgZoom.addEventListener('click', () => {
        const svg = document.querySelector('#circuit-svg-container svg');
        if (svg) svg.style.transform = 'scale(1)';
      });
    }

    // Certificate download & print
    const btnDlCert = document.getElementById('btn-download-cert');
    if (btnDlCert) btnDlCert.addEventListener('click', () => this.downloadCertificate());

    const btnPrintCert = document.getElementById('btn-print-cert');
    if (btnPrintCert) btnPrintCert.addEventListener('click', () => window.print());

    // Repeat Pending Indicators
    const btnRepeatPending = document.getElementById('btn-repeat-pending');
    if (btnRepeatPending) {
      btnRepeatPending.addEventListener('click', () => {
        // Switch to the first uncompleted or failed level
        if (this.state.scores.l1 < 15) this.switchLevelView(1);
        else if (this.state.scores.l2 < 26) this.switchLevelView(2);
        else this.switchLevelView(3);
      });
    }
  },

  /* ==========================================================================
     CIRCUIT SVG EMBED & ACCESSIBLE HOTSPOTS
     ========================================================================== */
  async loadCircuitSvg() {
    const container = document.getElementById('circuit-svg-container');
    if (!container) return;

    try {
      const res = await fetch('assets/conexion_Y-Y_equilibrada.svg');
      if (res.ok) {
        const svgText = await res.text();
        container.innerHTML = svgText;
        this.enhanceSvgInteraction();
      }
    } catch (e) {
      console.warn('No se pudo cargar SVG externo:', e);
    }
  },

  enhanceSvgInteraction() {
    const svg = document.querySelector('#circuit-svg-container svg');
    if (!svg) return;

    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Diagrama esquemático de la Red Nexo-3');

    // Add interactive click targets for phases, neutral and loads
    const phaseWires = svg.querySelectorAll('.wire');
    phaseWires.forEach((wire, i) => {
      wire.style.cursor = 'pointer';
      wire.addEventListener('click', () => {
        // Highlight corresponding item
        const identSelect = document.getElementById('sel-ident-3'); // line conductors
        if (identSelect) {
          identSelect.value = 'lineas';
          identSelect.focus();
        }
      });
    });
  },

  /* ==========================================================================
     NUMERICAL & TOLERANCE HELPERS
     ========================================================================== */
  parseNumber(str) {
    if (typeof str === 'number') return str;
    if (!str || typeof str !== 'string') return NaN;
    const clean = str.trim().replace(',', '.').replace(/[^\d.-]/g, '');
    return parseFloat(clean);
  },

  isWithinTolerance(userInput, expected, isZeroCheck = false) {
    const val = this.parseNumber(userInput);
    if (isNaN(val)) return false;

    if (isZeroCheck) {
      // Absolute tolerance ±0.05 A
      return Math.abs(val - expected) <= 0.05;
    }

    // Relative tolerance ±1%
    const diff = Math.abs((val - expected) / expected);
    return diff <= 0.01;
  },

  calculateAttemptPoints(basePts, attemptNum, isCorrect) {
    if (!isCorrect) return 0;
    if (attemptNum === 1) return basePts;
    if (attemptNum === 2) return basePts * 0.8;
    if (attemptNum === 3) return basePts * 0.6;
    return 0;
  },

  getItemAttempt(itemKey) {
    return (this.state.attempts.items[itemKey] || 0) + 1;
  },

  recordItemAttempt(itemKey, isCorrect, basePts) {
    const attempt = this.getItemAttempt(itemKey);
    this.state.attempts.items[itemKey] = attempt;
    this.state.totalAttemptsCount++;

    const earned = this.calculateAttemptPoints(basePts, attempt, isCorrect);
    const prevBest = this.state.itemScores[itemKey] || 0;
    this.state.itemScores[itemKey] = Math.max(prevBest, earned);

    return this.state.itemScores[itemKey];
  },

  /* ==========================================================================
     NIVEL 1: MAPA DE LA RED (20 PTS, UMBRAL 15 PTS)
     ========================================================================== */
  validateLevel1() {
    this.state.attempts.l1++;
    const answers = {
      fuente: document.getElementById('sel-ident-1')?.value,
      carga: document.getElementById('sel-ident-2')?.value,
      lineas: document.getElementById('sel-ident-3')?.value,
      neutro: document.getElementById('sel-ident-4')?.value,
      v_fase: document.getElementById('sel-ident-5')?.value,
      v_linea: document.getElementById('sel-ident-6')?.value,
      i_fase: document.getElementById('sel-ident-7')?.value,
      i_linea: document.getElementById('sel-ident-8')?.value
    };

    const sequenceAnswer = document.querySelector('input[name="rad-secuencia"]:checked')?.value;

    let totalL1Score = 0;
    let allIdentCorrect = true;

    // Validate 8 identifications (2 pts each)
    const expectedKeys = ['fuente', 'carga', 'lineas', 'neutro', 'v_fase', 'v_linea', 'i_fase', 'i_linea'];
    expectedKeys.forEach((key, idx) => {
      const isCorrect = answers[key] === key;
      const score = this.recordItemAttempt(`l1_ident_${key}`, isCorrect, 2);
      totalL1Score += score;

      const statEl = document.getElementById(`stat-ident-${idx + 1}`);
      if (statEl) {
        if (isCorrect) {
          statEl.textContent = `✓ Correcto (+${score.toFixed(1)} pts)`;
          statEl.className = 'item-status correct';
        } else {
          statEl.textContent = `✗ Incorrecto (Intento ${this.state.attempts.items[`l1_ident_${key}`]}/3)`;
          statEl.className = 'item-status incorrect';
          allIdentCorrect = false;
        }
      }
    });

    // Validate Sequence Question (4 pts)
    const isSeqCorrect = sequenceAnswer === 'ABC';
    const seqScore = this.recordItemAttempt('l1_secuencia', isSeqCorrect, 4);
    totalL1Score += seqScore;

    const statSeq = document.getElementById('stat-secuencia');
    if (statSeq) {
      if (isSeqCorrect) {
        statSeq.textContent = `✓ Correcto: Secuencia ABC con desfase angular de 120° (+${seqScore.toFixed(1)} pts)`;
        statSeq.className = 'item-status correct';
      } else {
        statSeq.textContent = `✗ Incorrecto. Revisa el orden en que las tensiones alcanzan sus crestas.`;
        statSeq.className = 'item-status incorrect';
      }
    }

    this.state.scores.l1 = parseFloat(totalL1Score.toFixed(1));
    this.updateHUD();

    const fbBanner = document.getElementById('feedback-l1');
    const attemptsEl = document.getElementById('attempts-l1');
    if (attemptsEl) attemptsEl.textContent = `Intentos utilizados: ${this.state.attempts.l1} / 3`;

    if (totalL1Score >= 15) {
      this.state.levelUnlocked[2] = true;
      this.state.badges[1] = true;
      if (fbBanner) {
        fbBanner.className = 'feedback-banner success';
        fbBanner.innerHTML = `🎉 <strong>¡Reto 1 Superado!</strong> Obtuviste ${totalL1Score.toFixed(1)} / 20 puntos (Umbral: 15). Has desbloqueado la insignia <strong>Explorador Y-Y</strong> y el <strong>Nivel 2</strong>.`;
        fbBanner.classList.remove('hidden');
      }
      this.updateLevelPills();
    } else {
      if (fbBanner) {
        fbBanner.className = 'feedback-banner warning';
        fbBanner.innerHTML = `⚠️ Obtuviste ${totalL1Score.toFixed(1)} / 20 puntos. Se requiere un mínimo de 15 puntos para habilitar el Nivel 2. Revisa las definiciones e intenta nuevamente o consulta a IA-Fasor.`;
        fbBanner.classList.remove('hidden');
      }
    }

    this.saveState();
    this.updateResultsView();
  },

  /* ==========================================================================
     NIVEL 2: CÁLCULO BAJO PRESIÓN (35 PTS, UMBRAL 26 PTS)
     ========================================================================== */
  validateLevel2() {
    this.state.attempts.l2++;

    // Data: Vφ = 120 V, f = 60 Hz, Rφ = 12 Ω
    const expVL = 207.85; // Math.sqrt(3) * 120
    const expIfase = 10;
    const expIlinea = 10;
    const expIneutro = 0;

    const inpVL = document.getElementById('inp-vl')?.value;
    const inpIfase = document.getElementById('inp-ifase')?.value;
    const inpIlinea = document.getElementById('inp-ilinea')?.value;
    const inpIneutro = document.getElementById('inp-ineutro')?.value;

    let totalL2Score = 0;

    // 1. Validate Magnitudes (5 pts each = 20 pts)
    const checkVL = this.isWithinTolerance(inpVL, expVL);
    const scoreVL = this.recordItemAttempt('l2_vl', checkVL, 5);
    totalL2Score += scoreVL;
    this.setFieldFeedback('fb-vl', checkVL, scoreVL, '207,85 V');

    const checkIfase = this.isWithinTolerance(inpIfase, expIfase);
    const scoreIfase = this.recordItemAttempt('l2_ifase', checkIfase, 5);
    totalL2Score += scoreIfase;
    this.setFieldFeedback('fb-ifase', checkIfase, scoreIfase, '10 A');

    const checkIlinea = this.isWithinTolerance(inpIlinea, expIlinea);
    const scoreIlinea = this.recordItemAttempt('l2_ilinea', checkIlinea, 5);
    totalL2Score += scoreIlinea;
    this.setFieldFeedback('fb-ilinea', checkIlinea, scoreIlinea, '10 A');

    const checkIneutro = this.isWithinTolerance(inpIneutro, expIneutro, true);
    const scoreIneutro = this.recordItemAttempt('l2_ineutro', checkIneutro, 5);
    totalL2Score += scoreIneutro;
    this.setFieldFeedback('fb-ineutro', checkIneutro, scoreIneutro, '0 A');

    // 2. Validate Procedure Ordering (10 pts)
    const procIdent = document.getElementById('order-step-ident')?.value;
    const procIfase = document.getElementById('order-step-ifase')?.value;
    const procIlinea = document.getElementById('order-step-ilinea')?.value;
    const procVlinea = document.getElementById('order-step-vlinea')?.value;
    const procNeutro = document.getElementById('order-step-neutro')?.value;

    const isProcCorrect =
      procIdent === '1' &&
      procIfase === '2' &&
      procIlinea === '3' &&
      procVlinea === '4' &&
      procNeutro === '5';

    const procScore = this.recordItemAttempt('l2_procedure', isProcCorrect, 10);
    totalL2Score += procScore;

    const statProc = document.getElementById('stat-procedure');
    if (statProc) {
      if (isProcCorrect) {
        statProc.textContent = `✓ Procedimiento ordenado adecuadamente (+${procScore.toFixed(1)} pts)`;
        statProc.className = 'item-status correct';
      } else {
        statProc.textContent = '✗ Secuencia incorrecta. Recuerda: identificar → calcular Iφ → igualar IL → calcular VL → verificar neutro.';
        statProc.className = 'item-status incorrect';
      }
    }

    // 3. Validate Interpretation (5 pts)
    const interpAnswer = document.querySelector('input[name="rad-interp-l2"]:checked')?.value;
    const isInterpCorrect = interpAnswer === 'valido';
    const interpScore = this.recordItemAttempt('l2_interp', isInterpCorrect, 5);
    totalL2Score += interpScore;

    const statInterp = document.getElementById('stat-interp-l2');
    if (statInterp) {
      if (isInterpCorrect) {
        statInterp.textContent = `✓ Correcto: Diferencia menor al 1% demuestra concordancia técnico-simulada (+${interpScore.toFixed(1)} pts)`;
        statInterp.className = 'item-status correct';
      } else {
        statInterp.textContent = '✗ Incorrecto. La tolerancia del 1% admite variaciones instrumentales normales.';
        statInterp.className = 'item-status incorrect';
      }
    }

    this.state.scores.l2 = parseFloat(totalL2Score.toFixed(1));
    this.updateHUD();

    const fbBanner = document.getElementById('feedback-l2');
    const attemptsEl = document.getElementById('attempts-l2');
    if (attemptsEl) attemptsEl.textContent = `Intentos utilizados: ${this.state.attempts.l2} / 3`;

    if (totalL2Score >= 26) {
      this.state.levelUnlocked[3] = true;
      this.state.badges[2] = true;
      if (fbBanner) {
        fbBanner.className = 'feedback-banner success';
        fbBanner.innerHTML = `🎉 <strong>¡Reto 2 Superado!</strong> Obtuviste ${totalL2Score.toFixed(1)} / 35 puntos (Umbral: 26). Has ganado la insignia <strong>Analista Fasorial</strong> y desbloqueado el <strong>Nivel 3</strong>.`;
        fbBanner.classList.remove('hidden');
      }
      this.updateLevelPills();
    } else {
      if (fbBanner) {
        fbBanner.className = 'feedback-banner warning';
        fbBanner.innerHTML = `⚠️ Obtuviste ${totalL2Score.toFixed(1)} / 35 puntos. El umbral para habilitar el Nivel 3 es 26 puntos. Verifica los decimales y la relación de fases.`;
        fbBanner.classList.remove('hidden');
      }
    }

    this.saveState();
    this.updateResultsView();
  },

  setFieldFeedback(elementId, isCorrect, earned, expectedText) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isCorrect) {
      el.textContent = `✓ Correcto (+${earned.toFixed(1)} pts)`;
      el.className = 'field-feedback valid';
    } else {
      el.textContent = `✗ Incorrecto (esperado: ${expectedText})`;
      el.className = 'field-feedback invalid';
    }
  },

  /* ==========================================================================
     NIVEL 3: DIAGNÓSTICO DE LA ANOMALÍA (45 PTS, UMBRAL 34 PTS)
     ========================================================================== */
  validateLevel3() {
    this.state.attempts.l3++;

    // Data: Vφ = 120 V, RA = 12 Ω, RB = 15 Ω, RC = 10 Ω
    const expIA = 10;
    const expIB = 8;
    const expIC = 12;
    const expIN = 3.464; // ~3.46 A

    const inpIA = document.getElementById('inp-ia')?.value;
    const inpIB = document.getElementById('inp-ib')?.value;
    const inpIC = document.getElementById('inp-ic')?.value;
    const inpIN = document.getElementById('inp-in-unbal')?.value;

    let totalL3Score = 0;

    // 1. Calculations (4.5 pts each = 18 pts)
    const checkIA = this.isWithinTolerance(inpIA, expIA);
    const scoreIA = this.recordItemAttempt('l3_ia', checkIA, 4.5);
    totalL3Score += scoreIA;
    this.setFieldFeedback('fb-ia', checkIA, scoreIA, '10 A');

    const checkIB = this.isWithinTolerance(inpIB, expIB);
    const scoreIB = this.recordItemAttempt('l3_ib', checkIB, 4.5);
    totalL3Score += scoreIB;
    this.setFieldFeedback('fb-ib', checkIB, scoreIB, '8 A');

    const checkIC = this.isWithinTolerance(inpIC, expIC);
    const scoreIC = this.recordItemAttempt('l3_ic', checkIC, 4.5);
    totalL3Score += scoreIC;
    this.setFieldFeedback('fb-ic', checkIC, scoreIC, '12 A');

    const checkIN = this.isWithinTolerance(inpIN, expIN);
    const scoreIN = this.recordItemAttempt('l3_in', checkIN, 4.5);
    totalL3Score += scoreIN;
    this.setFieldFeedback('fb-in-unbal', checkIN, scoreIN, '≈ 3,46 A');

    // 2. Phasor Interpretation (12 pts)
    const fasorAns = document.querySelector('input[name="rad-fasor-l3"]:checked')?.value;
    const isFasorCorrect = fasorAns === 'vectorial';
    const scoreFasor = this.recordItemAttempt('l3_fasor', isFasorCorrect, 12);
    totalL3Score += scoreFasor;

    const statFasor = document.getElementById('stat-fasor-l3');
    if (statFasor) {
      if (isFasorCorrect) {
        statFasor.textContent = `✓ Correcto: Ruptura del equilibrio fasorial provoca retorno por neutro (+${scoreFasor.toFixed(1)} pts)`;
        statFasor.className = 'item-status correct';
      } else {
        statFasor.textContent = '✗ Incorrecto. La corriente en el neutro surge de la suma vectorial de corrientes desiguales.';
        statFasor.className = 'item-status incorrect';
      }
    }

    // 3. Technical Diagnosis (8 pts)
    const diagAns = document.querySelector('input[name="rad-diag-l3"]:checked')?.value;
    const isDiagCorrect = diagAns === 'desequilibrio';
    const scoreDiag = this.recordItemAttempt('l3_diag', isDiagCorrect, 8);
    totalL3Score += scoreDiag;

    const statDiag = document.getElementById('stat-diag-l3');
    if (statDiag) {
      if (isDiagCorrect) {
        statDiag.textContent = `✓ Correcto: Diagnóstico de desequilibrio de impedancias en la Red Nexo-3 (+${scoreDiag.toFixed(1)} pts)`;
        statDiag.className = 'item-status correct';
      } else {
        statDiag.textContent = '✗ Incorrecto. Las mediciones indican impedancias desiguales de fase.';
        statDiag.className = 'item-status incorrect';
      }
    }

    // 4. Corrective Action & Critical Safety (7 pts)
    const actionAns = document.querySelector('input[name="rad-action-l3"]:checked')?.value;
    let isActionCorrect = false;

    if (actionAns === 'desconectar_neutro') {
      this.state.criticalErrorActive = true;
      this.triggerCriticalErrorAlert(
        '¡PELIGRO CRÍTICO DE SEGURIDAD ELÉCTRICA! Desconectar el neutro con cargas desequilibradas causa desplazamiento severo del neutro y sobretensiones destructivas. Debes corregir esta decisión antes de finalizar.'
      );
    } else if (actionAns === 'forzar_reinicio') {
      this.state.criticalErrorActive = true;
      this.triggerCriticalErrorAlert(
        '¡ERROR CRÍTICO! Energizar la red sin equilibrar o reparar la falla incumple las normas técnicas de seguridad de subestación. Corrige la acción antes de continuar.'
      );
    } else if (actionAns === 'balancear_cargas') {
      isActionCorrect = true;
      if (this.state.criticalErrorActive) {
        this.state.criticalErrorActive = false;
        this.state.errorsCorrectedCount++;
      }
    }

    const scoreAction = this.recordItemAttempt('l3_action', isActionCorrect, 7);
    totalL3Score += scoreAction;

    const statAction = document.getElementById('stat-action-l3');
    if (statAction) {
      if (isActionCorrect) {
        statAction.textContent = `✓ Protocolo seguro aplicado: balancear y calibrar impedancias (+${scoreAction.toFixed(1)} pts)`;
        statAction.className = 'item-status correct';
      } else {
        statAction.textContent = '⚠️ Acción insegura seleccionada. Se requiere corregir hacia un protocolo técnico seguro.';
        statAction.className = 'item-status incorrect';
      }
    }

    this.state.scores.l3 = parseFloat(totalL3Score.toFixed(1));
    this.updateHUD();

    const fbBanner = document.getElementById('feedback-l3');
    const attemptsEl = document.getElementById('attempts-l3');
    if (attemptsEl) attemptsEl.textContent = `Intentos utilizados: ${this.state.attempts.l3} / 3`;

    if (totalL3Score >= 34 && !this.state.criticalErrorActive) {
      this.state.badges[3] = true;
      this.state.missionCompleted = true;
      if (fbBanner) {
        fbBanner.className = 'feedback-banner success';
        fbBanner.innerHTML = `🏆 <strong>¡MISIÓN CUMPLIDA!</strong> Has alcanzado ${totalL3Score.toFixed(1)} / 45 puntos en el Reto Final y has desbloqueado la distinción <strong>Guardián del Equilibrio</strong>. Dirígete a la pestaña de <strong>Resultados</strong> para verificar tu dictamen.`;
        fbBanner.classList.remove('hidden');
      }
    } else if (this.state.criticalErrorActive) {
      if (fbBanner) {
        fbBanner.className = 'feedback-banner error';
        fbBanner.innerHTML = `🚨 <strong>ERROR CRÍTICO BLOQUEANTE:</strong> Se ha detectado una decisión de alto riesgo eléctrico. Corrige la acción correctiva seleccionando el procedimiento seguro de balanceo de cargas para poder validar tu misión.`;
        fbBanner.classList.remove('hidden');
      }
    } else {
      if (fbBanner) {
        fbBanner.className = 'feedback-banner warning';
        fbBanner.innerHTML = `⚠️ Obtuviste ${totalL3Score.toFixed(1)} / 45 puntos (Umbral: 34). Revisa los cálculos fasoriales y el diagnóstico técnico.`;
        fbBanner.classList.remove('hidden');
      }
    }

    this.saveState();
    this.updateResultsView();
  },

  triggerCriticalErrorAlert(msg) {
    alert(msg);
  },

  /* ==========================================================================
     PHASOR ANIMATION CANVAS (SVG / CANVAS 120°)
     ========================================================================== */
  initPhasorCanvas() {
    this.phasor.canvas = document.getElementById('canvas-phasor');
    if (!this.phasor.canvas) return;
    this.phasor.ctx = this.phasor.canvas.getContext('2d');
    this.renderPhasorLoop();
  },

  renderPhasorLoop() {
    const loop = () => {
      if (!this.phasor.isPaused && !document.body.classList.contains('reduced-motion')) {
        this.phasor.angle += this.phasor.speed;
        if (this.phasor.angle >= Math.PI * 2) this.phasor.angle -= Math.PI * 2;
      }
      this.drawPhasors();
      this.phasor.animId = requestAnimationFrame(loop);
    };
    this.phasor.animId = requestAnimationFrame(loop);
  },

  drawPhasors() {
    const { canvas, ctx, angle } = this.phasor;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radiusV = 100;
    const radiusI = 60;

    ctx.clearRect(0, 0, w, h);

    // Grid circles
    ctx.strokeStyle = '#1a3055';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusV, 0, Math.PI * 2);
    ctx.arc(cx, cy, radiusI, 0, Math.PI * 2);
    ctx.stroke();

    // Coordinate Axes
    ctx.strokeStyle = '#274474';
    ctx.beginPath();
    ctx.moveTo(10, cy);
    ctx.lineTo(w - 10, cy);
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, h - 10);
    ctx.stroke();

    // 3 Phases Angles: 0°, -120° (-2π/3), +120° (+2π/3)
    const phases = [
      { name: 'A', ang: angle, color: '#ff6b6b' },
      { name: 'B', ang: angle - (2 * Math.PI) / 3, color: '#00f0ff' },
      { name: 'C', ang: angle + (2 * Math.PI) / 3, color: '#ffd166' }
    ];

    phases.forEach(p => {
      // Voltage Vector
      const vx = cx + radiusV * Math.cos(p.ang);
      const vy = cy + radiusV * Math.sin(p.ang);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(vx, vy);
      ctx.stroke();

      // Voltage Arrow Head
      this.drawArrowhead(ctx, cx, cy, vx, vy, p.color);

      // Voltage Label
      ctx.fillStyle = p.color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`V_${p.name}`, vx + 6, vy + 4);

      // Current Vector (in-phase because pure resistive load)
      const ix = cx + radiusI * Math.cos(p.ang);
      const iy = cy + radiusI * Math.sin(p.ang);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ix, iy);
      ctx.stroke();

      this.drawArrowhead(ctx, cx, cy, ix, iy, '#ffffff');
    });

    // Center Origin Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legend
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('Radio ext: V_φ (120 V) · Radio int: I_φ (10 A)', 12, h - 12);
  },

  drawArrowhead(ctx, fromx, fromy, tox, toy, color) {
    const headlen = 8;
    const dx = tox - fromx;
    const dy = toy - fromy;
    const theta = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(theta - Math.PI / 6), toy - headlen * Math.sin(theta - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(theta + Math.PI / 6), toy - headlen * Math.sin(theta + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  },

  /* ==========================================================================
     HUD & RESULTS VIEW
     ========================================================================== */
  updateHUD() {
    const total = parseFloat((this.state.scores.l1 + this.state.scores.l2 + this.state.scores.l3).toFixed(1));
    this.state.scores.total = total;

    const totalEl = document.getElementById('hud-total-score');
    if (totalEl) totalEl.textContent = total.toFixed(1);

    const badgeNavEl = document.getElementById('nav-score-badge');
    if (badgeNavEl) badgeNavEl.textContent = `${total.toFixed(1)} pts`;

    // Energy bar reflection
    const energyBar = document.getElementById('hud-energy-bar');
    const energyText = document.getElementById('hud-energy-text');
    if (energyBar && energyText) {
      if (this.state.criticalErrorActive) {
        energyBar.style.width = '25%';
        energyBar.className = 'energy-fill danger';
        energyText.textContent = 'PELIGRO CRÍTICO';
      } else {
        const pct = Math.max(30, Math.min(100, Math.round((total / 100) * 100)));
        energyBar.style.width = `${pct}%`;
        energyBar.className = 'energy-fill';
        energyText.textContent = total >= 80 ? 'RED RESTAURADA' : `${pct}% ESTABILIDAD`;
      }
    }

    // Badges HUD slots
    const b1 = document.getElementById('slot-badge-1');
    const b2 = document.getElementById('slot-badge-2');
    const b3 = document.getElementById('slot-badge-3');

    if (b1) {
      b1.className = this.state.badges[1] ? 'badge-slot unlocked' : 'badge-slot locked';
      b1.textContent = this.state.badges[1] ? '🎖️ Explorador Y-Y' : '🔒 Explorador Y-Y';
    }
    if (b2) {
      b2.className = this.state.badges[2] ? 'badge-slot unlocked' : 'badge-slot locked';
      b2.textContent = this.state.badges[2] ? '⚡ Analista Fasorial' : '🔒 Analista Fasorial';
    }
    if (b3) {
      b3.className = this.state.badges[3] ? 'badge-slot unlocked' : 'badge-slot locked';
      b3.textContent = this.state.badges[3] ? '🛡️ Guardián del Equilibrio' : '🔒 Guardián';
    }

    this.updateLevelPills();
  },

  updateLevelPills() {
    [1, 2, 3].forEach(lvl => {
      const pill = document.getElementById(`btn-lvl-${lvl}`);
      if (pill) {
        if (this.state.levelUnlocked[lvl]) {
          pill.classList.remove('locked');
          pill.classList.add('unlocked');
          pill.disabled = false;
          pill.textContent = `Nivel ${lvl}`;
        } else {
          pill.classList.add('locked');
          pill.classList.remove('unlocked');
          pill.disabled = true;
          pill.textContent = `Nivel ${lvl} 🔒`;
        }
      }
    });
  },

  switchLevelView(lvl) {
    this.state.currentLevel = lvl;
    [1, 2, 3].forEach(l => {
      const container = document.getElementById(`level-container-${l}`);
      const pill = document.getElementById(`btn-lvl-${l}`);
      if (container) {
        if (l === lvl) {
          container.classList.add('active');
          container.hidden = false;
        } else {
          container.classList.remove('active');
          container.hidden = true;
        }
      }
      if (pill) {
        pill.classList.toggle('active', l === lvl);
        pill.setAttribute('aria-selected', l === lvl);
      }
    });
  },

  updateResultsView() {
    const total = this.state.scores.total;
    const l1 = this.state.scores.l1;
    const l2 = this.state.scores.l2;
    const l3 = this.state.scores.l3;

    const resScoreEl = document.getElementById('res-final-score');
    if (resScoreEl) resScoreEl.textContent = total.toFixed(1);

    const mN1 = document.getElementById('metric-n1');
    const mN2 = document.getElementById('metric-n2');
    const mN3 = document.getElementById('metric-n3');
    const mAtt = document.getElementById('metric-attempts');
    const mErr = document.getElementById('metric-errors');

    if (mN1) mN1.textContent = `${l1.toFixed(1)} / 20`;
    if (mN2) mN2.textContent = `${l2.toFixed(1)} / 35`;
    if (mN3) mN3.textContent = `${l3.toFixed(1)} / 45`;
    if (mAtt) mAtt.textContent = `${this.state.totalAttemptsCount}`;
    if (mErr) mErr.textContent = `${this.state.errorsCorrectedCount}`;

    const titleEl = document.getElementById('res-status-title');
    const descEl = document.getElementById('res-status-desc');
    const boxRecovery = document.getElementById('box-recovery-route');
    const boxCert = document.getElementById('box-certificate');

    const l1Pass = l1 >= 15;
    const l2Pass = l2 >= 26;
    const l3Pass = l3 >= 34;
    const allThresholdsMet = l1Pass && l2Pass && l3Pass;

    if (total >= 90 && allThresholdsMet && !this.state.criticalErrorActive) {
      if (titleEl) titleEl.textContent = '¡Misión Cumplida con Excelencia!';
      if (descEl) descEl.textContent = 'Has demostrado dominio completo en el análisis de redes trifásicas y has neutralizado la anomalía en la Red Nexo-3.';
      if (boxRecovery) boxRecovery.classList.add('hidden');
      if (boxCert) {
        boxCert.classList.remove('hidden');
        this.renderCertificate(total);
      }
    } else if (total >= 80 && allThresholdsMet && !this.state.criticalErrorActive) {
      if (titleEl) titleEl.textContent = 'Misión Superada Satisfactoriamente';
      if (descEl) descEl.textContent = 'Cumples con el estándar institucional del 80% y los tres umbrales de nivel. El laboratorio puede operar de manera segura.';
      if (boxRecovery) boxRecovery.classList.add('hidden');
      if (boxCert) boxCert.classList.add('hidden');
    } else {
      if (titleEl) titleEl.textContent = 'Misión Pendiente · Requiere Recuperación';
      if (descEl) descEl.textContent = 'Aún no se alcanza el 80% mínimo o existen umbrales de nivel no superados / errores críticos pendientes.';
      if (boxRecovery) {
        boxRecovery.classList.remove('hidden');
        this.renderRecoveryRoute();
      }
      if (boxCert) boxCert.classList.add('hidden');
    }

    this.renderStrengthsAndAreas();
  },

  renderStrengthsAndAreas() {
    const listFort = document.getElementById('list-fortalezas');
    const listRef = document.getElementById('list-reforzar');
    if (!listFort || !listRef) return;

    listFort.innerHTML = '';
    listRef.innerHTML = '';

    const l1 = this.state.scores.l1;
    const l2 = this.state.scores.l2;
    const l3 = this.state.scores.l3;

    if (l1 >= 15) {
      listFort.innerHTML += '<li>Identificación topológica clara de fases, neutro y magnitudes en conexión estrella (Y-Y).</li>';
    } else {
      listRef.innerHTML += '<li>Diferenciación entre voltaje de fase (Vφ) y voltaje de línea (VL), y secuencia ABC.</li>';
    }

    if (l2 >= 26) {
      listFort.innerHTML += '<li>Cálculo analítico exacto de magnitudes trifásicas equilibradas y ordenamiento procedimental lógico.</li>';
    } else {
      listRef.innerHTML += '<li>Aplicación de la Ley de Ohm por fase y la relación de escala VL = √3 · Vφ.</li>';
    }

    if (l3 >= 34 && !this.state.criticalErrorActive) {
      listFort.innerHTML += '<li>Diagnóstico riguroso de desequilibrio de cargas y aplicación de protocolos de seguridad eléctrica.</li>';
    } else {
      listRef.innerHTML += '<li>Comprensión de la suma fasorial de corrientes en el conductor neutro (|IN| ≈ 3,46 A) y prevención de errores críticos.</li>';
    }

    if (!listRef.innerHTML || listRef.innerHTML.trim() === '') {
      listRef.innerHTML = '<li>No se identificaron aspectos pendientes. El estudiante alcanzó todos los indicadores de aprendizaje y seguridad.</li>';
    }
  },

  renderRecoveryRoute() {
    const container = document.getElementById('recovery-recommendations');
    if (!container) return;

    container.innerHTML = '';
    const l1 = this.state.scores.l1;
    const l2 = this.state.scores.l2;
    const l3 = this.state.scores.l3;

    if (l1 < 15) {
      container.innerHTML += `
        <div class="recovery-rec-card">
          <strong>Refuerzo para Nivel 1 (Mapa de la Red):</strong>
          <p>Revisa el <em>Recurso 2 (Infografía de secuencias)</em> y el <em>Recurso 3 (Conexión estrella)</em>. Recuerda que el voltaje de línea une dos fases vivas y el de fase une una fase con el neutro.</p>
        </div>
      `;
    }

    if (l2 < 26) {
      container.innerHTML += `
        <div class="recovery-rec-card">
          <strong>Refuerzo para Nivel 2 (Cálculo bajo Presión):</strong>
          <p>Utiliza la relación VL = √3 × 120 = 207,85 V. En una carga en estrella resistiva de 12 Ω, la corriente es 120/12 = 10 A y en el neutro no circula corriente (IN = 0 A).</p>
        </div>
      `;
    }

    if (l3 < 34 || this.state.criticalErrorActive) {
      container.innerHTML += `
        <div class="recovery-rec-card">
          <strong>Refuerzo para Nivel 3 (Diagnóstico y Seguridad):</strong>
          <p>¡Atención de seguridad! Jamás desconectes el conductor neutro bajo desequilibrio. La solución correcta consiste en <strong>balancear las impedancias de carga</strong>.</p>
        </div>
      `;
    }
  },

  /* ==========================================================================
     CERTIFICATE CANVAS RENDERING (SYMBOLIC FOR 90-100 PTS)
     ========================================================================== */
  renderCertificate(totalScore) {
    const canvas = document.getElementById('canvas-certificate');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background parchment/cream
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Outer Decorative Borders
    ctx.strokeStyle = '#0b1a30';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    // Inner Corner Ornaments
    ctx.fillStyle = '#c59b27';
    ctx.fillRect(34, 34, 16, 16);
    ctx.fillRect(w - 50, 34, 16, 16);
    ctx.fillRect(34, h - 50, 16, 16);
    ctx.fillRect(w - 50, h - 50, 16, 16);

    // Header Institutional Text (dos líneas solicitadas)
    ctx.fillStyle = '#0b1a30';
    ctx.font = 'bold 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POSGRADOS · MAESTRÍA EN EDUCACIÓN', w / 2, 68);

    ctx.fillStyle = '#1e3a6a';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.fillText('Ecosistema educativo aplicado a Análisis de Circuitos Eléctricos – Electromecánica', w / 2, 92);

    // Reconocimiento formativo simbólico visible
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('Reconocimiento formativo simbólico', w / 2, 118);

    // Title of Award
    ctx.fillStyle = '#0b1a30';
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillText('CERTIFICACIÓN DE RESTAURACIÓN Y EQUILIBRIO', w / 2, 158);

    ctx.fillStyle = '#1e3a6a';
    ctx.font = 'italic 15px serif';
    ctx.fillText('Se confiere la distinción de honor y mérito académico como:', w / 2, 190);

    ctx.fillStyle = '#c59b27';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText('GUARDIÁN DEL EQUILIBRIO', w / 2, 230);

    // Space for student name (conserva espacio en blanco para escribir o firmar)
    ctx.fillStyle = '#475569';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText('A favor de:', w / 2, 272);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 220, 312);
    ctx.lineTo(w / 2 + 220, 312);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('[ Escriba o firme su nombre aquí tras la descarga ]', w / 2, 332);

    // Text of achievement
    ctx.fillStyle = '#334155';
    ctx.font = '14px Outfit, sans-serif';
    const textDesc = `Por haber analizado, modelado y resuelto con éxito la contingencia en la Red Nexo-3`;
    const textDesc2 = `demostrando un puntaje de excelencia de ${totalScore.toFixed(1)} / 100 puntos en Análisis de Circuitos Eléctricos.`;
    ctx.fillText(textDesc, w / 2, 372);
    ctx.fillText(textDesc2, w / 2, 394);

    // Signatures & Institution Seals
    const ySign = 485;
    ctx.strokeStyle = '#0b1a30';
    ctx.lineWidth = 1;

    // Docente
    ctx.beginPath();
    ctx.moveTo(120, ySign);
    ctx.lineTo(360, ySign);
    ctx.stroke();

    ctx.fillStyle = '#0b1a30';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('MSc. Felipe Emiliano Arévalo Cordovilla', 240, ySign + 20);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText('Docente de la asignatura', 240, ySign + 36);

    // Equipo Responsable
    ctx.beginPath();
    ctx.moveTo(w - 360, ySign);
    ctx.lineTo(w - 120, ySign);
    ctx.stroke();

    ctx.fillStyle = '#0b1a30';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('Equipo responsable – Grupo N.º 4', w - 240, ySign + 20);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText('Validación Pedagógica y Técnica 2026', w - 240, ySign + 36);

    // Security Verification Hash at bottom
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    const hashStr = `VERIFICACIÓN: UNEMI-NEXO3-${Date.now().toString(36).toUpperCase()}-CC-BY-SA-4.0`;
    ctx.fillText(hashStr, w / 2, h - 38);
  },

  downloadCertificate() {
    const canvas = document.getElementById('canvas-certificate');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'Certificado_Guardian_del_Equilibrio_UNEMI.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  /* ==========================================================================
     IA-FASOR CONSULTATION SHORTCUT FROM LEVELS
     ========================================================================== */
  consultTutorFromLevel(levelNum) {
    let errCategory = 'Fórmula';
    let electData = '';
    let studentAns = '';

    if (levelNum === 1) {
      errCategory = 'Confusión fase-línea';
      electData = 'Identificación topológica de fuente en estrella, carga en estrella y conductores de fase y neutro.';
      studentAns = document.getElementById('sel-ident-1')?.value || '';
    } else if (levelNum === 2) {
      errCategory = 'Fórmula';
      electData = 'Vφ = 120 V, f = 60 Hz, Rφ = 12 Ω equilibrado. Relaciones: VL = √3·Vφ, IL = Iφ, IN = 0 A.';
      studentAns = `VL=${document.getElementById('inp-vl')?.value}, Iφ=${document.getElementById('inp-ifase')?.value}`;
    } else if (levelNum === 3) {
      errCategory = this.state.criticalErrorActive ? 'Seguridad' : 'Diagnóstico de desequilibrio';
      electData = 'Vφ = 120 V, RA = 12 Ω, RB = 15 Ω, RC = 10 Ω desequilibrado. IA=10 A, IB=8 A, IC=12 A, |IN| ≈ 3.46 A.';
      studentAns = `IA=${document.getElementById('inp-ia')?.value}, IN=${document.getElementById('inp-in-unbal')?.value}`;
    }

    // Switch to Tutor Section
    const tabTutor = document.getElementById('tab-tutor');
    if (tabTutor) tabTutor.click();

    // Query tutor
    AITutor.queryTutor({
      levelId: `nivel-${levelNum}`,
      electricalData: electData,
      studentAnswer: studentAns,
      attemptNumber: this.state.attempts[`l${levelNum}`] || 1,
      errorCategory: errCategory,
      helpLevel: 'orientacion'
    });
  },

  resetExperience() {
    if (!confirm('¿Deseas reiniciar por completo los tres retos y puntuaciones de la Red Nexo-3?')) return;
    localStorage.removeItem('unemi_nexo3_gamestate');
    this.state.scores = { l1: 0, l2: 0, l3: 0, total: 0 };
    this.state.attempts = { l1: 0, l2: 0, l3: 0, items: {} };
    this.state.itemScores = {};
    this.state.levelUnlocked = { 1: true, 2: false, 3: false };
    this.state.badges = { 1: false, 2: false, 3: false };
    this.state.criticalErrorActive = false;
    this.state.errorsCorrectedCount = 0;
    this.state.totalAttemptsCount = 0;
    this.state.missionCompleted = false;

    // Reset inputs
    document.querySelectorAll('.form-select').forEach(s => s.value = '');
    document.querySelectorAll('.form-control').forEach(i => i.value = '');
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    document.querySelectorAll('.item-status, .field-feedback').forEach(el => el.textContent = '');
    document.querySelectorAll('.feedback-banner').forEach(el => el.classList.add('hidden'));

    this.switchLevelView(1);
    this.updateHUD();
    this.updateResultsView();
  }
};
