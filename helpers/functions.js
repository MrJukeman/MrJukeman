/**
 * @param {number} num
 * @returns {string}
 */
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

/**
 * @param {number|null|undefined} delta
 * @returns {string}
 */
export function formatDelta(delta) {
  if (delta === null || delta === undefined || delta === 0) {
    return '';
  }
  const sign = delta > 0 ? '+' : '';
  return ` (${sign}${formatNumber(Math.abs(delta))})`;
}

/**
 * @returns {string}
 */
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

/**
 * @param {string} isoDate
 * @returns {string}
 */
export function formatSyncAgo(isoDate) {
  if (!isoDate) {
    return 'just now';
  }

  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * @param {string} dob
 * @returns {string}
 */
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

/**
 * @param {number} count
 * @param {string} theme
 * @returns {string}
 */
export function heatmapColor(count, theme) {
  if (count === 0) {
    return theme === 'light' ? '#ebedf0' : '#161b22';
  }
  if (count <= 3) return theme === 'hacker-green' ? '#003b00' : '#0e4429';
  if (count <= 6) return theme === 'hacker-green' ? '#006600' : '#006d32';
  if (count <= 9) return theme === 'hacker-green' ? '#00aa00' : '#26a641';
  return theme === 'hacker-green' ? '#00ff41' : '#39d353';
}
