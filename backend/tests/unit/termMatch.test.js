const { termMatches, normalizeTerm } = require('../../src/utils/termMatch');
const { isFoodAllowed } = require('../../src/rules/nutritionRules');

describe('termMatches', () => {
  test.each([
    ['Scrambled Eggs', 'egg', true],
    ['Boiled Egg', 'egg', true],
    ['Eggplant Curry', 'egg', false],
    ['Chamomile Tea', 'ham', false],
    ['Ham Sandwich', 'ham', true],
    ['Peanut Butter Toast', 'peanut', true],
    ['Pea Soup', 'pea', true],
    ['Peanut Brittle', 'pea', false],
    ['Stir-fry Tofu', 'stir_fry', true],
    ['Tree nut mix', 'tree_nut', true],
    ['Rice', '', false],
    ['Rice', '   ', false],
  ])('%p vs %p -> %p', (text, term, expected) => {
    expect(termMatches(text, term)).toBe(expected);
  });

  test('regex metacharacters in a term are literal and do not throw', () => {
    expect(termMatches('a.b', 'a.b')).toBe(true);
    expect(termMatches('axb', 'a.b')).toBe(false);
    expect(() => termMatches('x', '(')).not.toThrow();
    expect(() => termMatches('x', '[a-')).not.toThrow();
  });

  test('normalizeTerm', () => {
    expect(normalizeTerm('  Tree_Nut-Mix ')).toBe('tree nut mix');
    expect(normalizeTerm(null)).toBe('');
  });
});

describe('isFoodAllowed uses whole-word dislikes', () => {
  const constraints = (disliked) => ({ food_preference: 'non-vegetarian', excluded_allergens: [], disliked });
  test('"ham" no longer removes chamomile tea but still removes ham', () => {
    expect(isFoodAllowed({ foodName: 'Chamomile Tea' }, constraints(['ham']))[0]).toBe(true);
    expect(isFoodAllowed({ foodName: 'Ham Sandwich' }, constraints(['ham']))[0]).toBe(false);
  });
  test('underscored dislikes match spaced names; plural forms match', () => {
    expect(isFoodAllowed({ foodName: 'Stir fry noodles' }, constraints(['stir_fry']))[0]).toBe(false);
    expect(isFoodAllowed({ foodName: 'Boiled Eggs' }, constraints(['egg']))[0]).toBe(false);
  });
});
