import { TaskStatus } from "@/types";

/**
 * Constantes de etiquetas de estado de tarea.
 */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Iniciado",
  in_progress: "En desarrollo",
  review: "En revisión",
  blocked: "Bloqueado",
  done: "Terminado",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  open: "#8b93b8",
  in_progress: "#4f7cff",
  review: "#f5a623",
  blocked: "#ff5c5c",
  done: "#3ecf8e",
};

export const STATUS_BG: Record<TaskStatus, string> = {
  open: "bg-[#8b93b8]/20 text-[#8b93b8]",
  in_progress: "bg-[#4f7cff]/20 text-[#4f7cff]",
  review: "bg-[#f5a623]/20 text-[#f5a623]",
  blocked: "bg-[#ff5c5c]/20 text-[#ff5c5c]",
  done: "bg-[#3ecf8e]/20 text-[#3ecf8e]",
};

/**
 * Genera un arreglo de objetos Date para todos los días de un mes.
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/**
 * Devuelve los días de un rango de meses consecutivos a partir de la fecha inicial.
 */
export function getDaysInRange(startMonth: Date, months: number): Date[] {
  const days: Date[] = [];
  for (let m = 0; m < months; m++) {
    const month = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);
    const inMonth = getDaysInMonth(month.getFullYear(), month.getMonth());
    days.push(...inMonth);
  }
  return days;
}

/**
 * Retorna true si la fecha corresponde a sábado o domingo.
 */
export function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

/**
 * Comprueba si una fecha es el día actual.
 */
export function isToday(d: Date): boolean {
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

/**
 * Convierte una cadena YYYY-MM-DD a un objeto Date sin zona horaria local.
 */
export function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

/**
 * Formatea una fecha en una cadena con nombre de mes y año en español.
 */
export function formatMonth(d: Date): string {
  return d.toLocaleString("es", { month: "long", year: "numeric" });
}

/**
 * Genera un hash SHA-256 de una cadena de texto (como una contraseña).
 * Utiliza la Web Crypto API nativa.
 */
export async function hashPassword(password: string): Promise<string> {
  // Intentar usar la Web Crypto API si está disponible (contextos seguros como HTTPS o localhost)
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (err) {
      console.warn("Fallo al usar Web Crypto API, usando fallback en JS:", err);
    }
  }

  // Fallback puro en JavaScript para contextos no seguros (HTTP local de oficina)
  return sha256Fallback(password);
}

function sha256Fallback(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const isPrime: Record<number, boolean> = {};
  let primeCounter = 0;
  let candidate = 2;
  while (primeCounter < 64) {
    if (!isPrime[candidate]) {
      for (i = candidate * candidate; i < 312; i += candidate) {
        isPrime[i] = true;
      }
      k[primeCounter] = (mathPow(candidate, 1/3) * maxWord) | 0;
      primeCounter++;
    }
    candidate++;
  }

  primeCounter = 0;
  candidate = 2;
  const hashInit = [h0, h1, h2, h3, h4, h5, h6, h7];
  while (primeCounter < 8) {
    if (!isPrime[candidate]) {
      hashInit[primeCounter] = (mathPow(candidate, 1/2) * maxWord) | 0;
      primeCounter++;
    }
    candidate++;
  }
  h0 = hashInit[0]; h1 = hashInit[1]; h2 = hashInit[2]; h3 = hashInit[3];
  h4 = hashInit[4]; h5 = hashInit[5]; h6 = hashInit[6]; h7 = hashInit[7];

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength);
  
  for (j = 0; j < words[lengthProperty]; j += 16) {
    const w: number[] = [];
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (i = 0; i < 64; i++) {
      if (i < 16) {
        w[i] = words[j + i];
      } else {
        const s0: number = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1: number = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      
      const temp1 = (h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + (w[i] || 0)) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  
  const hashWords = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (i = 0; i < 8; i++) {
    const hex = (hashWords[i] >>> 0).toString(16);
    result += hex.padStart(8, '0');
  }
  
  return result;
}

