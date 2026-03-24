setTimeout(() => {
  const pageTitle = document.title || "Sin título";
  const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.innerText).join(' ');

  chrome.runtime.sendMessage(
    { action: "ANALYZE_PAGE", data: { title: pageTitle, content: paragraphs.substring(0, 3000) } },
    (response) => {
      if (chrome.runtime.lastError) {
        console.log("Esperando conexión con el analizador...");
      }
    }
  );
}, 1000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "UPDATE_BADGE") {
    if (request.settings && request.settings.showBadge === false) {
      const badge = document.getElementById("trust-badge-detector");
      if (badge) badge.remove();
      return;
    }
    createBadge(request.result);
  }
});

function createBadge(result) {
  if (document.getElementById("trust-badge-detector") || !document.body) return;

  let modernColor = "#10B981"; 
  let glowColor = "rgba(16, 185, 129, 0.4)";
  if (result.score < 40) { modernColor = "#EF4444"; glowColor = "rgba(239, 68, 68, 0.4)"; }
  else if (result.score < 70) { modernColor = "#F59E0B"; glowColor = "rgba(245, 158, 11, 0.4)"; }

  const badgeWrapper = document.createElement("div");
  badgeWrapper.id = "trust-badge-detector";
  // Premium glassmorphism float style
  badgeWrapper.style.cssText = `
    position: fixed; 
    bottom: 30px; 
    right: 30px; 
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px 8px 8px;
    border-radius: 50px; 
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 30px -5px ${glowColor}, 0 4px 10px rgba(0,0,0,0.5);
    color: white;
    font-family: 'Inter', system-ui, sans-serif;
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
    cursor: help;
  `;

  badgeWrapper.innerHTML = `
    <div style="
      width: 44px; 
      height: 44px; 
      border-radius: 50%; 
      background: ${modernColor}; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-weight: 800; 
      font-size: 18px; 
      color: #fff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
    ">${result.score}</div>
    <div style="display: flex; flex-direction: column;">
      <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${result.status}</span>
      <span style="font-size: 11px; opacity: 0.7;">Verificado</span>
    </div>
  `;

  document.body.appendChild(badgeWrapper);

  // Trigger intro animation
  setTimeout(() => {
    badgeWrapper.style.transform = "translateY(0)";
    badgeWrapper.style.opacity = "1";
  }, 100);

  // Hover effect
  badgeWrapper.onmouseenter = () => {
    badgeWrapper.style.transform = "translateY(-5px) scale(1.02)";
  };
  badgeWrapper.onmouseleave = () => {
    badgeWrapper.style.transform = "translateY(0) scale(1)";
  };
}