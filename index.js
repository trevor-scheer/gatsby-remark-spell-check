const { readFileSync } = require('fs');
const visit = require('unist-util-visit');
const SpellChecker = require('spellchecker');

const whiteSpace = /\s/;
const cacheKey = 'gatsby-remark-spell-check-dictionaries-loaded';
module.exports = async function plugin(
  { markdownAST, cache },
  { ignorePatterns = [], dictionaries = [] } = {}
) {
  const misspellings = [];

  const dictionariesLoaded = await cache.get(cacheKey);

  if (!dictionariesLoaded) {
    dictionaries.forEach(dictionary => {
      const wordsToAdd = readFileSync(dictionary)
        .toString()
        .split(whiteSpace);

      wordsToAdd.forEach(SpellChecker.add);
    });
    cache.set(cacheKey, true);
  }

  visit(markdownAST, 'text', node => {
    let words = node.value.split(whiteSpace).filter(Boolean);

    const misspellingsOnly = words.filter(word =>
      SpellChecker.isMisspelled(word)
    );

    if (ignorePatterns.length === 0) {
      misspellings.push(...misspellingsOnly);
      return;
    }

    // If we have ignorePatterns, test misspellings against the regexes until
    // we find one that passes. If we find a pass, exclude it from the final list
    const notIgnoredMisspellings = misspellingsOnly.filter(misspelled =>
      ignorePatterns.some(pattern => !pattern.test(misspelled))
    );

    misspellings.push(...notIgnoredMisspellings);
  });

  if (misspellings.length > 0) {
    throw new Error(
      `The following words are misspelled. Please correct them or add them to the dictionary:\n\n\t${misspellings.join(
        ', '
      )}`
    );
  }

  return markdownAST;
};
