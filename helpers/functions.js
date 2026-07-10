const LANGUAGE_DISPLAY = {
  c: 'C',
  'c++': 'C++',
  'c#': 'C#',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  php: 'PHP',
  ruby: 'Ruby',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  dart: 'Dart',
  vue: 'Vue',
  scala: 'Scala',
  haskell: 'Haskell',
  elixir: 'Elixir',
  erlang: 'Erlang',
  clojure: 'Clojure',
  lua: 'Lua',
  r: 'R',
  matlab: 'MATLAB',
  mathematica: 'Mathematica',
  fortran: 'Fortran',
  shell: 'Shell',
  powershell: 'PowerShell',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  cmake: 'CMake',
  'objective-c': 'Objective-C',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  handlebars: 'Handlebars',
  hack: 'Hack',
  blade: 'Blade',
  smarty: 'Smarty',
  meson: 'Meson',
  roff: 'Roff',
  just: 'Just',
  sql: 'SQL',
  graphql: 'GraphQL',
  yaml: 'YAML',
  json: 'JSON',
  markdown: 'Markdown',
  tex: 'TeX',
  cuda: 'CUDA',
  hlsl: 'HLSL',
  glsl: 'GLSL',
  wasm: 'WebAssembly',
  'go template': 'Go Template',
  'jupyter notebook': 'Jupyter Notebook',
  procfile: 'Procfile',
};

export function formatLanguageName(name) {
  if (!name) {
    return '';
  }

  const trimmed = name.trim();
  const key = trimmed.toLowerCase();

  if (LANGUAGE_DISPLAY[key]) {
    return LANGUAGE_DISPLAY[key];
  }

  if (trimmed !== key && /[A-Z]/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/(\s+|-)/g)
    .map((segment) => {
      if (!segment || /^[\s-]+$/.test(segment)) {
        return segment;
      }

      const segmentKey = segment.toLowerCase();
      return (
        LANGUAGE_DISPLAY[segmentKey] ?? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
      );
    })
    .join('');
}

export function formatNumber(num) {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
  }
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export function formatDelta(delta) {
  if (delta === null || delta === undefined || delta === 0) {
    return '';
  }
  const sign = delta > 0 ? '+' : '';
  return ` (${sign}${formatNumber(Math.abs(delta))})`;
}

export function getNptTimestamp() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return `${years} years, ${months} months, ${days} days`;
}
