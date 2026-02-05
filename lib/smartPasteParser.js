// ============================================================================
// Smart Paste Parser Engine
// Extracts product info from pasted text, PDF, or TXT with fuzzy matching
// ============================================================================

// Known brand names for detection
const KNOWN_BRANDS = [
  'Sony', 'Canon', 'Nikon', 'Panasonic', 'Blackmagic', 'RED', 'ARRI', 'Fujifilm', 'Fuji', 'Leica',
  'Zeiss', 'Sigma', 'Tamron', 'Tokina', 'Rokinon', 'Samyang', 'Voigtlander',
  'Sennheiser', 'Rode', 'Røde', 'Shure', 'Audio-Technica', 'Zoom', 'Tascam', 'Sound Devices',
  'Aputure', 'Godox', 'Profoto', 'Broncolor', 'Litepanels', 'Kino Flo', 'Nanlite', 'Astera',
  'DJI', 'Zhiyun', 'Manfrotto', 'Gitzo', 'Sachtler', 'Tilta', 'SmallRig', 'Wooden Camera',
  'Atomos', 'SmallHD', 'Teradek', 'Hollyland', 'SanDisk', 'Samsung', 'Lexar', 'ProGrade',
  'Apple', 'Blackmagic Design', 'Davinci', 'Avid', 'Neewer', 'Elgato',
  'K-Tek', 'Rycote', 'Bubblebee', 'Lectrosonics', 'Wisycom', 'Zaxcom',
  'Cooke', 'Angenieux', 'Fujinon', 'Schneider', 'Tiffen', 'Lee Filters', 'NiSi',
  'Matthews', 'Avenger', 'Kupo', 'American Grip', 'Modern Studio',
  'OConnor', 'Vinten', 'Miller', 'Cartoni', 'Libec', 'Benro', 'Peak Design',
  'Sanken', 'DPA', 'Schoeps', 'Neumann', 'AKG', 'Beyerdynamic',
  'Anton Bauer', 'IDX', 'Core SWX', 'Hawk-Woods', 'Bebob',
  'Dedolight', 'Mole-Richardson', 'Quasar Science',
  'Pelican', 'SKB', 'Nanuk', 'Porta Brace', 'Tenba', 'Think Tank',
  'Deity', 'Tentacle Sync', 'Timecode Systems',
];

// Category keywords mapping
const CATEGORY_KEYWORDS = {
  'Cameras': ['camera', 'camcorder', 'cinema camera', 'mirrorless', 'dslr', 'sensor type', 'video camera', 'digital camera'],
  'Lenses': ['lens', 'focal length', 'aperture', 'f/', 'prime lens', 'zoom lens', 'wide angle', 'telephoto', 'anamorphic'],
  'Lighting': ['light', 'led', 'strobe', 'flash', 'softbox', 'panel', 'fresnel', 'rgb light', 'bi-color', 'watt', 'lumen', 'fixture'],
  'Audio': ['microphone', 'mic', 'audio', 'recorder', 'wireless system', 'lavalier', 'shotgun', 'boom pole', 'preamp', 'mixer'],
  'Support': ['tripod', 'monopod', 'gimbal', 'stabilizer', 'fluid head', 'slider', 'dolly', 'jib', 'crane', 'rig'],
  'Grip': ['c-stand', 'grip head', 'arm', 'clamp', 'flag', 'frame', 'silk', 'net', 'scrim', 'gobo', 'sandbag'],
  'Accessories': ['battery', 'charger', 'cable', 'adapter', 'mount', 'cage', 'filter', 'hood', 'follow focus'],
  'Storage': ['card', 'ssd', 'drive', 'memory card', 'cfast', 'sd card', 'storage', 'cfexpress'],
  'Monitors': ['monitor', 'display', 'screen', 'viewfinder', 'evf', 'on-camera monitor', 'field monitor'],
  'Power': ['v-mount', 'gold mount', 'power supply', 'battery plate', 'ac adapter', 'battery pack'],
  'Consumables': ['tape', 'gel', 'diffusion', 'gaffer', 'expendable'],
};


// ============================================================================
// Text Preprocessing
// ============================================================================

/**
 * Clean HTML artifacts, table structures, and non-text elements from pasted text.
 * Converts table rows to "key\tvalue" lines for downstream parsing.
 */
