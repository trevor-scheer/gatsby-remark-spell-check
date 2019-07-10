const { readFileSync } = require('fs');
const SpellChecker = require('spellchecker');
const remark = require('remark');
const plugin = require('..');

const markdownAST = remark().parse("Here's a typooo welcome to node.js");

const dictionaryPath = `${process.cwd()}/__tests__/__fixtures__/spelling`;

const cache = {
  get() {
    return Promise.resolve(false);
  },
  set() {}
};

let wordsToRemove;
beforeAll(() => {
  // Cleanup custom dictionary words
  if (!wordsToRemove) {
    wordsToRemove = readFileSync(dictionaryPath)
      .toString()
      .split(/\s/);
  }

  wordsToRemove.forEach(SpellChecker.remove);
});

it('basic', () => {
  expect(plugin({ markdownAST, cache })).rejects
    .toThrowErrorMatchingInlineSnapshot(`
"The following words are misspelled. Please correct them or add them to the dictionary:

	typooo, node.js"
`);
});

it('ignores using ignorePatterns', () => {
  // ignores "node.js"
  expect(plugin({ markdownAST, cache }, { ignorePatterns: [/^.*\.js$/] }))
    .rejects.toThrowErrorMatchingInlineSnapshot(`
"The following words are misspelled. Please correct them or add them to the dictionary:

	typooo"
`);
});

it('uses external dictionaries', () => {
  // No typos found when the dictionary is loaded
  expect(
    plugin({ markdownAST, cache }, { dictionaries: [dictionaryPath] })
  ).resolves.toBeTruthy();
});

it('utilizes the cache correctly', async () => {
  const setMock = jest.fn();

  const getMock = jest
    .fn()
    .mockReturnValueOnce(Promise.resolve(false))
    .mockReturnValueOnce(Promise.resolve(true))
    .mockReturnValueOnce(Promise.resolve(true));

  const cache = {
    set: setMock,
    get: getMock
  };

  await plugin({ markdownAST, cache });
  await plugin({ markdownAST, cache });
  await plugin({ markdownAST, cache });

  expect(getMock).toHaveBeenCalledTimes(3);
  expect(setMock).toHaveBeenCalledTimes(1);
});
