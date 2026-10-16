/**
 * Constraint checks for LLM-generated text.
 *
 * The rule engine filters foods with structured data (Food.allergenTags, vegan,
 * vegetarian). LLM output is free text, so the same constraints are enforced here
 * with term lists. The checks are deliberately conservative: a false positive
 * (dropping a harmless sentence) is acceptable, a false negative (suggesting a
 * peanut dish to a peanut-allergic user) is not. Any failure to evaluate a
 * constraint is treated as a violation (fail closed).
 */

const { KNOWN_ALLERGENS } = require('../utils/constants');

const MEAT_TERMS = [
  'chicken', 'mutton', 'lamb', 'beef', 'pork', 'bacon', 'ham', 'turkey', 'duck',
  'goat', 'veal', 'sausage', 'salami', 'steak', 'meat', 'meatball', 'keema',
  'gelatin', 'gelatine', 'lard', 'poultry',
];

// Each allergen maps to the words that would reveal it in free text.
const ALLERGEN_TERMS = {
  milk: [
    'milk', 'dairy', 'paneer', 'curd', 'yogurt', 'yoghurt', 'cheese', 'butter', 'ghee',
    'buttermilk', 'chaas', 'cream', 'whey', 'casein', 'lassi', 'khoa', 'kefir',
    'cottage cheese', 'custard', 'ice cream',
  ],
  peanut: ['peanut', 'groundnut', 'monkey nut'],
  tree_nut: [
    'almond', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'pecan', 'macadamia',
    'brazil nut', 'pine nut', 'tree nut', 'chestnut', 'praline', 'marzipan',
  ],
  soy: ['soy', 'soya', 'soybean', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari'],
  gluten: [
    'gluten', 'wheat', 'roti', 'chapati', 'chapatti', 'bread', 'toast', 'pasta',
    'barley', 'rye', 'semolina', 'suji', 'rava', 'upma', 'oats', 'oatmeal', 'thepla',
    'paratha', 'naan', 'noodles', 'couscous', 'seitan', 'bulgur', 'pizza', 'cereal',
  ],
  egg: ['egg', 'omelette', 'omelet', 'mayonnaise', 'mayo', 'meringue'],
  fish: [
    'fish', 'salmon', 'tuna', 'sardine', 'mackerel', 'anchovy', 'anchovies', 'cod',
    'hilsa', 'pomfret', 'trout', 'tilapia', 'herring', 'rohu',
  ],
  shellfish: [
    'shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'mussel', 'clam',
    'squid', 'scallop', 'crayfish', 'calamari',
  ],
  sesame: ['sesame', 'tahini', 'gingelly', 'til'],
};

// The app's own food data (seed: Boiled Eggs, Egg Curry) marks eggs as NOT vegetarian,
// so free text follows the same definition: vegetarian = no meat, fish or eggs.
const NON_VEGETARIAN_TERMS = [
  ...MEAT_TERMS, ...ALLERGEN_TERMS.fish, ...ALLERGEN_TERMS.shellfish, ...ALLERGEN_TERMS.egg,
];
// Vegan additionally excludes dairy and bee products.
const VEGAN_EXTRA_TERMS = [...ALLERGEN_TERMS.milk, 'honey', 'beeswax'];

// "Coconut milk" or "peanut butter" are plant foods and must not trip the dairy
// terms. They are removed ONLY before dairy terms are tested; allergen terms such as
// soy or peanut are always tested against the original text.
const PLANT_DAIRY_PHRASES = new RegExp(
  '\\b(?:coconut|almond|soy|soya|oat|rice|cashew|hazelnut|plant|nut|peanut|cocoa|shea)'
  + '\\s+(?:milk|butter|cream|yogurt|yoghurt|cheese)\\b'
  + '|\\bbutter\\s+(?:bean|beans)\\b|\\bbutternut\\b|\\bcream\\s+of\\s+tartar\\b',
  'gi',
);
const DAIRY_TERM_SET = new Set(ALLERGEN_TERMS.milk);

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const termRegexCache = new Map();
function termRegex(term) {
  if (!termRegexCache.has(term)) {
    // Word boundaries: "egg" must not match "eggplant"; optional plural suffix.
    termRegexCache.set(term, new RegExp(`\\b${escapeRegExp(term)}(?:s|es)?\\b`, 'i'));
  }
  return termRegexCache.get(term);
}

function normaliseKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function termsForAllergen(allergen) {
  const key = normaliseKey(allergen);
  if (ALLERGEN_TERMS[key]) return ALLERGEN_TERMS[key];
  // Unknown or custom allergen: fall back to the allergen's own words.
  const own = key.replace(/_/g, ' ').trim();
  return own ? [own] : [];
}

function matchedTerms(text, terms) {
  const plain = String(text || '');
  const plantSafe = plain.replace(PLANT_DAIRY_PHRASES, ' ');
  const hits = [];
  for (const term of terms) {
    const haystack = DAIRY_TERM_SET.has(term) ? plantSafe : plain;
    if (termRegex(term).test(haystack)) hits.push(term);
  }
  return hits;
}

/**
 * Build constraints from the engine profile (profile.asEngine()).
 * Throws if the profile is unusable, so callers can fail closed.
 */
function buildConstraints(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new Error('Profile required to evaluate LLM safety constraints.');
  }
  const allergies = Array.isArray(profile.allergy_list) ? profile.allergy_list : [];
  const dislikes = Array.isArray(profile.dislike_list)
    ? profile.dislike_list
    : (Array.isArray(profile.food_dislikes) ? profile.food_dislikes : []);
  return {
    foodPreference: normaliseKey(profile.food_preference).replace(/_/g, '-'),
    allergies: allergies.map(normaliseKey).filter(Boolean),
    dislikes: dislikes.map((d) => normaliseKey(d).replace(/_/g, ' ')).filter(Boolean),
  };
}

