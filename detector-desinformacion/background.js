// background.js completo:

// --- INLINED NLP-UTILS ---
const SENSATIONALIST_WORDS = ["increíble", "impactante", "urgente", "no creerás", "secreto", "escándalo", "misterio", "conmoción", "estalla", "shocking", "urgent", "you won't believe", "secret", "scandal", "mystery", "commotion", "explodes", "unbelievable"];
const EMOTIONAL_WORDS = ["indignante", "terrible", "desastre", "vergonzoso", "destruye", "humilla", "salvaje", "brutal", "catástrofe", "outrageous", "disaster", "shameful", "destroys", "humiliates", "savage", "catastrophe"];

function analyzeText(title, text) {
  const safeTitle = (title || "").toString().toLowerCase();
  const safeText = (text || "").toString().toLowerCase();
  
  let clickbaitScore = 0;
  let emotionalScore = 0;
  let warnings = [];

  SENSATIONALIST_WORDS.forEach(word => {
    if (safeTitle.includes(word)) clickbaitScore += 15;
    if (safeText.includes(word)) clickbaitScore += 2;
  });

  EMOTIONAL_WORDS.forEach(word => {
    if (safeTitle.includes(word) || safeText.includes(word)) emotionalScore += 5;
  });

  const exclamationCount = (safeTitle.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    clickbaitScore += 10;
    warnings.push("Uso excesivo de exclamaciones (posible clickbait).");
  }

  if (clickbaitScore > 10) warnings.push("Lenguaje sensacionalista detectado.");
  if (emotionalScore > 10) warnings.push("Alto uso de lenguaje emocional o subjetivo.");

  return { clickbaitScore, emotionalScore, warnings };
}
// --- END NLP-UTILS ---

const STOP_WORDS = ["el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "de", "en", "a", "por", "para", "con", "sin", "sobre", "como", "más", "que", "su", "sus", "al", "del", "se", "no", "es", "lo", "te", "me", "le", "ha", "han", 
"the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"];

function getKeywords(title, content) {
  const combinedText = `${title || ""} ${content || ""}`.toLowerCase().replace(/[^\w\sáéíóúñü]/gi, ' ');
  const words = combinedText.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.includes(w));
  
  const frequencies = {};
  words.forEach(w => {
    frequencies[w] = (frequencies[w] || 0) + 1;
  });
  
  return Object.keys(frequencies).sort((a, b) => frequencies[b] - frequencies[a]).slice(0, 7);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ANALYZE_PAGE" && sender.tab) {
    handleAnalysis(request.data, sender.tab.id, sender.tab.url);
  }
  return true; 
});

