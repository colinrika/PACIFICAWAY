const normalize = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const resolveName = (name, firstName, lastName) => {
  const legacy = normalize(name);
  if (legacy) {
    return legacy;
  }

  const safeFirst = normalize(firstName);
  const safeLast = normalize(lastName);

  const combined = [safeFirst, safeLast].filter(Boolean).join(" ");
  return combined.trim();
};

const splitName = (fullName) => {
  const normalized = normalize(fullName);
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [first, ...rest] = normalized.split(" ");
  return {
    firstName: first || "",
    lastName: rest.join(" ") || "",
  };
};

module.exports = {
  resolveName,
  splitName,
};