/**
 * Returns the list of violated constraints for a piece of text ([] means safe).
 */
function violations(text, constraints) {
  if (typeof text !== 'string') return ['non-text value'];
  const found = [];

  for (const allergen of constraints.allergies) {
    const hits = matchedTerms(text, termsForAllergen(allergen));
    if (hits.length) found.push(`allergen:${allergen} (${hits[0]})`);
  }

  if (constraints.foodPreference === 'vegan') {
    const hits = matchedTerms(text, [...NON_VEGETARIAN_TERMS, ...VEGAN_EXTRA_TERMS]);
    if (hits.length) found.push(`vegan (${hits[0]})`);
  } else if (constraints.foodPreference === 'vegetarian') {
    const hits = matchedTerms(text, NON_VEGETARIAN_TERMS);
    if (hits.length) found.push(`vegetarian (${hits[0]})`);
  }

  for (const dislike of constraints.dislikes) {
    if (termRegex(dislike).test(text)) found.push(`dislike:${dislike}`);
  }
  return found;
}

function isTextSafe(text, constraints) {
  try {
    return violations(text, constraints).length === 0;
  } catch (err) {
    return false; // fail closed
  }
}

const AREAS = ['nutrition', 'activity', 'wellness'];

/**
 * Remove every LLM item (and summary / safety note) that violates the constraints.
 * Returns { result, removed } or null when the result cannot be certified.
 */
function filterLlmRecommendations(llm, profile) {
  let constraints;
  try {
    constraints = buildConstraints(profile);
  } catch (err) {
    return null;
  }
  if (!llm || typeof llm !== 'object') return null;

  const removed = [];
  const result = { ...llm };

  for (const area of AREAS) {
    const items = Array.isArray(llm[area]) ? llm[area] : [];
    result[area] = items.filter((item) => {
      const text = `${item && item.title} ${item && item.description} ${item && item.reason}`;
      let found;
      try {
        found = violations(text, constraints);
      } catch (err) {
        found = ['evaluation error'];
      }
      if (found.length) {
        removed.push({ area, reasons: found });
        return false;
      }
      return true;
    });
  }

  if (typeof llm.summary === 'string' && llm.summary) {
    const found = violations(llm.summary, constraints);
    if (found.length) {
      removed.push({ area: 'summary', reasons: found });
      result.summary = '';
    }
  }

  if (Array.isArray(llm.medical_safety)) {
    result.medical_safety = llm.medical_safety.filter((note) => {
      const found = violations(note, constraints);
      if (found.length) removed.push({ area: 'medical_safety', reasons: found });
      return found.length === 0;
    });
  }
  return { result, removed };
}

module.exports = {
  KNOWN_ALLERGENS,
  ALLERGEN_TERMS,
  NON_VEGETARIAN_TERMS,
  buildConstraints,
  violations,
  isTextSafe,
  filterLlmRecommendations,
};
