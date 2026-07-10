export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry(task, label, attempts = 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      const delayMs = 2 ** attempt * 1000;
      console.warn(`${label} failed — retry ${attempt}/${attempts} in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

export async function mapPool(items, limit, worker) {
  if (!items.length) {
    return [];
  }

  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}