export function cleanInputText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // ---- Remove non-text elements entirely ----
  cleaned = cleaned.replace(/<img[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  cleaned = cleaned.replace(/<(?:picture|video|audio|iframe|canvas|object|embed)[^>]*(?:\/>|>[\s\S]*?<\/(?:picture|video|audio|iframe|canvas|object|embed)>)/gi, '');
  cleaned = cleaned.replace(/<(?:script|style|noscript)[\s\S]*?<\/(?:script|style|noscript)>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  // Remove nav, footer, form, button blocks
  cleaned = cleaned.replace(/<(?:button|nav|footer|form)[^>]*>[\s\S]*?<\/(?:button|nav|footer|form)>/gi, '');

  // ---- Convert table structures to key\tvalue lines ----
  cleaned = cleaned.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (cellText) cells.push(cellText);
      }
      if (cells.length >= 2) {
        rows.push(cells[0] + '\t' + cells.slice(1).join(', '));
      } else if (cells.length === 1) {
        rows.push(cells[0]);
      }
    }
    return rows.join('\n');
  });

  // ---- Convert remaining block-level elements ----
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<hr\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(?:p|div|tr|li|h[1-6]|dt|dd|section|article|header|blockquote)>/gi, '\n');

  // <dt>...<dd> → "term\tvalue" (definition lists)
  cleaned = cleaned.replace(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi, (_, dt, dd) => {
    const key = dt.replace(/<[^>]+>/g, '').trim();
    const val = dd.replace(/<[^>]+>/g, '').trim();
    return key + '\t' + val + '\n';
  });

  cleaned = cleaned.replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, '\t');
  cleaned = cleaned.replace(/<\/tr>\s*/gi, '\n');

  // ---- Strip all remaining HTML tags ----
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // ---- Decode HTML entities ----
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  cleaned = cleaned.replace(/&[a-zA-Z]+;/g, ' ');

  // ---- Normalize whitespace ----
  cleaned = cleaned.replace(/\t+/g, '\t');
  cleaned = cleaned.replace(/[ \t]*\n[ \t]*/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^\s+|\s+$/g, '');

  return cleaned;
}

/**
 * Read a text file and return its contents
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read a PDF file and extract text using pdf.js.
 */
let pdfjsLoaded = false;
export async function readPdfFile(file) {
  if (!pdfjsLoaded && !window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js library'));
      document.head.appendChild(script);
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], text: item.str, width: item.width || 0 });
    }

    const sortedLines = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);

    for (const [, items] of sortedLines) {
      items.sort((a, b) => a.x - b.x);

      let lineText = items[0].text;
      for (let j = 1; j < items.length; j++) {
        const prevEnd = items[j - 1].x + (items[j - 1].width || items[j - 1].text.length * 5);
        const gap = items[j].x - prevEnd;
        lineText += (gap > 30 ? '\t' : ' ') + items[j].text;
      }
      textParts.push(lineText.trim());
    }

    if (i < pdf.numPages) textParts.push('');
  }

  return textParts.join('\n');
}


// ============================================================================
// Fuzzy Matching Engine
// ============================================================================

