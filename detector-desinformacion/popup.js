const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettings = document.getElementById('close-settings');

const notifToggle = document.getElementById('notif-toggle');
const badgeToggle = document.getElementById('badge-toggle');
const langToggle = document.getElementById('lang-toggle');

const defaultSettings = { notifications: true, showBadge: true, multiLang: true };

settingsBtn.addEventListener('click', () => { settingsPanel.style.display = 'block'; });
closeSettings.addEventListener('click', () => { settingsPanel.style.display = 'none'; });

// Load Settings
chrome.storage.local.get(['settings'], (data) => {
  const currentSettings = data.settings || defaultSettings;
  notifToggle.checked = currentSettings.notifications !== false; 
  badgeToggle.checked = currentSettings.showBadge !== false;
  langToggle.checked = currentSettings.multiLang !== false;
});

// Save Settings helper
function saveSettings() {
  chrome.storage.local.set({ settings: {
    notifications: notifToggle.checked,
    showBadge: badgeToggle.checked,
    multiLang: langToggle.checked
  }});
}

notifToggle.addEventListener('change', saveSettings);
badgeToggle.addEventListener('change', saveSettings);
langToggle.addEventListener('change', saveSettings);

let currentTabIdStr;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs || tabs.length === 0) return;
  currentTabIdStr = tabs[0].id.toString();
  
  chrome.storage.local.get([currentTabIdStr], (data) => {
    const result = data[currentTabIdStr];
    if (result) {
      renderResult(result);
    } else {
      setTimeout(() => {
        chrome.storage.local.get([currentTabIdStr], (dataFallback) => {
           if (!dataFallback[currentTabIdStr]) {
              renderError("Escáner Interrumpido", "Prueba a recargar la pestaña (F5). Asegúrate de que es una página web válida.");
           }
        });
      }, 5000); 
    }
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && currentTabIdStr && changes[currentTabIdStr]) {
    renderResult(changes[currentTabIdStr].newValue);
  }
});

function renderError(title, desc) {
  document.getElementById("app-content").innerHTML = `
    <div class="info-card glass" style="border-left: 4px solid var(--danger);">
      <h3 style="color: #fca5a5;">⚠️ ${title}</h3>
      <p>${desc}</p>
    </div>
  `;
}

function renderResult(result) {
    if (!result) return;
    const contentDiv = document.getElementById("app-content");
    
    let mainColor = "var(--success)";
    let glowColor = "var(--glow-success)";
    let badgeColor = "#065f46"; 
    let badgeBg = "#10B981";

    if (result.score < 40) {
      mainColor = "var(--danger)";
      glowColor = "var(--glow-danger)";
      badgeBg = "#EF4444";
      badgeColor = "#450a0a";
    } else if (result.score < 70) {
      mainColor = "var(--warning)";
      glowColor = "var(--glow-warning)";
      badgeBg = "#F59E0B";
      badgeColor = "#451a03";
    }

    contentDiv.innerHTML = `
      <div class="score-section">
        <div class="score-circle" style="border-color: ${mainColor}; box-shadow: 0 0 30px ${glowColor}, inset 0 0 20px rgba(0,0,0,0.5);">
          <div class="score-value" id="animated-score">0</div>
          <div class="score-label" style="color: ${mainColor}">${result.score >= 70 ? 'Seguro' : result.score >= 40 ? 'Regular' : 'Peligro'}</div>
        </div>
        <div class="status-badge" style="background-color: ${badgeBg}; color: ${badgeColor};">
          ${result.status}
        </div>
      </div>

      <div class="info-card glass">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${mainColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Consenso en Internet
        </h3>
        <p>${result.consensus}</p>
        
        ${result.sourceLinks && result.sourceLinks.length > 0 ? `
        <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: var(--text-muted);">📝 Fuentes coincidentes:</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${result.sourceLinks.map(link => `
              <a href="${link.url}" target="_blank" class="source-link" title="${link.url}">
                ${link.domain}
              </a>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      ${result.warnings && result.warnings.length > 0 ? `
      <div class="info-card glass" style="border-left: 3px solid var(--danger); background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%);">
        <h3 style="color: #fca5a5;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          Alertas de Contenido
        </h3>
        <ul class="warning-list">
          ${result.warnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 10px; opacity: 0.5;">
        <p style="font-size: 11px; margin:0; font-weight: 500;">Verificación Local - InfoCheck</p>
      </div>
    `;

    animateScore(result.score);
}

function animateScore(targetScore) {
    const animatedScore = document.getElementById('animated-score');
    if (!animatedScore) return;
    
    let currentScore = 0;
    const duration = 1200;
    const interval = 20;
    const step = targetScore / (duration / interval);
    
    const timer = setInterval(() => {
        currentScore += step;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(timer);
        }
        animatedScore.textContent = Math.round(currentScore);
    }, interval);
}