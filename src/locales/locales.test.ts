import ca from './ca.json';
import en from './en.json';
import es from './es.json';

type TranslationTree = { [key: string]: string | TranslationTree };

// Turns { tabs: { today: 'Avui' } } into { 'tabs.today': 'Avui' }.
function flatten(tree: TranslationTree, prefix = ''): Record<string, string> {
  const texts: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      texts[path] = value;
    } else {
      Object.assign(texts, flatten(value, path));
    }
  }
  return texts;
}

const catalanKeys = Object.keys(flatten(ca)).sort();

// The type check already catches keys missing from es/en. These tests also
// catch leftover keys that Catalan no longer has, and empty texts.
describe.each(Object.entries({ ca, es, en }))('%s.json', (_language, locale) => {
  const texts = flatten(locale);

  test('has exactly the same keys as ca.json', () => {
    expect(Object.keys(texts).sort()).toEqual(catalanKeys);
  });

  test('has no empty texts', () => {
    const emptyKeys = Object.keys(texts).filter((key) => texts[key].trim() === '');
    expect(emptyKeys).toEqual([]);
  });
});
