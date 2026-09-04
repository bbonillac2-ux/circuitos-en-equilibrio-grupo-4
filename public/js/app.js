/**
 * Módulo Principal de la Aplicación
 * "Circuitos en Equilibrio: Misión Equilibrio – Rescate de la Red Nexo-3"
 * UNEMI Posgrados - Análisis de Circuitos Eléctricos (2026)
 */

import { ResourcesManager } from './resources.js';
import { GameEngine } from './game.js';
import { AITutor } from './ai-tutor.js';

// Global error handler for UNEMI Logo
window.handleLogoError = function() {
  console.warn('[AVISO DESARROLLADOR]: El archivo "public/assets/unemi-posgrados.png" no se pudo cargar. Activando contenedor reservado reglamentario.');
  const logoImg = document.getElementById('unemi-logo');
  const fallbackBox = document.getElementById('logo-fallback');
  if (logoImg) logoImg.style.display = 'none';
  if (fallbackBox) fallbackBox.classList.remove('hidden');
};

export const App = {
  activeTab: 'inicio',

  init() {
    this.setupTabs();
    this.setupAccessibilityControls();
    this.setupGlobalButtons();
    this.setupKeyboardNavigation();

    // Initialize submodules
    ResourcesManager.init();
    GameEngine.init();
    AITutor.init();

    // Listen to resource updates
    window.addEventListener('unemi:resourceUpdated', (e) => {
      this.showToast(`Centro de preparación: ${e.detail.totalReviewed}/4 recursos revisados`, 'success');
      GameEngine.updateResultsView();
    });

    console.log('⚡ Aplicación "Circuitos en Equilibrio" inicializada con éxito.');
  },

  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetSectionId = tab.getAttribute('aria-controls');
        this.switchSection(targetSectionId, tab);
      });
    });
  },

  switchSection(sectionId, activeTabElement) {
    // Hide all panels
    document.querySelectorAll('.section-panel').forEach(panel => {
      panel.classList.remove('active');
      panel.hidden = true;
    });

    // Unselect all tabs
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    // Activate target panel
    const targetPanel = document.getElementById(sectionId);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.hidden = false;
      targetPanel.focus();
    }

    if (activeTabElement) {
      activeTabElement.classList.add('active');
      activeTabElement.setAttribute('aria-selected', 'true');
    } else {
      // Find tab by controls
      const matchingTab = document.querySelector(`.nav-tab[aria-controls="${sectionId}"]`);
      if (matchingTab) {
        matchingTab.classList.add('active');
        matchingTab.setAttribute('aria-selected', 'true');
      }
    }

    this.activeTab = sectionId.replace('section-', '');
    this.announceToScreenReader(`Navegando a la sección ${activeTabElement ? activeTabElement.textContent.trim() : sectionId}`);

    // If switching to game, redraw phasor and recalculate
    if (this.activeTab === 'juego') {
      GameEngine.updateHUD();
    } else if (this.activeTab === 'resultados') {
      GameEngine.updateResultsView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setupAccessibilityControls() {
    // Reduce Motion Toggle
    const btnMotion = document.getElementById('btn-toggle-motion');
    if (btnMotion) {
      btnMotion.addEventListener('click', () => {
        const isReduced = document.body.classList.toggle('reduced-motion');
        btnMotion.setAttribute('aria-pressed', isReduced);
        btnMotion.title = isReduced ? 'Animaciones pausadas/reducidas' : 'Animaciones activas';
        this.showToast(isReduced ? 'Animaciones reducidas' : 'Animaciones activadas', 'warning');
      });
    }

    // High Contrast Toggle
    const btnContrast = document.getElementById('btn-toggle-contrast');
    if (btnContrast) {
      btnContrast.addEventListener('click', () => {
        const isHighContrast = document.body.classList.toggle('high-contrast');
        btnContrast.setAttribute('aria-pressed', isHighContrast);
        this.showToast(isHighContrast ? 'Modo de alto contraste activado' : 'Contraste estándar', 'warning');
      });
    }
  },

  setupGlobalButtons() {
    // Start Mission CTA
    const btnStart = document.getElementById('btn-start-mission');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const tabJuego = document.getElementById('tab-juego');
        if (tabJuego) tabJuego.click();
      });
    }

    // View Objectives CTA
    const btnObjectives = document.getElementById('btn-view-objectives');
    if (btnObjectives) {
      btnObjectives.addEventListener('click', () => {
        const tabMision = document.getElementById('tab-mision');
        if (tabMision) tabMision.click();
      });
    }

    // Go to resources button
    const btnGotoRes = document.querySelector('.btn-goto-resources');
    if (btnGotoRes) {
      btnGotoRes.addEventListener('click', () => {
        const tabRes = document.getElementById('tab-recursos');
        if (tabRes) tabRes.click();
      });
    }

    // Go to game button from resources
    const btnGotoGame = document.querySelector('.btn-goto-game');
    if (btnGotoGame) {
      btnGotoGame.addEventListener('click', () => {
        const tabJuego = document.getElementById('tab-juego');
        if (tabJuego) tabJuego.click();
      });
    }

    // Go to credits button
    const btnGotoCredits = document.getElementById('btn-goto-credits');
    if (btnGotoCredits) {
      btnGotoCredits.addEventListener('click', () => {
        const tabCred = document.getElementById('tab-creditos');
        if (tabCred) tabCred.click();
      });
    }

    // Global Reset Buttons
    const btnResetAll = document.getElementById('btn-reset-all');
    const btnRepeatAll = document.getElementById('btn-repeat-all');

    const handleFullReset = () => {
      if (confirm('¿Estás seguro de reiniciar todo el progreso, incluyendo recursos e insignias?')) {
        ResourcesManager.reset();
        GameEngine.resetExperience();
        this.showToast('Toda la experiencia ha sido reiniciada.', 'warning');
        const tabInicio = document.getElementById('tab-inicio');
        if (tabInicio) tabInicio.click();
      }
    };

    if (btnResetAll) btnResetAll.addEventListener('click', handleFullReset);
    if (btnRepeatAll) btnRepeatAll.addEventListener('click', handleFullReset);
  },

  setupKeyboardNavigation() {
    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ResourcesManager.closeModal();
      }
    });

    // Arrow keys between tabs
    const navTabs = Array.from(document.querySelectorAll('.nav-tab'));
    navTabs.forEach((tab, idx) => {
      tab.addEventListener('keydown', (e) => {
        let targetIdx = null;
        if (e.key === 'ArrowRight') {
          targetIdx = (idx + 1) % navTabs.length;
        } else if (e.key === 'ArrowLeft') {
          targetIdx = (idx - 1 + navTabs.length) % navTabs.length;
        }

        if (targetIdx !== null) {
          e.preventDefault();
          navTabs[targetIdx].focus();
          navTabs[targetIdx].click();
        }
      });
    });
  },

  announceToScreenReader(message) {
    const announcer = document.getElementById('live-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '🚨';

    toast.innerHTML = `<span aria-hidden="true">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Auto-boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
