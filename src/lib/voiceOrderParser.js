// Interpreta un texto dictado por voz (ej: "dos gin tonic y una hamburguesa
// clasica") y lo compara contra la lista real de productos del venue para
// armar una lista de items detectados con su cantidad. Matching simple por
// texto, sin IA: normaliza acentos/mayusculas, busca numeros en palabras o
// digitos, y compara contra el nombre de cada producto (substring + overlap
// de palabras). No es perfecto pero cubre el caso comun sin costo de API.

const NUMBER_WORDS = {
  un: 1, uno: 1, una: 1,
  dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca acentos
    .replace(/[^\w\s]/g, ' ') // saca puntuacion
    .replace(/\s+/g, ' ')
    .trim()
}

// Separa el texto dictado en "fragmentos" de pedido usando conectores
// comunes (y, con, tambien, ademas, una coma implicita por "y")
function splitIntoChunks(normalized) {
  return normalized
    .split(/\b(?:y tambien|tambien|ademas|y)\b/)
    .map(s => s.trim())
    .filter(Boolean)
}

function extractQuantity(chunk) {
  const digitMatch = chunk.match(/\b(\d+)\b/)
  if (digitMatch) {
    return { quantity: parseInt(digitMatch[1], 10), rest: chunk.replace(digitMatch[0], '').trim() }
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`)
    if (re.test(chunk)) {
      return { quantity: value, rest: chunk.replace(re, '').trim() }
    }
  }
  return { quantity: 1, rest: chunk.trim() }
}

// Puntaje de similitud simple: cuantas palabras del nombre del producto
// aparecen en el chunk dictado, mas un bonus si el chunk completo esta
// contenido como substring del nombre (o viceversa).
function scoreMatch(chunkText, productName) {
  const normName = normalize(productName)
  const productWords = normName.split(' ').filter(w => w.length > 2)
  if (productWords.length === 0) return 0

  let matchedWords = 0
  for (const word of productWords) {
    if (chunkText.includes(word)) matchedWords++
  }

  let score = matchedWords / productWords.length

  if (chunkText.includes(normName) || normName.includes(chunkText)) {
    score += 0.5
  }

  return score
}

export function parseVoiceOrder(transcript, products) {
  const normalized = normalize(transcript)
  const chunks = splitIntoChunks(normalized)

  const results = []

  for (const chunk of chunks) {
    if (!chunk) continue
    const { quantity, rest } = extractQuantity(chunk)
    if (!rest) continue

    let bestProduct = null
    let bestScore = 0

    for (const product of products) {
      const score = scoreMatch(rest, product.name)
      if (score > bestScore) {
        bestScore = score
        bestProduct = product
      }
    }

    // Umbral minimo para evitar matches al azar con score muy bajo
    if (bestProduct && bestScore >= 0.4) {
      results.push({ product: bestProduct, quantity, confidence: bestScore, rawText: chunk })
    } else {
      results.push({ product: null, quantity, confidence: 0, rawText: chunk })
    }
  }

  return results
}

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}
