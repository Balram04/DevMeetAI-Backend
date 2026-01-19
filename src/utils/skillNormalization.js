const normalizeSkillDisplay = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeSkillKey = (value) => normalizeSkillDisplay(value).toLowerCase();

const normalizeSkillList = (input) => {
  let list = [];

  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    // Backward-compat for legacy clients that send comma-separated strings
    list = input.split(',');
  } else {
    list = [];
  }

  const seen = new Set();
  const cleaned = [];

  for (const item of list) {
    const display = normalizeSkillDisplay(item);
    if (!display) continue;

    const key = display.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    cleaned.push(display);
  }

  return cleaned;
};

const normalizeSkillKeyList = (input) => normalizeSkillList(input).map((s) => s.toLowerCase());

module.exports = {
  normalizeSkillDisplay,
  normalizeSkillKey,
  normalizeSkillList,
  normalizeSkillKeyList,
};