function normalize(str) {
  return str.toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[()[\]{}]/g, '')
    .replace(/[^a-z0-9\s/%.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ABBREVIATIONS = {
  'freq': 'frequency', 'temp': 'temperature', 'max': 'maximum', 'min': 'minimum',
  'mic': 'microphone', 'res': 'resolution', 'conn': 'connector', 'dim': 'dimensions',
  'wt': 'weight', 'bat': 'battery', 'batt': 'battery', 'vol': 'voltage',
  'pwr': 'power', 'cap': 'capacity', 'compat': 'compatibility',
  'stab': 'stabilization', 'adj': 'adjustment', 'diam': 'diameter',
  'ht': 'height', 'len': 'length', 'sens': 'sensitivity', 'imp': 'impedance',
  'approx': 'approximate', 'incl': 'included', 'info': 'information',
  'spec': 'specification', 'specs': 'specifications', 'num': 'number',
  'qty': 'quantity', 'ext': 'extended', 'dia': 'diameter', 'opt': 'optical',
  'mech': 'mechanical', 'elec': 'electronic', 'def': 'definition',
  'vid': 'video', 'aud': 'audio', 'rec': 'recording', 'cont': 'continuous',
  'std': 'standard',
};

function expandAbbreviations(str) {
  return str.split(' ').map(w => ABBREVIATIONS[w] || w).join(' ');
}

const STOP_WORDS = new Set([
  'type', 'size', 'rate', 'range', 'mode', 'with', 'from', 'for', 'the', 'and',
  'max', 'min', 'output', 'input', 'total', 'number', 'system', 'included',
  'support', 'supported', 'compatible', 'maximum', 'minimum', 'speed', 'level',
  'control', 'depth', 'life', 'time', 'capacity', 'power', 'count', 'body',
  'recording', 'card', 'cable', 'mount', 'class', 'general', 'specification',
  'specifications', 'key', 'features', 'feature', 'details', 'detail', 'info',
  'information', 'other', 'additional', 'about', 'product', 'item',
]);

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Calculate similarity score between two strings (0-100).
 */
function similarityScore(source, target) {
  const a = normalize(source);
  const b = normalize(target);
  if (!a || !b) return 0;
  if (a === b) return 100;

  const aExp = expandAbbreviations(a);
  const bExp = expandAbbreviations(b);
  if (aExp === bExp) return 97;

  // One contains the other fully
  if (bExp.length >= 4 && aExp.includes(bExp) && bExp.length / aExp.length > 0.4) {
    return 85 + Math.min(10, (bExp.length / aExp.length) * 10);
  }
  if (aExp.length >= 4 && bExp.includes(aExp) && aExp.length / bExp.length > 0.4) {
    return 80 + Math.min(10, (aExp.length / bExp.length) * 10);
  }

  // Token-level overlap
  const wordsA = aExp.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const wordsB = bExp.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (wordsA.length > 0 && wordsB.length > 0) {
    let exactShared = 0;
    let fuzzyShared = 0;
    const usedB = new Set();

    for (const wa of wordsA) {
      const exactIdx = wordsB.findIndex((wb, i) => !usedB.has(i) && wb === wa);
      if (exactIdx !== -1) {
        exactShared++;
        usedB.add(exactIdx);
        continue;
      }
      if (wa.length >= 5) {
        const fuzzyIdx = wordsB.findIndex((wb, i) =>
          !usedB.has(i) && wb.length >= 5 && levenshtein(wa, wb) <= 1
        );
        if (fuzzyIdx !== -1) {
          fuzzyShared++;
          usedB.add(fuzzyIdx);
        }
      }
    }

    const totalShared = exactShared + fuzzyShared * 0.8;
    const maxWords = Math.max(wordsA.length, wordsB.length);
    const overlapRatio = totalShared / maxWords;

    if (overlapRatio >= 0.5) {
      return Math.round(50 + overlapRatio * 35 + (exactShared > fuzzyShared ? 5 : 0));
    }

    if (exactShared === 1 && wordsA.find(w => wordsB.includes(w) && w.length >= 7)) return 55;
    if (exactShared === 1 && wordsA.find(w => wordsB.includes(w) && w.length >= 5)) return 50;
  }

  // Levenshtein on full short strings
  if (aExp.length <= 20 && bExp.length <= 20) {
    const maxLen = Math.max(aExp.length, bExp.length);
    const dist = levenshtein(aExp, bExp);
    const ratio = 1 - dist / maxLen;
    if (ratio >= 0.7) return Math.round(40 + ratio * 20);
  }

  return 0;
}


// ============================================================================
// Build Spec Alias Map
// ============================================================================

const COMMON_ALIASES = {
  'sensor type': ['sensor', 'image sensor', 'sensor specification'],
  'sensor size': ['format', 'image circle', 'coverage', 'sensor format'],
  'effective pixels': ['megapixels', 'mp', 'resolution', 'pixel count', 'total pixels', 'image resolution'],
  'video resolution': ['video', 'video recording', 'movie recording', 'max video', '4k', '8k', 'video capability', 'recording resolution'],
  'frame rates': ['frame rate', 'fps', 'recording fps'],
  'mount type': ['lens mount', 'camera mount', 'bayonet'],
  'lens mount': ['mount', 'camera mount', 'mount type', 'bayonet mount'],
  'focal length': ['zoom range', 'focal range', 'fl'],
  'maximum aperture': ['max aperture', 'aperture', 'f-stop', 'fastest aperture', 'widest aperture', 'speed', 'wide open'],
  'minimum aperture': ['min aperture', 'smallest aperture'],
  'light type': ['lamp type', 'bulb type', 'light source', 'emitter type'],
  'max power output': ['power output', 'output power', 'wattage', 'watts', 'max power', 'power'],
  'color temperature': ['color temp', 'cct', 'kelvin', 'white balance'],
  'cct range': ['color temperature range', 'temp range', 'kelvin range'],
  'microphone type': ['mic type', 'transducer', 'capsule type'],
  'transducer type': ['capsule', 'element type'],
  'polar pattern': ['pickup pattern', 'pattern', 'directivity', 'directionality'],
  'frequency response': ['freq response', 'frequency range', 'bandwidth'],
  'output connector': ['connector', 'connection', 'connector type', 'output type'],
  'max payload': ['payload', 'payload capacity', 'max load', 'load capacity', 'maximum payload'],
  'capacity': ['storage capacity', 'total capacity', 'storage size'],
  'compatibility': ['compatible with', 'works with', 'supported devices'],
  'weight': ['body weight', 'total weight', 'net weight', 'unit weight', 'approx weight'],
  'dimensions': ['size', 'body size', 'measurements', 'lxwxh', 'exterior dimensions', 'overall dimensions', 'wxhxd'],
  'iso range': ['iso', 'iso sensitivity', 'iso speed', 'native iso'],
  'af system': ['autofocus', 'autofocus system', 'focus system', 'af type'],
  'af points': ['focus points', 'autofocus points', 'af coverage'],
  'stabilization': ['image stabilization', 'ibis', 'ois', 'vr', 'is', 'steady shot', 'sensor shift'],
  'wireless connectivity': ['wifi', 'wi-fi', 'bluetooth', 'wireless', 'nfc'],
  'battery life': ['shots per charge', 'battery duration', 'runtime'],
  'battery type': ['battery', 'power source', 'battery model'],
  'weather sealing': ['weather sealed', 'dust proof', 'moisture resistant', 'environmental sealing', 'splash proof'],
  'screen size': ['display size', 'lcd size', 'monitor size'],
  'panel type': ['display type', 'lcd type', 'screen type'],
  'brightness': ['luminance', 'nits', 'cd/m2', 'max brightness'],
  'read speed': ['max read', 'sequential read', 'read rate'],
  'write speed': ['max write', 'sequential write', 'write rate'],
  'image stabilization': ['stabilization', 'ois', 'lens stabilization', 'vr', 'is', 'optical stabilization'],
  'filter thread': ['filter size', 'front filter', 'front thread'],
  'self-noise': ['self noise', 'equivalent noise', 'noise level', 'noise floor'],
  'sensitivity': ['mic sensitivity', 'output level'],
  'max spl': ['maximum spl', 'max sound pressure', 'clipping level'],
  'cri': ['color rendering', 'color rendering index', 'ra'],
  'tlci': ['television lighting consistency', 'television lighting consistency index'],
  'beam angle': ['beam spread', 'coverage angle', 'field angle'],
  'power draw': ['power consumption', 'wattage', 'max draw', 'current draw'],
  'voltage': ['nominal voltage', 'output voltage', 'operating voltage'],
  'charge time': ['charging time', 'recharge time', 'full charge'],
  'head type': ['fluid head', 'head style', 'pan tilt head'],
  'max height': ['maximum height', 'extended height', 'full height'],
  'leg sections': ['sections', 'number of sections'],
  'support type': ['tripod type', 'stand type'],
  'min height': ['minimum height', 'lowest height'],
  'continuous shooting': ['burst rate', 'drive speed', 'continuous drive'],
  'shutter speed range': ['shutter speed', 'shutter range', 'mechanical shutter'],
  'lcd screen': ['lcd', 'rear display', 'rear screen'],
  'viewfinder type': ['evf', 'viewfinder', 'ovf', 'electronic viewfinder'],
  'memory card slots': ['card slots', 'media slots', 'memory slots'],
  'card types supported': ['supported cards', 'media type', 'compatible cards', 'card type'],
  'video output': ['hdmi output', 'video out', 'hdmi', 'sdi'],
  'audio input': ['mic input', 'audio in', 'microphone input', 'xlr input'],
  'optical design': ['lens construction', 'elements/groups', 'optical formula', 'lens design'],
  'diaphragm blades': ['aperture blades', 'iris blades', 'number of blades'],
  'minimum focus distance': ['mfd', 'close focus', 'closest focus', 'near limit', 'closest focusing distance'],
  'maximum magnification': ['max magnification', 'magnification ratio', 'reproduction ratio'],
  'autofocus': ['af', 'auto focus', 'focus motor'],
  'luminous flux (lm)': ['lumens', 'lumen output', 'lm', 'total output'],
  'illuminance (lux)': ['lux', 'lux output', 'lux at 1m'],
  'modifier mount': ['bowens mount', 'light modifier', 'accessory mount'],
  'wireless control': ['app control', 'remote control', 'bluetooth control'],
  'signal-to-noise ratio': ['snr', 's/n ratio', 'signal to noise'],
  'dynamic range': ['dr'],
  'phantom power': ['48v', 'phantom', 'p48'],
  'wireless frequency': ['frequency band', 'rf frequency', 'wireless band'],
  'wireless range': ['operating range', 'transmission range', 'rf range'],
  'capacity (wh)': ['watt hours', 'wh', 'energy capacity'],
  'capacity (mah)': ['mah', 'milliamp hours', 'amp hours'],
  'angle of view': ['aov', 'field of view', 'fov'],
  'af motor type': ['focus motor', 'af drive', 'af motor'],
  'lens format coverage': ['coverage', 'image circle', 'format coverage', 'sensor coverage'],
  'video format': ['codec', 'recording format', 'compression', 'video codec'],
  'bit depth': ['color depth', 'color bit depth'],
  'chroma subsampling': ['chroma', 'color subsampling', 'subsampling'],
  'hdr recording': ['hdr', 'hdr video', 'hlg', 'high dynamic range'],
  'af detection': ['af subject detection', 'subject tracking', 'eye af', 'face detection'],
  'viewfinder coverage': ['evf coverage', 'viewfinder magnification'],
  'body material': ['construction', 'chassis', 'body construction', 'housing'],
  'image processor': ['processor', 'engine', 'image engine', 'processing engine'],
  'cooling system': ['fan', 'cooling', 'active cooling', 'heat dissipation'],
  'storage type': ['media type', 'drive type', 'interface type'],
  'interface': ['connection type', 'bus type'],
  'form factor': ['card size', 'physical size'],
  'video speed class': ['v class', 'video class'],
  'aspect ratio': ['display ratio', 'screen ratio'],
  'contrast ratio': ['contrast', 'static contrast'],
  'color gamut': ['gamut', 'color space', 'rec 709', 'dci p3'],
  'touchscreen': ['touch', 'touch input', 'touch display'],
  'focus assist': ['peaking', 'focus peaking', 'punch in'],
  'chemistry': ['cell chemistry', 'cell type', 'battery chemistry'],
  'max discharge': ['continuous draw', 'max current', 'peak current'],
  'protection circuits': ['bms', 'protection', 'overcharge protection', 'safety features'],
  'airline approved': ['flight safe', 'airline safe', 'faa approved'],
  'grip type': ['stand type', 'clamp type', 'holder type'],
  'primary use': ['application', 'intended use', 'use case'],
  'material': ['build material', 'construction material'],
};

export function buildSpecAliasMap(specsConfig) {
  const aliasMap = new Map();
  const allSpecNames = new Set();
  const specCategories = new Map();

  if (!specsConfig) return { aliasMap, allSpecNames: [...allSpecNames], specCategories };

  Object.entries(specsConfig).forEach(([category, specList]) => {
    if (!Array.isArray(specList)) return;
    specList.forEach(spec => {
      if (!spec.name) return;
      const name = spec.name;
      allSpecNames.add(name);
      specCategories.set(name, category);

      // Exact name → highest priority
      aliasMap.set(normalize(name), { specName: name, priority: 100, category });

      // Expanded abbreviations form
      const expanded = expandAbbreviations(normalize(name));
      if (expanded !== normalize(name)) {
        aliasMap.set(expanded, { specName: name, priority: 98, category });
      }

      // Individual specific long words from multi-word spec names
      const words = normalize(name).split(' ');
      if (words.length > 1) {
        const genericWords = new Set([
          'type', 'size', 'rate', 'range', 'mode', 'with', 'from', 'output', 'input',
          'total', 'number', 'system', 'included', 'support', 'supported', 'compatible',
          'maximum', 'minimum', 'speed', 'level', 'control', 'depth', 'life', 'time',
          'capacity', 'power', 'count', 'body', 'recording', 'card', 'cable', 'mount',
          'class', 'ratio', 'material', 'format', 'angle', 'length', 'height', 'weight',
          'draw', 'plate', 'points', 'slots', 'display', 'assist', 'color', 'load',
          'adjustment', 'rotation', 'position', 'noise', 'temp',
        ]);
        words.forEach(word => {
          if (word.length >= 5 && !genericWords.has(word)) {
            const existing = aliasMap.get(word);
            if (!existing || existing.priority < 40) {
              aliasMap.set(word, { specName: name, priority: 40, category });
            }
          }
        });
      }
    });
  });

  // Register common aliases
  Object.entries(COMMON_ALIASES).forEach(([canonical, aliases]) => {
    const canonicalNorm = normalize(canonical);
    const mapEntry = aliasMap.get(canonicalNorm);
    const specName = mapEntry ? mapEntry.specName : null;
    const category = mapEntry ? mapEntry.category : null;
    if (!specName) return;

    aliases.forEach(alias => {
      const aliasNorm = normalize(alias);
      const existing = aliasMap.get(aliasNorm);
      if (!existing || existing.priority < 80) {
        aliasMap.set(aliasNorm, { specName, priority: 80, category });
      }
      const aliasExpanded = expandAbbreviations(aliasNorm);
      if (aliasExpanded !== aliasNorm) {
        const existingExp = aliasMap.get(aliasExpanded);
        if (!existingExp || existingExp.priority < 78) {
          aliasMap.set(aliasExpanded, { specName, priority: 78, category });
        }
      }
    });
  });

  return { aliasMap, allSpecNames: [...allSpecNames], specCategories };
}


// ============================================================================
// Main Parser
// ============================================================================

export function parseProductText(text, specsConfig) {
  const result = {
    name: '',
    brand: '',
    category: '',
    purchasePrice: '',
    priceNote: '',
    serialNumber: '',
    modelNumber: '',
    fields: new Map(),
    unmatchedPairs: [],
    rawExtracted: [],
  };

  if (!text || typeof text !== 'string') return result;

  const cleaned = cleanInputText(text);
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l);

  const specPatterns = [
    /^([^\t]{2,60})\t+(.+)$/,              // Key\tValue (table-derived)
    /^([^:]{2,60}):\s+(.+)$/,              // Key: Value
    /^([^|]{2,60})\s*\|\s*(.+)$/,          // Key | Value
    /^([^=]{2,60})\s*=\s*(.+)$/,           // Key = Value
    /^([^→]{2,40})\s*→\s*(.{2,})$/,        // Key → Value
    /^([^-]{2,40})\s+[-–—]\s+(.{2,})$/,    // Key - Value
  ];

  const noisePatterns = [
    /^(home|shop|cart|login|sign in|sign up|sign out|menu|search|filter by|sort by|subscribe|newsletter|cookie|accept|privacy|terms|copyright|©|all rights)/i,
    /^(add to|buy now|add to cart|in stock|out of stock|free shipping|see more|learn more|read more|show more|view all|close|back to|next|prev)/i,
    /^(share|tweet|pin it|email this|print|save for|wishlist|compare|reviews?\s*\(|rating|stars?|^\d+ customer)/i,
    /^\d+(\.\d+)?$/,
    /^[A-Z0-9]{3,}$/,
    /^\[.*\]$/,
  ];

  // -----------------------------------------------------------------------
  // 1. Extract raw key-value pairs
  // -----------------------------------------------------------------------
  const rawPairs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3 || line.length > 300) continue;
    if (noisePatterns.some(p => p.test(line))) continue;

    let matched = false;
    for (const pattern of specPatterns) {
      const match = line.match(pattern);
      if (match) {
        let [, key, value] = match;
        key = key.trim();
        value = value.trim();
        if (value.startsWith('http') || value.length > 200 || value.length < 1) continue;
        if (key.length < 2) continue;
        rawPairs.push({ key, value, sourceLine: line });
        matched = true;
        break;
      }
    }

    // Consecutive-line detection: "Label" then "Value" on next line
    if (!matched && i + 1 < lines.length) {
      const nextLine = lines[i + 1]?.trim();
      const looksLikeLabel = line.length >= 3 && line.length <= 50
        && !/^\d/.test(line)
        && !/[:|\t=→]/.test(line)
        && /^[A-Za-z]/.test(line);
      const looksLikeValue = nextLine && nextLine.length >= 1 && nextLine.length <= 150
        && (/^\d/.test(nextLine)
          || /\b(mm|cm|m|kg|g|lbs|oz|W|V|Wh|mAh|Hz|kHz|dB|lux|lm|cd|°|fps|bit|yes|no|true|false|approx)\b/i.test(nextLine)
          || /^(f\/|[A-Z]{2,4}[\s-])/i.test(nextLine));

      if (looksLikeLabel && looksLikeValue) {
        rawPairs.push({ key: line, value: nextLine, sourceLine: `${line} → ${nextLine}` });
        i++;
        matched = true;
      }
    }

    // Product name detection
    if (!matched && !result.name && line.length > 5 && line.length < 120) {
      const hasBrand = KNOWN_BRANDS.some(b => line.toLowerCase().includes(b.toLowerCase()));
      const hasProductWords = /\b(camera|lens|light|mic|microphone|tripod|monitor|recorder|flash|strobe|gimbal|stabilizer|wireless|transmitter|receiver|boom|shotgun|panel|fixture|battery|card)\b/i.test(line);
      if (hasBrand || hasProductWords) {
        result.name = line;
      }
    }
  }

  result.rawExtracted = rawPairs.map(p => ({ key: p.key, value: p.value }));

  // -----------------------------------------------------------------------
  // 2. Extract price (improved: multi-currency, ranges, labeled prices)
  // -----------------------------------------------------------------------
  // First, check if any raw pair has a price-like key
  const priceLabelPattern = /^(sale\s*price|price|msrp|list\s*price|rrp|retail\s*price|srp|map\s*price|street\s*price)$/i;
  let priceFromPair = null;
  const priceKeyPriority = ['sale price', 'street price', 'map price', 'price', 'msrp', 'list price', 'rrp', 'retail price', 'srp'];
  let bestPriceKeyRank = Infinity;

  for (const pair of rawPairs) {
    const keyNorm = pair.key.trim().toLowerCase();
    if (priceLabelPattern.test(keyNorm)) {
      const rank = priceKeyPriority.findIndex(p => keyNorm.includes(p));
      const effectiveRank = rank === -1 ? priceKeyPriority.length : rank;
      if (effectiveRank < bestPriceKeyRank) {
        // Extract number from the value (with or without currency symbol)
        const valMatch = pair.value.match(/[\$€£¥]?\s*([\d,]+\.?\d*)/);
        if (valMatch) {
          priceFromPair = valMatch[1].replace(/,/g, '');
          bestPriceKeyRank = effectiveRank;
        }
      }
    }
  }

  if (priceFromPair) {
    result.purchasePrice = priceFromPair;
  } else {
    // Fall back to scanning text for price patterns
    // Handle price ranges: "$2,498.00 - $2,798.00" → use lower value
    const rangeMatch = text.match(/[\$€£¥]\s*([\d,]+\.?\d*)\s*[-–—]\s*[\$€£¥]?\s*([\d,]+\.?\d*)/);
    if (rangeMatch) {
      result.purchasePrice = rangeMatch[1].replace(/,/g, '');
      result.priceNote = `Range: ${rangeMatch[0]}`;
    } else {
      // Single price with currency symbol ($, €, £, ¥)
      const singleMatch = text.match(/[\$€£¥]\s*([\d,]+\.?\d*)/);
      if (singleMatch) {
        result.purchasePrice = singleMatch[1].replace(/,/g, '');
        // Note non-USD currencies
        const currSymbol = text.match(/([\$€£¥])/);
        if (currSymbol && currSymbol[1] !== '$') {
          const currNames = { '€': 'EUR', '£': 'GBP', '¥': 'JPY/CNY' };
          result.priceNote = `Currency: ${currNames[currSymbol[1]] || currSymbol[1]}`;
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Detect brand
  // -----------------------------------------------------------------------
  const textLower = cleaned.toLowerCase();
  const nameToCheck = result.name ? result.name.toLowerCase() : textLower;
  for (const brand of KNOWN_BRANDS) {
    if (nameToCheck.includes(brand.toLowerCase())) {
      result.brand = brand;
      break;
    }
  }
  if (!result.brand) {
    for (const brand of KNOWN_BRANDS) {
      if (textLower.includes(brand.toLowerCase())) {
        result.brand = brand;
        break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // 4. Detect category
  // -----------------------------------------------------------------------
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) score++;
    }
    if (score > 0 && (!result.category || score > (result._catScore || 0))) {
      result.category = category;
      result._catScore = score;
    }
  }
  delete result._catScore;

  // -----------------------------------------------------------------------
  // 4b. Extract serial number / model number from raw pairs
  // -----------------------------------------------------------------------
  const serialPatterns = /^(serial\s*(number|no|#)?|s\/n|sn)$/i;
  const modelPatterns = /^(model\s*(number|no|#)?|part\s*(number|no|#)?|sku|upc|ean|asin|mfr\s*(part|#|number)?|manufacturer\s*part|item\s*(number|no|#)?)$/i;

  for (const pair of rawPairs) {
    const keyNorm = pair.key.trim();
    if (!result.serialNumber && serialPatterns.test(keyNorm)) {
      result.serialNumber = pair.value.trim();
    }
    if (!result.modelNumber && modelPatterns.test(keyNorm)) {
      result.modelNumber = pair.value.trim();
    }
  }

  // -----------------------------------------------------------------------
  // 5. Build alias map and match
  // -----------------------------------------------------------------------
  const { aliasMap, allSpecNames, specCategories } = buildSpecAliasMap(specsConfig);

  const candidateMap = new Map();
  allSpecNames.forEach(name => candidateMap.set(name, []));

  const matchedPairIndices = new Set();

  // --- Pass 1: Direct alias lookups ---
  rawPairs.forEach((pair, idx) => {
    const keyNorm = normalize(pair.key);
    const keyExp = expandAbbreviations(keyNorm);

    let entry = aliasMap.get(keyNorm);
    if (!entry) entry = aliasMap.get(keyExp);

    if (entry) {
      const candidates = candidateMap.get(entry.specName) || [];
      candidates.push({
        value: pair.value,
        confidence: entry.priority,
        sourceKey: pair.key,
      });
      candidateMap.set(entry.specName, candidates);
      matchedPairIndices.add(idx);
    }
  });

  // --- Pass 2: Fuzzy matching for unmatched pairs ---
  const detectedCategory = result.category;
  const sharedFields = new Set(['Weight', 'Dimensions', 'Battery Type', 'Battery Life', 'Mount Type', 'Power Input', 'Material']);

  rawPairs.forEach((pair, idx) => {
    if (matchedPairIndices.has(idx)) return;
    const keyNorm = normalize(pair.key);
    const keyExp = expandAbbreviations(keyNorm);

    const fuzzyMatches = [];

    for (const specName of allSpecNames) {
      const specNorm = normalize(specName);
      const specExp = expandAbbreviations(specNorm);
      const score = Math.max(similarityScore(keyNorm, specNorm), similarityScore(keyExp, specExp));

      if (score >= 50) {
        let adj = score;
        const specCat = specCategories.get(specName);
        if (detectedCategory && specCat && specCat !== detectedCategory && !sharedFields.has(specName)) {
          adj = Math.max(0, score - 25);
        }
        if (adj >= 50) fuzzyMatches.push({ specName, score: adj });
      }
    }

    for (const [alias, entry] of aliasMap.entries()) {
      const aliasExp = expandAbbreviations(alias);
      const score = Math.max(similarityScore(keyNorm, alias), similarityScore(keyExp, aliasExp));

      if (score >= 55) {
        let adj = Math.min(92, score + (entry.priority - 50) * 0.15);
        const specCat = specCategories.get(entry.specName);
        if (detectedCategory && specCat && specCat !== detectedCategory && !sharedFields.has(entry.specName)) {
          adj = Math.max(0, adj - 25);
        }
        if (adj >= 50) fuzzyMatches.push({ specName: entry.specName, score: adj });
      }
    }

    if (fuzzyMatches.length > 0) {
      const bestBySpec = new Map();
      fuzzyMatches.forEach(m => {
        const existing = bestBySpec.get(m.specName);
        if (!existing || m.score > existing.score) bestBySpec.set(m.specName, m);
      });

      for (const [specName, match] of bestBySpec) {
        const candidates = candidateMap.get(specName) || [];
        candidates.push({
          value: pair.value,
          confidence: Math.round(match.score),
          sourceKey: pair.key,
        });
        candidateMap.set(specName, candidates);
      }
      matchedPairIndices.add(idx);
    }
  });

  // --- Pass 3: Resolve best match per field ---
  // Includes: multi-value merging (1.2), conflict detection (4.3), value validation (4.2)
  // RULE: Direct matches (≥ 85) always win over fuzzy matches

  // Known value ranges for validation (4.2)
  const VALUE_RANGES = {
    'Weight': { pattern: /[\d.]+/, max: 100, unit: 'kg', warn: 'Weight over 100kg — verify value' },
    'Focal Length': { pattern: /[\d.]+/, max: 2000, unit: 'mm', warn: 'Focal length over 2000mm — verify value' },
    'Maximum Aperture': { pattern: /f?\/?(\d+\.?\d*)/, group: 1, min: 0.7, max: 64, warn: 'Unusual aperture value — verify' },
    'Minimum Aperture': { pattern: /f?\/?(\d+\.?\d*)/, group: 1, min: 0.7, max: 128, warn: 'Unusual aperture value — verify' },
    'Max Power Output': { pattern: /[\d.]+/, max: 20000, unit: 'W', warn: 'Power over 20kW — verify value' },
    'Screen Size': { pattern: /[\d.]+/, max: 100, unit: 'inches', warn: 'Screen size over 100" — verify value' },
    'Max Height': { pattern: /[\d.]+/, max: 10, unit: 'm', warn: 'Height over 10m — verify value' },
    'Battery Life': { pattern: /[\d.]+/, max: 10000, warn: 'Unusually high battery life — verify value' },
    'ISO Range': { pattern: /[\d,]+/, checkFn: (v) => { const n = parseInt(v.replace(/,/g, '')); return n > 0 && n <= 10000000; }, warn: 'ISO value out of expected range' },
  };

  function validateFieldValue(specName, value) {
    const rule = VALUE_RANGES[specName];
    if (!rule) return null;
    const match = value.match(rule.pattern);
    if (!match) return null;
    if (rule.checkFn) {
      return rule.checkFn(value) ? null : rule.warn;
    }
    const num = parseFloat(match[rule.group || 0]);
    if (isNaN(num)) return null;
    if (rule.min !== undefined && num < rule.min) return rule.warn;
    if (rule.max !== undefined && num > rule.max) return rule.warn;
    return null;
  }

  for (const [specName, candidates] of candidateMap) {
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => b.confidence - a.confidence);

    // Deduplicate by value
    const seen = new Set();
    const deduped = candidates.filter(c => {
      const key = c.value.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // --- Multi-value merging (1.2) ---
    // If multiple candidates share similar source keys and confidence levels,
    // merge their values (e.g. "4K 60p" + "1080p 120p" → "4K 60p, 1080p 120p")
    const directMatches = deduped.filter(c => c.confidence >= 85);
    let merged = null;
    if (directMatches.length > 1) {
      const confRange = Math.max(...directMatches.map(c => c.confidence)) - Math.min(...directMatches.map(c => c.confidence));
      if (confRange <= 10) {
        merged = {
          value: directMatches.map(c => c.value).join(', '),
          confidence: Math.round(directMatches.reduce((s, c) => s + c.confidence, 0) / directMatches.length),
          sourceKey: directMatches.map(c => c.sourceKey).join(' + '),
          mergedCount: directMatches.length,
        };
      }
    }

    // --- Conflict detection (4.3) ---
    // If multiple deduped candidates have very different values but similar confidence, flag as conflict
    let hasConflict = false;
    if (!merged && deduped.length > 1) {
      const topTwo = deduped.slice(0, 2);
      const confDiff = Math.abs(topTwo[0].confidence - topTwo[1].confidence);
      // Conflict: both are reasonably confident and values differ
      if (confDiff <= 15 && topTwo[0].confidence >= 50 && topTwo[1].confidence >= 50) {
        hasConflict = true;
      }
    }

    // Prefer merged → direct match → best candidate
    const directMatch = deduped.find(c => c.confidence >= 85);
    const best = merged || directMatch || deduped[0];

    // Value range validation (4.2)
    const validationWarning = validateFieldValue(specName, best.value);

    result.fields.set(specName, {
      value: best.value,
      confidence: best.confidence,
      sourceKey: best.sourceKey,
      alternatives: deduped.length > 1 ? deduped : [],
      ...(merged ? { mergedCount: merged.mergedCount } : {}),
      ...(hasConflict ? { hasConflict: true } : {}),
      ...(validationWarning ? { validationWarning } : {}),
    });
  }

  // Collect unmatched
  rawPairs.forEach((pair, idx) => {
    if (!matchedPairIndices.has(idx)) {
      result.unmatchedPairs.push({ key: pair.key, value: pair.value });
    }
  });

  return result;
}


// ============================================================================
// Build payload for the item form
// ============================================================================

export function buildApplyPayload(parseResult, selectedValues) {
  const specs = {};
  for (const [specName, data] of parseResult.fields) {
    const override = selectedValues?.[specName];
    const value = override !== undefined ? override : data.value;
    if (value && value.trim()) {
      specs[specName] = value;
    }
  }

  // Include manually-mapped unmatched pairs
  if (selectedValues?._manualMappings) {
    for (const [specName, value] of Object.entries(selectedValues._manualMappings)) {
      if (value && value.trim() && !specs[specName]) {
        specs[specName] = value;
      }
    }
  }

  return {
    name: parseResult.name || '',
    brand: parseResult.brand || '',
    category: parseResult.category || '',
    purchasePrice: parseResult.purchasePrice || '',
    priceNote: parseResult.priceNote || '',
    serialNumber: parseResult.serialNumber || '',
    modelNumber: parseResult.modelNumber || '',
    specs,
  };
}
