const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const closeSettings = document.getElementById('close-settings');

const notifToggle = document.getElementById('notif-toggle');
const badgeToggle = document.getElementById('badge-toggle');
const autohideToggle = document.getElementById('autohide-toggle');
const langToggle = document.getElementById('lang-toggle');

const defaultSettings = { notifications: true, showBadge: true, autoHideSafe: false, multiLang: true };

settingsBtn.addEventListener('click', () => { settingsPanel.style.display = 'block'; });
closeSettings.addEventListener('click', () => { 
  settingsPanel.style.animation = 'slidePanelUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
  setTimeout(() => {
    settingsPanel.style.display = 'none';
    settingsPanel.style.animation = 'slidePanelUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  }, 300);
});

// Load Settings
chrome.storage.local.get(['settings'], (data) => {
  const currentSettings = data.settings || defaultSettings;
  notifToggle.checked = currentSettings.notifications !== false; 
  badgeToggle.checked = currentSettings.showBadge !== false;
  autohideToggle.checked = currentSettings.autoHideSafe === true;
  langToggle.checked = currentSettings.multiLang !== false;
});

// Save Settings helper
function saveSettings() {
  chrome.storage.local.set({ settings: {
    notifications: notifToggle.checked,
    showBadge: badgeToggle.checked,
    autoHideSafe: autohideToggle.checked,
    multiLang: langToggle.checked
  }});
}

notifToggle.addEventListener('change', saveSettings);
badgeToggle.addEventListener('change', saveSettings);
autohideToggle.addEventListener('change', saveSettings);
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
    <div class="info-card glass" style="border-left: 4px solid var(--danger); animation-delay: 0.1s;">
      <h3 style="color: #fca5a5; display: flex; align-items: center; gap: 6px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        ${title}
      </h3>
      <p>${desc}</p>
    </div>
  `;
}

function renderResult(result) {
    if (!result) return;
    const contentDiv = document.getElementById("app-content");
    
    let mainColor = "var(--success)";
    let glowColor = "var(--glow-success)";

    if (result.score < 40) {
      mainColor = "var(--danger)";
      glowColor = "var(--glow-danger)";
    } else if (result.score < 70) {
      mainColor = "var(--warning)";
      glowColor = "var(--glow-warning)";
    }

    contentDiv.innerHTML = `
      <div class="score-section" style="--theme-color: ${mainColor}; --glow-color: ${glowColor};">
        <svg class="svg-ring" viewBox="0 0 140 140">
          <circle class="svg-ring-bg" cx="70" cy="70" r="60"></circle>
          <circle class="svg-ring-progress" id="score-ring" cx="70" cy="70" r="60"></circle>
        </svg>
        <div class="score-content">
          <div class="score-value" id="animated-score">0</div>
          <div class="score-label">${result.score >= 70 ? 'Seguro' : result.score >= 40 ? 'Regular' : 'Peligro'}</div>
        </div>
        <div class="status-badge">
          ${result.status}
        </div>
      </div>

      <div class="info-card glass" style="animation-delay: 0.15s;">
        <h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${mainColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          Consenso en Internet
        </h3>
        <p>${result.consensus}</p>
        
        ${result.sourceLinks && result.sourceLinks.length > 0 ? `
        <div style="margin-top: 18px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <h4 style="margin: 0 0 10px 0; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Fuentes coincidentes:
          </h4>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${result.sourceLinks.map(link => `
              <a href="${link.url}" target="_blank" class="source-link" title="${link.url}">
                <img src="https://www.google.com/s2/favicons?domain=${link.domain}&sz=32" style="width: 14px; height: 14px; border-radius: 2px;">
                ${link.domain}
              </a>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      ${result.warnings && result.warnings.length > 0 ? `
      <div class="info-card glass" style="border-left: 3px solid var(--danger); background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, transparent 100%); animation-delay: 0.3s;">
        <h3 style="color: #fca5a5;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          Alertas de Contenido
        </h3>
        <ul class="warning-list">
          ${result.warnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 12px; opacity: 0.4;">
        <p style="font-size: 11px; margin:0; font-weight: 600; letter-spacing: 0.5px;">VERIFICACIÓN LOCAL - INFOCHECK</p>
      </div>
    `;

    animateScore(result.score);
}

function animateScore(targetScore) {
    const animatedScore = document.getElementById('animated-score');
    const scoreRing = document.getElementById('score-ring');
    if (!animatedScore) return;
    
    setTimeout(() => {
        if (scoreRing) {
            const circumference = 377;
            const offset = circumference - (targetScore / 100) * circumference;
            scoreRing.style.strokeDashoffset = offset;
        }
    }, 50);

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