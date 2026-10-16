const { KNOWN_ALLERGENS } = require('../../src/utils/constants');
const {
  buildConstraints, violations, isTextSafe, filterLlmRecommendations,
} = require('../../src/services/llmSafety');
const { validateLlmOutput, isUnsafeText } = require('../../src/services/aiService');

const profile = (overrides = {}) => ({
  food_preference: 'non-vegetarian',
  allergy_list: [],
  dislike_list: [],
  ...overrides,
});
const constraintsFor = (overrides) => buildConstraints(profile(overrides));

// One sentence per allergen that a real LLM could plausibly produce.
const ALLERGEN_SENTENCES = {
  milk: 'Have a bowl of curd with fruit for breakfast.',
  peanut: 'A handful of roasted groundnuts makes a good snack.',
  tree_nut: 'Add almonds and walnuts to your oats.',
  soy: 'Stir-fry tofu with vegetables for dinner.',
  gluten: 'Two whole wheat rotis with dal work well at lunch.',
  egg: 'Make a two-egg omelette with spinach.',
  fish: 'Grilled salmon with greens is a lean dinner.',
  shellfish: 'Garlic prawns with peppers are high in protein.',
  sesame: 'Drizzle tahini over a salad.',
};

describe('allergy enforcement', () => {
  test('every known allergen has a test sentence', () => {
    expect(Object.keys(ALLERGEN_SENTENCES).sort()).toEqual([...KNOWN_ALLERGENS].sort());
  });

  test.each(KNOWN_ALLERGENS)('blocks %s for a user with that allergy', (allergen) => {
    const c = constraintsFor({ allergy_list: [allergen] });
    expect(isTextSafe(ALLERGEN_SENTENCES[allergen], c)).toBe(false);
    expect(violations(ALLERGEN_SENTENCES[allergen], c)[0]).toContain(`allergen:${allergen}`);
  });

  test.each(KNOWN_ALLERGENS)('does not block %s text for a user without that allergy', (allergen) => {
    const c = constraintsFor({ allergy_list: [] });
    expect(isTextSafe(ALLERGEN_SENTENCES[allergen], c)).toBe(true);
  });

  test('allergen names are normalised (spaces, hyphens, case)', () => {
    for (const spelling of ['tree nut', 'Tree-Nut', 'TREE_NUT']) {
      const c = constraintsFor({ allergy_list: [spelling] });
      expect(isTextSafe('Add almonds to the porridge.', c)).toBe(false);
    }
  });

  test('synonyms are caught, not only the allergen name', () => {
    const milk = constraintsFor({ allergy_list: ['milk'] });
    for (const text of ['Paneer tikka is a good protein.', 'Add ghee to the dal.', 'Buttermilk after lunch.']) {
      expect(isTextSafe(text, milk)).toBe(false);
    }
  });

  test('plant milks do not trip a dairy allergy, but soy milk still trips a soy allergy', () => {
    const milk = constraintsFor({ allergy_list: ['milk'] });
    expect(isTextSafe('Coconut milk curry with rice.', milk)).toBe(true);
    const soy = constraintsFor({ allergy_list: ['soy'] });
    expect(isTextSafe('A glass of soy milk with breakfast.', soy)).toBe(false);
  });

  test('peanut butter is a peanut allergen even though it is a plant food', () => {
    expect(isTextSafe('Peanut butter on toast.', constraintsFor({ allergy_list: ['peanut'] }))).toBe(false);
  });

  test('custom allergens fall back to their own words', () => {
    const c = constraintsFor({ allergy_list: ['mustard'] });
    expect(isTextSafe('Season with mustard seeds.', c)).toBe(false);
    expect(isTextSafe('Season with cumin.', c)).toBe(true);
  });
});

describe('vegan restriction', () => {
  const vegan = constraintsFor({ food_preference: 'vegan' });

  test.each([
    'Paneer bhurji with toast.',
    'A two-egg omelette.',
    'Drizzle honey over oats.',
    'Grilled chicken breast.',
    'Add a spoon of ghee.',
    'Baked fish with lemon.',
    'A glass of milk before bed.',
  ])('blocks "%s"', (text) => {
    expect(isTextSafe(text, vegan)).toBe(false);
  });

  test.each([
    'Moong dal with spinach and brown rice.',
    'Coconut milk curry with vegetables.',
    'Peanut butter on wholegrain toast.',
    'Roasted chickpeas as a snack.',
  ])('allows "%s"', (text) => {
    expect(isTextSafe(text, vegan)).toBe(true);
  });
});

describe('vegetarian restriction', () => {
  const vegetarian = constraintsFor({ food_preference: 'vegetarian' });

  test.each([
    'Grilled chicken salad.',
    'Fish curry with rice.',
    'Prawn stir fry.',
    'Boiled eggs for breakfast.', // the app's own food data marks eggs non-vegetarian
    'Lamb stew for dinner.',
  ])('blocks "%s"', (text) => {
    expect(isTextSafe(text, vegetarian)).toBe(false);
  });

  test.each([
    'Paneer tikka with mint chutney.',
    'Curd rice with cucumber.',
    'Rajma curry with brown rice.',
  ])('allows "%s"', (text) => {
    expect(isTextSafe(text, vegetarian)).toBe(true);
  });

  test('a non-vegetarian user is not restricted by diet', () => {
    expect(isTextSafe('Grilled chicken with eggs.', constraintsFor({ food_preference: 'non-vegetarian' }))).toBe(true);
  });
});

