const getCacheKey = (prefix, value) => `${prefix}:${value}`;

const createCountryFinder = (client) => {
  const cache = new Map();

  return async (isoCode, countryName) => {
    const normalizedIso = isoCode ? isoCode.trim().toUpperCase() : null;
    const normalizedName = countryName ? countryName.trim().toLowerCase() : null;

    if (!normalizedIso && !normalizedName) {
      throw new Error("Missing country identifier");
    }

    if (normalizedIso) {
      const cacheKey = getCacheKey("iso", normalizedIso);
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const q = await client.query(
        "SELECT id, name FROM countries WHERE iso_code = $1",
        [normalizedIso]
      );
      if (q.rows[0]) {
        cache.set(cacheKey, q.rows[0].id);
        if (normalizedName) {
          cache.set(getCacheKey("name", normalizedName), q.rows[0].id);
        }
        return q.rows[0].id;
      }
    }

    if (normalizedName) {
      const cacheKey = getCacheKey("name", normalizedName);
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const q = await client.query(
        "SELECT id, iso_code FROM countries WHERE LOWER(name) = $1",
        [normalizedName]
      );
      if (q.rows[0]) {
        cache.set(cacheKey, q.rows[0].id);
        if (q.rows[0].iso_code) {
          cache.set(getCacheKey("iso", q.rows[0].iso_code), q.rows[0].id);
        }
        return q.rows[0].id;
      }
    }

    throw new Error(
      `Country not found. iso_code="${normalizedIso || ""}" name="${
        countryName || ""
      }"`
    );
  };
};

const createStateFinder = (client) => {
  const cache = new Map();

  return async (countryId, stateCode, stateName) => {
    const normalizedCode = stateCode ? stateCode.trim().toUpperCase() : null;
    const normalizedName = stateName ? stateName.trim().toLowerCase() : null;

    if (!countryId) {
      throw new Error("countryId is required to resolve a state");
    }

    if (!normalizedCode && !normalizedName) {
      return null;
    }

    if (normalizedCode) {
      const cacheKey = getCacheKey("code", `${countryId}:${normalizedCode}`);
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const q = await client.query(
        "SELECT id FROM states WHERE country_id = $1 AND UPPER(code) = $2",
        [countryId, normalizedCode]
      );
      if (q.rows[0]) {
        cache.set(cacheKey, q.rows[0].id);
        if (normalizedName) {
          cache.set(getCacheKey("name", `${countryId}:${normalizedName}`), q.rows[0].id);
        }
        return q.rows[0].id;
      }
    }

    if (normalizedName) {
      const cacheKey = getCacheKey("name", `${countryId}:${normalizedName}`);
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      const q = await client.query(
        "SELECT id, code FROM states WHERE country_id = $1 AND LOWER(name) = $2",
        [countryId, normalizedName]
      );
      if (q.rows[0]) {
        cache.set(cacheKey, q.rows[0].id);
        if (q.rows[0].code) {
          cache.set(
            getCacheKey("code", `${countryId}:${q.rows[0].code.toUpperCase()}`),
            q.rows[0].id
          );
        }
        return q.rows[0].id;
      }
    }

    throw new Error(
      `State not found for country ${countryId}. code="${normalizedCode || ""}" name="${
        stateName || ""
      }"`
    );
  };
};

module.exports = {
  createCountryFinder,
  createStateFinder,
};
