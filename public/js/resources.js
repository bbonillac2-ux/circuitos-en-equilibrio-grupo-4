/**
 * Módulo de Recursos Educativos (Centro de Preparación)
 * UNEMI Posgrados - Análisis de Circuitos Eléctricos
 */

export const ResourcesManager = {
  resources: [
    {
      id: 1,
      title: 'De la onda al fasor: parámetros de una señal alterna',
      tool: 'NotebookLM',
      type: 'video',
      url: 'https://notebook.google.com/notebook/a31ed613-5d51-491f-802a-4beb6a6c469b/artifact/b11184cc-04ca-4955-bf21-97904e0d8878?utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1',
      correctQuiz: 'B',
      reviewed: false
    },
    {
      id: 2,
      title: 'Fasores trifásicos: secuencias ABC y ACB',
      tool: 'NotebookLM',
      type: 'infografia',
      url: 'https://notebook.google.com/notebook/a31ed613-5d51-491f-802a-4beb6a6c469b/artifact/d95668b8-3e22-40dd-91e5-fc2fd27c656f?utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1',
      correctQuiz: 'B',
      reviewed: false
    },
    {
      id: 3,
      title: 'Conexión trifásica Y-Y equilibrada: voltajes, corrientes y neutro',
      tool: 'NotebookLM',
      type: 'audio',
      url: 'https://notebook.google.com/notebook/ba90f627-4460-4662-a4fc-c8496aaba4b0/artifact/1eeacf63-a3d7-4554-a587-4fe141b9f4a4?utm_content=&utm_smc=nlm_web_share_google_oo_art_share_1',
      correctQuiz: 'B',
      reviewed: false
    },
    {
      id: 4,
      title: 'Laboratorio interactivo: simulación de una conexión trifásica Y-Y equilibrada',
      tool: 'Genially & NotebookLM',
      type: 'lab',
      url: 'https://view.genially.com/6a867185fa694738e3ec6bcc',
      correctQuiz: 'B',
      reviewed: false
    }
  ],

  init() {
    this.loadState();
    this.bindEvents();
    this.updateUI();
  },

  loadState() {
    try {
      const saved = localStorage.getItem('unemi_resources_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.resources.forEach(r => {
          if (parsed[r.id] !== undefined) {
            r.reviewed = Boolean(parsed[r.id]);
          }
        });
      }
    } catch (e) {
      console.warn('Error cargando estado de recursos:', e);
    }
  },

  saveState() {
    try {
      const state = {};
      this.resources.forEach(r => {
        state[r.id] = r.reviewed;
      });
      localStorage.setItem('unemi_resources_state', JSON.stringify(state));
    } catch (e) {
      console.warn('Error guardando estado de recursos:', e);
    }
  },

  bindEvents() {
    // Checkboxes "Marcar como revisado"
    document.querySelectorAll('.chk-res-reviewed').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.resourceId, 10);
        this.setReviewed(id, e.target.checked);
      });
    });

    // Botones de comprobación rápida
    document.querySelectorAll('.btn-check-quiz').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const quizId = parseInt(e.target.dataset.quizId, 10);
        this.validateQuiz(quizId);
      });
    });

    // Botones "Ver recurso interactivo" (Modal)
    document.querySelectorAll('.btn-open-resource').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.resourceId, 10);
        this.openModal(id);
      });
    });

    // Acciones del modal
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-modal-cancel');
    const btnMarkReviewed = document.getElementById('btn-modal-mark-reviewed');
    const modal = document.getElementById('modal-resource');

    if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
    if (btnCancel) btnCancel.addEventListener('click', () => this.closeModal());
    if (btnMarkReviewed) {
      btnMarkReviewed.addEventListener('click', () => {
        if (this.currentModalId) {
          this.setReviewed(this.currentModalId, true);
        }
        this.closeModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }
  },

  currentModalId: null,

  openModal(resourceId) {
    const res = this.resources.find(r => r.id === resourceId);
    if (!res) return;

    this.currentModalId = resourceId;
    const modal = document.getElementById('modal-resource');
    const iframe = document.getElementById('resource-iframe');
    const modalTitle = document.getElementById('modal-res-title');
    const extBtn = document.getElementById('btn-modal-external');
    const fallbackBox = document.getElementById('modal-fallback-box');

    if (modalTitle) modalTitle.textContent = `${res.tool}: ${res.title}`;
    if (extBtn) extBtn.href = res.url;

    // Reset iframe & fallback
    if (fallbackBox) fallbackBox.classList.add('hidden');
    if (iframe) {
      iframe.src = res.url;
      // If error or blocked by X-Frame-Options
      iframe.onerror = () => {
        if (fallbackBox) fallbackBox.classList.remove('hidden');
      };
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.focus();
    }
  },

  closeModal() {
    const modal = document.getElementById('modal-resource');
    const iframe = document.getElementById('resource-iframe');
    if (iframe) iframe.src = '';
    if (modal) modal.classList.add('hidden');
    this.currentModalId = null;
  },

  validateQuiz(quizId) {
    const res = this.resources.find(r => r.id === quizId);
    if (!res) return;

    const selectedRadio = document.querySelector(`input[name="quiz${quizId}"]:checked`);
    const fbEl = document.getElementById(`quiz-feedback-${quizId}`);
    if (!fbEl) return;

    if (!selectedRadio) {
      fbEl.textContent = 'Selecciona una respuesta para verificar.';
      fbEl.className = 'quiz-feedback error';
      return;
    }

    if (selectedRadio.value === res.correctQuiz) {
      fbEl.textContent = '¡Correcto! Has interpretado satisfactoriamente el parámetro técnico.';
      fbEl.className = 'quiz-feedback success';
      // Automatically mark as reviewed upon passing quiz
      this.setReviewed(quizId, true);
    } else {
      fbEl.textContent = 'Respuesta incorrecta. Revisa nuevamente el concepto en el recurso e inténtalo otra vez.';
      fbEl.className = 'quiz-feedback error';
    }
  },

  setReviewed(resourceId, isReviewed) {
    const res = this.resources.find(r => r.id === resourceId);
    if (res) {
      res.reviewed = isReviewed;
      this.saveState();
      this.updateUI();

      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('unemi:resourceUpdated', {
          detail: { resourceId, isReviewed, totalReviewed: this.getReviewedCount() }
        }));
      }
    }
  },

  getReviewedCount() {
    return this.resources.filter(r => r.reviewed).length;
  },

  updateUI() {
    const count = this.getReviewedCount();
    const counterEl = document.getElementById('resources-counter');
    const barEl = document.getElementById('resources-progress-bar');
    const badgeEl = document.getElementById('nav-res-badge');
    const metricEl = document.getElementById('metric-resources');

    if (counterEl) counterEl.textContent = `${count} / 4`;
    if (barEl) {
      const fill = barEl.querySelector('.progress-bar-fill');
      const pct = (count / 4) * 100;
      if (fill) fill.style.width = `${pct}%`;
      barEl.setAttribute('aria-valuenow', count);
    }
    if (badgeEl) badgeEl.textContent = `${count}/4`;
    if (metricEl) metricEl.textContent = `${count} / 4`;

    // Sync Checkboxes
    this.resources.forEach(r => {
      const chk = document.getElementById(`chk-res-${r.id}`);
      if (chk) chk.checked = r.reviewed;
    });

    // Control del botón "Comenzar los Retos Gamificados"
    const btnGotoGame = document.querySelector('.btn-goto-game');
    if (btnGotoGame) {
      if (count < 4) {
        btnGotoGame.disabled = true;
        btnGotoGame.setAttribute('aria-disabled', 'true');
        btnGotoGame.classList.add('btn-disabled');
        btnGotoGame.innerHTML = `Completa la preparación (4/4 recursos revisados) para comenzar los Retos <span aria-hidden="true">🔒</span>`;
        btnGotoGame.title = `Progreso actual: ${count}/4. Revisa los cuatro recursos para desbloquear los retos gamificados.`;
      } else {
        btnGotoGame.disabled = false;
        btnGotoGame.removeAttribute('aria-disabled');
        btnGotoGame.classList.remove('btn-disabled');
        btnGotoGame.innerHTML = `¡Preparación completa! Comenzar los Retos Gamificados <span aria-hidden="true">➔</span>`;
        btnGotoGame.title = 'Preparación 4/4 completa. Haz clic para iniciar los retos gamificados.';
      }
    }
  },

  reset() {
    this.resources.forEach(r => { r.reviewed = false; });
    this.saveState();
    this.updateUI();
  }
};
