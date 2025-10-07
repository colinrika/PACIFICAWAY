const { splitName } = require("./names");

const has = (row, key) => Object.prototype.hasOwnProperty.call(row, key);

const buildCountry = (row) => {
  if (!has(row, "country_id") && !has(row, "country_name") && !has(row, "country_iso_code")) {
    return undefined;
  }

  const present = row.country_id || row.country_name || row.country_iso_code;
  if (!present) {
    return null;
  }

  return {
    id: row.country_id || null,
    name: row.country_name || null,
    isoCode: row.country_iso_code || null,
  };
};

const formatUserRow = (row) => {
  if (!row) {
    return null;
  }

  const { firstName, lastName } = splitName(row.name);

  const formatted = {
    id: row.id,
    name: row.name,
    firstName,
    lastName,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    phoneNumber: has(row, "phone_number") ? row.phone_number : undefined,
    countryId: has(row, "country_id") ? row.country_id : undefined,
  };

  const country = buildCountry(row);
  if (country !== undefined) {
    formatted.country = country;
  }

  return formatted;
};

module.exports = {
  formatUserRow,
};
