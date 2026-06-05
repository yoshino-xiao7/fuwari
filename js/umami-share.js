(function (global) {
  const cacheKey = 'umami-share-cache';
  const cacheTTL = 3600_000; // 1h
  const failCacheKey = 'umami-share-fail';
  const failTTL = 300_000; // 失败后 5分钟内不重试，避免刷屏

  async function fetchShareData(baseUrl, shareId) {
    // 检查是否有失败缓存
    const failCached = localStorage.getItem(failCacheKey);
    if (failCached) {
      try {
        const failParsed = JSON.parse(failCached);
        if (Date.now() - failParsed.timestamp < failTTL) {
          // 5分钟内失败过，直接抛出错误（静默处理）
          throw new Error('Temporarily disabled after recent failure');
        } else {
          localStorage.removeItem(failCacheKey);
        }
      } catch {
        localStorage.removeItem(failCacheKey);
      }
    }

    // 先检查正常缓存
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < cacheTTL) {
          return parsed.value;
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      // 添加 timeout 和 静默错误处理
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${baseUrl}/analytics/us/api/share/${shareId}`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // 静默处理失败，记录失败缓存
        localStorage.setItem(failCacheKey, JSON.stringify({ timestamp: Date.now() }));
        throw new Error('获取 Umami 分享信息失败');
      }

      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), value: data }));
      return data;
    } catch (err) {
      // 记录失败，避免频繁请求
      localStorage.setItem(failCacheKey, JSON.stringify({ timestamp: Date.now() }));
      throw err;
    }
  }

  /**
   * 获取 Umami 分享数据（websiteId、token）
   * 在缓存 TTL 内复用；并用全局 Promise 避免并发请求
   * @param {string} baseUrl
   * @param {string} shareId
   * @returns {Promise<{websiteId: string, token: string}>}
   */
  global.getUmamiShareData = function (baseUrl, shareId) {
    if (!global.__umamiSharePromise) {
      global.__umamiSharePromise = fetchShareData(baseUrl, shareId).catch((err) => {
        delete global.__umamiSharePromise;
        throw err;
      });
    }
    return global.__umamiSharePromise;
  };

  global.clearUmamiShareCache = function () {
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(failCacheKey);
    delete global.__umamiSharePromise;
  };
})(window);