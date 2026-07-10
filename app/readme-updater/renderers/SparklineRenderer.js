class SparklineRenderer {
  static render(values, x, y, width = 28, height = 10, className = 'sparkline', dotClass = 'sparkline-dot') {
    const series = Array.isArray(values) ? values : [];
    if (!series.length) {
      return '';
    }

    const max = Math.max(...series, 1);
    const step = series.length > 1 ? width / (series.length - 1) : 0;
    const points = series.map((value, index) => {
      const px = x + index * step;
      const py = y + height - (value / max) * (height - 2) - 1;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    });
    const last = points[points.length - 1].split(',');

    return `
      <polyline points="${points.join(' ')}" class="${className}" fill="none" />
      <circle cx="${last[0]}" cy="${last[1]}" r="1.4" class="${dotClass}" />
    `;
  }
}

export default SparklineRenderer;