async function handleAnalysis(pageData, tabId, tabUrl) {
  const { title, content } = pageData;
  const tabIdStr = tabId.toString(); 
  const domain = tabUrl ? new URL(tabUrl).hostname.replace('www.', '') : null;

  const storageData = await chrome.storage.local.get(['settings']);
  const settings = storageData.settings || { notifications: true, showBadge: true, autoHideSafe: false, multiLang: true, trustedSites: [] };
  
  if (domain && settings.trustedSites && settings.trustedSites.includes(domain)) {
     const trustedResult = {
       score: 100,
       status: "Confiable",
       color: "#10B981",
       warnings: [],
       consensus: "Página añadida a tu lista de sitios seguros.",
       sourceLinks: []
     };
     chrome.storage.local.set({ [tabIdStr]: trustedResult }, () => {
       chrome.tabs.sendMessage(tabId, { action: "UPDATE_BADGE", result: trustedResult, settings: settings });
     });
     return;
  }

  const keywords = getKeywords(title, content);
  const nlpAnalysis = analyzeText(title, content);
  
  let consensusData = { 
    sourcesFound: 0, 
    matchingScore: 0,
    summary: "Buscando información en otras fuentes..." 
  };

  if (keywords.length > 0) {
    try {
      const query = encodeURIComponent(keywords.join(" "));
      let searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
      
      // If multiLang is disabled, restrict to Spanish results using region kl=es-es
      if (!settings.multiLang) {
          searchUrl += '&kl=es-es';
      }

      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const htmlText = await response.text();
        
        const snippetRegex = /<a class="result__snippet[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
        let match;
        let results = [];
        
        while ((match = snippetRegex.exec(htmlText)) !== null) {
          let url = match[1];
          if (url.startsWith('//')) url = 'https:' + url;
          if (url.includes('uddg=')) {
            const uddgMatch = url.match(/uddg=([^&]+)/);
            if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
          }
          const cleanSnippet = match[2].replace(/<\/?[^>]+(>|$)/g, "").toLowerCase();
          results.push({ url, snippet: cleanSnippet });
        }

        let confirmingPages = [];
        results.forEach(res => {
          const matches = keywords.filter(kw => res.snippet.includes(kw));
          if (matches.length >= 2) { 
            confirmingPages.push(res.url);
          }
        });

        let uniquePages = [...new Set(confirmingPages)].slice(0, 3);
        let sourceLinks = uniquePages.map(u => {
           let domain = "Enlace Web";
           try { domain = new URL(u).hostname.replace('www.', ''); } catch(e) {}
           return { url: u, domain };
        });

        consensusData.sourcesFound = results.length;
        let confirmingSources = confirmingPages.length;
        consensusData.matchingScore = confirmingSources;
        consensusData.sourceLinks = sourceLinks;

        if (confirmingSources >= 5) {
          consensusData.summary = `Alta fiabilidad: Encontramos ${confirmingSources} fuentes independientes hablando de lo mismo.`;
        } else if (confirmingSources >= 2) {
          consensusData.summary = `Precaución: Solo ${confirmingSources} fuentes similares encontradas. Podría ser un tema muy reciente o de nicho.`;
        } else {
          consensusData.summary = `Riesgo Alto: Ninguna otra fuente principal parece respaldar esta información exacta.`;
        }
      } else {
        consensusData.summary = "El buscador de contraste ha bloqueado temporalmente la petición.";
      }
    } catch (error) {
      console.log("Error al buscar en internet:", error);
      consensusData.summary = "No se pudo conectar con el buscador para verificar otras fuentes.";
    }
  } else {
    consensusData.summary = "No hay suficiente texto en la página para extraer palabras clave.";
  }

  let trustScore = 20; 
  
  if (consensusData.matchingScore >= 5) {
    trustScore = 95;
  } else if (consensusData.matchingScore >= 3) {
    trustScore = 75;
  } else if (consensusData.matchingScore > 0) {
    trustScore = 45;
  } else {
    trustScore = 15;
  }

  trustScore -= nlpAnalysis.clickbaitScore;
  trustScore -= nlpAnalysis.emotionalScore;
  trustScore = Math.max(0, Math.min(100, trustScore));

  let status = "Fiable"; let color = "#4CAF50"; 
  if (trustScore < 40) { status = "Sospechoso"; color = "#F44336"; } 
  else if (trustScore < 70) { status = "Dudoso"; color = "#FFC107"; }

  const finalResult = { 
    score: trustScore, 
    status: status, 
    color: color, 
    warnings: nlpAnalysis.warnings,
    consensus: consensusData.summary,
    sourceLinks: consensusData.sourceLinks || []
  };

  // Solo notificar si las notificaciones están activadas y la página es dudosa o sospechosa
  if (settings.notifications && trustScore < 70) {
    const base64Icon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAANSURBVBhXY3jP4PgfAAWpA50G/1m+AAAAAElFTkSuQmCC";
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: base64Icon,
      title: 'InfoCheck: ' + status,
      message: 'Atención: Esta página muestra señales de info-desinformación o falta de consenso.'
    }, () => { const lastErr = chrome.runtime.lastError; }); 
  }

  chrome.storage.local.set({ [tabIdStr]: finalResult }, () => {
    chrome.tabs.sendMessage(tabId, { action: "UPDATE_BADGE", result: finalResult, settings: settings }, () => {
      const err = chrome.runtime.lastError;
    });
  });
}
