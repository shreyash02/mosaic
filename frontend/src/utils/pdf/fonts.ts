import type { jsPDF } from 'jspdf';

export type CustomFontFamily =
  | 'lora'           // Serif - user's favorite
  | 'ebgaramond'     // Serif - Garamond style
  | 'librebaskerville' // Serif - Georgia alternative
  | 'caladea';       // Serif - Cambria alternative

export const CUSTOM_FONT_CONFIG: Record<CustomFontFamily, {
  displayName: string;
  category: 'sans-serif' | 'serif';
  urls: {
    normal: string;
    bold: string;
  };
}> = {
  lora: {
    displayName: 'Lora',
    category: 'serif',
    urls: {
      normal: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-700-normal.ttf',
    },
  },
  ebgaramond: {
    displayName: 'Garamond',
    category: 'serif',
    urls: {
      normal: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-normal.ttf',
    },
  },
  librebaskerville: {
    displayName: 'Georgia',
    category: 'serif',
    urls: {
      normal: 'https://cdn.jsdelivr.net/fontsource/fonts/libre-baskerville@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/libre-baskerville@latest/latin-700-normal.ttf',
    },
  },
  caladea: {
    displayName: 'Cambria',
    category: 'serif',
    urls: {
      normal: 'https://cdn.jsdelivr.net/fontsource/fonts/caladea@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/caladea@latest/latin-700-normal.ttf',
    },
  },
};

// Cache for loaded fonts
const fontCache: Map<string, ArrayBuffer> = new Map();

async function fetchFont(url: string): Promise<ArrayBuffer> {
  if (fontCache.has(url)) {
    return fontCache.get(url)!;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${url} (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  fontCache.set(url, buffer);
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function loadCustomFont(doc: jsPDF, fontFamily: CustomFontFamily): Promise<void> {
  const config = CUSTOM_FONT_CONFIG[fontFamily];

  // Load normal and bold variants
  const [normalBuffer, boldBuffer] = await Promise.all([
    fetchFont(config.urls.normal),
    fetchFont(config.urls.bold),
  ]);

  const normalBase64 = arrayBufferToBase64(normalBuffer);
  const boldBase64 = arrayBufferToBase64(boldBuffer);

  // Register fonts with jsPDF
  const normalFilename = `${fontFamily}-normal.ttf`;
  const boldFilename = `${fontFamily}-bold.ttf`;

  doc.addFileToVFS(normalFilename, normalBase64);
  doc.addFileToVFS(boldFilename, boldBase64);

  doc.addFont(normalFilename, fontFamily, 'normal');
  doc.addFont(boldFilename, fontFamily, 'bold');
}

export function isCustomFont(font: string): font is CustomFontFamily {
  return font in CUSTOM_FONT_CONFIG;
}