describe('dislikes', () => {
  test('dislike matches whole words only', () => {
    const c = constraintsFor({ dislike_list: ['egg'] });
    expect(isTextSafe('Baingan bharta with eggplant.', c)).toBe(true);
    expect(isTextSafe('Have an egg sandwich.', c)).toBe(false);
  });

  test('underscored dislikes become phrases, plurals are caught', () => {
    expect(isTextSafe('Stuffed bitter gourd for lunch.', constraintsFor({ dislike_list: ['bitter_gourd'] }))).toBe(false);
    expect(isTextSafe('Sauteed mushrooms on toast.', constraintsFor({ dislike_list: ['mushroom'] }))).toBe(false);
  });

  test('food_dislikes is used when dislike_list is absent', () => {
    const c = buildConstraints({ food_preference: 'vegan', food_dislikes: ['okra'] });
    expect(isTextSafe('Crispy okra fry.', c)).toBe(false);
  });
});

describe('fail-closed behaviour', () => {
  test('constraints cannot be built without a profile', () => {
    expect(() => buildConstraints(null)).toThrow();
    expect(() => buildConstraints(undefined)).toThrow();
  });

  test('filterLlmRecommendations returns null when the profile is missing', () => {
    expect(filterLlmRecommendations({ nutrition: [{ title: 'x' }] }, null)).toBeNull();
  });

  test('filterLlmRecommendations returns null for a non-object result', () => {
    expect(filterLlmRecommendations(null, profile())).toBeNull();
    expect(filterLlmRecommendations('text', profile())).toBeNull();
  });

  test('isTextSafe is false when constraints are broken', () => {
    expect(isTextSafe('Plain rice.', undefined)).toBe(false);
  });

  test('non-text values are violations', () => {
    expect(violations(42, constraintsFor({}))).toEqual(['non-text value']);
  });
});

describe('filterLlmRecommendations', () => {
  const llm = {
    summary: 'Enjoy paneer and lentils this week.',
    nutrition: [
      { title: 'Paneer wrap', description: 'High protein lunch.', reason: 'Protein target.', priority: 'high' },
      { title: 'Lentil soup', description: 'Warm and filling.', reason: 'Fibre.', priority: 'medium' },
      { title: 'Peanut chikki', description: 'Quick snack.', reason: 'Energy.', priority: 'low' },
    ],
    activity: [{ title: 'Evening walk', description: '20 minutes.', reason: 'Sleep.', priority: 'medium' }],
    wellness: [{ title: 'Bedtime milk', description: 'A glass of milk at night.', reason: 'Sleep.', priority: 'low' }],
    medical_safety: ['Avoid eggs if unsure.', 'Check with your doctor before big changes.'],
    professional_guidance: true,
  };

  test('removes violating items, the summary and unsafe notes; keeps safe ones', () => {
    const { result, removed } = filterLlmRecommendations(
      llm,
      profile({ food_preference: 'vegan', allergy_list: ['peanut'] }),
    );
    expect(result.nutrition.map((i) => i.title)).toEqual(['Lentil soup']);
    expect(result.activity).toHaveLength(1);
    expect(result.wellness).toEqual([]);
    expect(result.summary).toBe('');
    expect(result.medical_safety).toEqual(['Check with your doctor before big changes.']);
    expect(result.professional_guidance).toBe(true);
    expect(removed.map((r) => r.area).sort()).toEqual(
      ['medical_safety', 'nutrition', 'nutrition', 'summary', 'wellness'].sort(),
    );
  });

  test('does not mutate its input', () => {
    const copy = JSON.parse(JSON.stringify(llm));
    filterLlmRecommendations(llm, profile({ food_preference: 'vegan' }));
    expect(llm).toEqual(copy);
  });

  test('keeps everything when no constraint is violated', () => {
    const { result, removed } = filterLlmRecommendations(llm, profile({ food_preference: 'non-vegetarian' }));
    expect(removed).toEqual([]);
    expect(result.nutrition).toHaveLength(3);
  });

  test('tolerates items with missing or non-string fields', () => {
    const { result } = filterLlmRecommendations(
      { nutrition: [null, { title: 7 }, { description: 'Lentil soup' }], summary: 5 },
      profile({ food_preference: 'vegan' }),
    );
    expect(result.nutrition.length).toBeLessThanOrEqual(3);
  });
});

describe('structural validation still screens medical claims', () => {
  test('drops items that tell the user to change medication', () => {
    const out = validateLlmOutput({
      nutrition: [
        { title: 'Plan', description: 'You should stop taking your medication.', reason: 'x', priority: 'high' },
        { title: 'Oats', description: 'Warm oats with fruit.', reason: 'Fibre', priority: 'bogus' },
      ],
    });
    expect(out.nutrition).toHaveLength(1);
    expect(out.nutrition[0].priority).toBe('medium');
  });

  test.each([
    'stop taking medication',
    'You should stop taking your medication.',
    'Please stop your medication for a week.',
    'Skip your insulin before the walk.',
    'discontinue the prescribed medicine',
    'Change your dosage slowly.',
  ])('isUnsafeText flags "%s"', (text) => {
    expect(isUnsafeText(text)).toBe(true);
  });

  test.each([
    'Take your medication with food as your doctor advised.',
    'Stop eating two hours before bed.',
    'Take a short walk after meals.',
  ])('isUnsafeText allows "%s"', (text) => {
    expect(isUnsafeText(text)).toBe(false);
  });

  test('isUnsafeText flags diagnosis language', () => {
    expect(isUnsafeText('This looks like a diagnosis of diabetes.')).toBe(true);
    expect(isUnsafeText('Take a short walk after meals.')).toBe(false);
  });

  test('non-object input is rejected', () => {
    expect(validateLlmOutput(null)).toBeNull();
    expect(validateLlmOutput('x')).toBeNull();
  });
});
