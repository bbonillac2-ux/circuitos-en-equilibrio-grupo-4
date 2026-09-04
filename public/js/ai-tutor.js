/**
 * Módulo de Comunicación con el Tutor Socrático IA-Fasor
 * UNEMI Posgrados - Análisis de Circuitos Eléctricos
 */

export const AITutor = {
  isRequestPending: false,

  init() {
    this.bindEvents();
    this.checkHealth();
  },

  bindEvents() {
    const form = document.getElementById('form-tutor');
    const textarea = document.getElementById('tutor-user-input');
    const charCount = document.getElementById('tutor-char-count');

    if (textarea && charCount) {
      textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length} / 400`;
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleUserSubmit();
      });
    }

    // Shortcut pills
    document.querySelectorAll('.shortcut-pills .btn-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const question = e.target.dataset.ask;
        if (question && textarea) {
          textarea.value = question;
          textarea.focus();
          if (charCount) charCount.textContent = `${question.length} / 400`;
        }
      });
    });
  },

  updateVisualStatus(isConnected) {
    const statusLabel = document.getElementById('tutor-status-label');
    const statusBadge = document.getElementById('tutor-engine-status');
    const fallbackAlert = document.getElementById('tutor-fallback-alert');

    if (isConnected) {
      if (statusLabel) statusLabel.textContent = 'IA generativa conectada';
      if (statusBadge) {
        statusBadge.classList.remove('fallback');
        statusBadge.classList.add('connected');
      }
      if (fallbackAlert) fallbackAlert.classList.add('hidden');
    } else {
      if (statusLabel) statusLabel.textContent = 'Modo de respaldo local: IA generativa no conectada';
      if (statusBadge) {
        statusBadge.classList.remove('connected');
        statusBadge.classList.add('fallback');
      }
      // Evitar mostrar simultáneamente estados contradictorios o dos avisos repetidos
      if (fallbackAlert) fallbackAlert.classList.add('hidden');
    }
  },

  async checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        this.updateVisualStatus(Boolean(data.geminiConfigured));
      } else {
        this.updateVisualStatus(false);
      }
    } catch (e) {
      this.updateVisualStatus(false);
    }
  },

  async queryTutor({
    levelId = 'general',
    electricalData = '',
    studentAnswer = '',
    procedureText = '',
    attemptNumber = 1,
    errorCategory = 'Fórmula',
    helpLevel = 'orientacion'
  }) {
    if (this.isRequestPending) return;
    this.isRequestPending = true;

    // Add loading bubble to chat
    const loadingBubbleId = this.appendChatBubble('tutor', 'Pensando respuesta socrática...', true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelId,
          electricalData,
          studentAnswer,
          procedureText,
          attemptNumber,
          errorCategory,
          helpLevel
        })
      });

      const data = await response.json();
      this.removeLoadingBubble(loadingBubbleId);

      if (data.success && data.text) {
        this.appendChatBubble('tutor', data.text);
        this.updateVisualStatus(!data.isFallback);
        return data.text;
      } else {
        this.appendChatBubble('tutor', 'Orientación socrática: Recuerda verificar las fórmulas de fase y línea en estrella Y-Y.');
        this.updateVisualStatus(false);
      }
    } catch (err) {
      console.error('Error al contactar a IA-Fasor:', err);
      this.removeLoadingBubble(loadingBubbleId);
      this.appendChatBubble('tutor', 'No fue posible contactar al motor generativo en este momento. Utiliza las ecuaciones clave de estrella Y-Y para avanzar.');
      this.updateVisualStatus(false);
    } finally {
      this.isRequestPending = false;
    }
  },

  handleUserSubmit() {
    const textarea = document.getElementById('tutor-user-input');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;

    // Append user bubble
    this.appendChatBubble('user', text);
    textarea.value = '';
    const charCount = document.getElementById('tutor-char-count');
    if (charCount) charCount.textContent = '0 / 400';

    // Query tutor
    this.queryTutor({
      levelId: 'consulta-estudiante',
      studentAnswer: text,
      attemptNumber: 1,
      errorCategory: 'Fórmula',
      helpLevel: 'orientacion'
    });
  },

  appendChatBubble(role, message, isLoading = false) {
    const chatContainer = document.getElementById('tutor-chat-messages');
    if (!chatContainer) return null;

    const bubbleId = 'bubble-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.id = bubbleId;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
      <div class="bubble-header">
        <span class="avatar">${role === 'tutor' ? '⚡' : '👤'}</span>
        <span class="name">${role === 'tutor' ? 'IA-Fasor' : 'Ingeniero/a'}</span>
        <span class="time">${timeStr}</span>
      </div>
      <div class="bubble-body ${isLoading ? 'loading-text' : ''}">${this.escapeHtml(message)}</div>
    `;

    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubbleId;
  },

  removeLoadingBubble(bubbleId) {
    if (!bubbleId) return;
    const el = document.getElementById(bubbleId);
    if (el) el.remove();
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
