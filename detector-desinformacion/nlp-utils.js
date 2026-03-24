// nlp_utils.js
const SENSATIONALIST_WORDS = ["increíble", "impactante", "urgente", "no creerás", "secreto", "escándalo", "misterio", "conmoción", "estalla"];
const EMOTIONAL_WORDS = ["indignante", "terrible", "desastre", "vergonzoso", "destruye", "humilla", "salvaje", "brutal", "catástrofe"];

export function analyzeText(title, text) {
  const lowerTitle = title.toLowerCase();
  const lowerText = text.toLowerCase();
  
  let clickbaitScore = 0;
  let emotionalScore = 0;
  let warnings = [];

  // Analizar sensacionalismo
  SENSATIONALIST_WORDS.forEach(word => {
    if (lowerTitle.includes(word)) clickbaitScore += 15;
    if (lowerText.includes(word)) clickbaitScore += 2;
  });

  // Analizar sesgo/emoción
  EMOTIONAL_WORDS.forEach(word => {
    if (lowerTitle.includes(word) || lowerText.includes(word)) emotionalScore += 5;
  });

  // Exageraciones (uso excesivo de mayúsculas o exclamaciones en el título)
  const exclamationCount = (title.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    clickbaitScore += 10;
    warnings.push("Uso excesivo de exclamaciones (posible clickbait).");
  }

  if (clickbaitScore > 10) warnings.push("Lenguaje sensacionalista detectado.");
  if (emotionalScore > 10) warnings.push("Alto uso de lenguaje emocional o subjetivo.");

  return { clickbaitScore, emotionalScore, warnings };
}