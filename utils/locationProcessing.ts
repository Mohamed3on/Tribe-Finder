import { emojiCountryCode } from 'country-code-emoji';

// Whole words where a real place starts or contains the term (Homestead, Joinville, Freetown, Los Rios, Webster)
export const irrelevantRegex = new RegExp(
  '\\bhome\\b|subscribe|\\.com|\\.net|\\.org|\\.eth|solana|sphere|zoom|\\bjoin\\b|sign up|ethereum|👉|newsletter|\\bfree\\b|\\.ai|everywhere|online|⬇️|127\\.0\\.0\\.1|http|earth|worldwide|global|🟩|internet|\\bios\\b|🌴|🍁|\\bhere\\b|\\d+°|cloud|future|\\bmoon\\b|\\bweb\\b|interweb|network|remote|milky way|international|youtube|metaverse|monday|crypto|space|anywhere|beyond|\\butc\\b|simulation\\b',
  'i'
);
// Stripped rather than rejected: they sit next to real places ("Berlin 🇪🇺", "San Francisco, she/her")
export const removeRegex = new RegExp(
  'europe|(?:the\\s+)?world|🌎|🌍|🌏|🌐|☁️|🇪🇺|!|they\\/them|he\\/him|she\\/her',
  'g'
);

// No `g` flag: these are used with .test(), which would carry lastIndex between calls
export const uniqueLocationRegex = new RegExp(
  '\\b(alexandria|cambridge|victoria|san jose|venice|bend)\\b',
  'i'
);
export const coordsRegex = /-?\d+\.\d+,-?\d+\.\d+/;
const dcRegex = /\bwashington,?\s*(?:d\.?\s?c\b\.?|district of columbia)/;

export const processLocation = (location) => {
  const lowerCaseLocation = location.toLowerCase();

  // Early return for irrelevant locations
  if (irrelevantRegex.test(lowerCaseLocation) || coordsRegex.test(lowerCaseLocation)) {
    return null;
  }

  // Remove specific terms; collapse "Washington, D.C." so the comma split keeps it whole
  let processedLocation = lowerCaseLocation
    .replace(removeRegex, '')
    .replace(dcRegex, 'washington dc');

  if (uniqueLocationRegex.test(processedLocation)) {
    return getLocationParts(processedLocation, false);
  }

  // Further process the location string
  return getLocationParts(processedLocation, true);
}; // Precompile Regular Expressions outside of the function

export function titleCaseWithAcronyms(str) {
  // If the location is an acronym, Uppercase it (SF, USA, UK, etc.)
  if (str.length <= 3) {
    return str.toUpperCase();
  }
  const newStr = str
    .split(' ')
    .map((word) => {
      // Otherwise, title case the location
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return newStr;
}
const duplicate_mapping = {
  California: 'CA',
  'Southern California': 'CA',
  Lombardia: 'Italy',
  Italia: 'Italy',
  Schweiz: 'Switzerland',
  NY: 'New York',
  NYC: 'New York',
  TX: 'Texas',
  WA: 'Washington',
  UK: 'United Kingdom',
  MA: 'Massachusetts',
  FL: 'Florida',
  DC: 'Washington D.C.',
  'D.c.': 'Washington D.C.',
  USA: 'United States',
  SF: 'San Francisco',
  PA: 'Pennsylvania',
  CO: 'Colorado',
  VA: 'Virginia',
  IL: 'Illinois',
  TN: 'Tennessee',
  LA: 'Los Angeles',
  Arizona: 'AZ',
  NC: 'North Carolina',
  Oregon: 'OR',
  MD: 'Maryland',
  GA: 'Georgia',
  CT: 'Connecticut',
  MO: 'Missouri',
  'New York City': 'New York',
  AMS: 'Amsterdam',
  BCN: 'Barcelona',
  BER: 'Berlin',
  MI: 'Michigan',
  NJ: 'New Jersey',
  UT: 'Utah',
  US: 'United States',
  OH: 'Ohio',
  'Washington Dc': 'Washington D.C.',
  MN: 'Minnesota',
  Montréal: 'Montreal',
  BC: 'British Columbia',
  NV: 'Nevada',
  Deutschland: 'Germany',
  RI: 'Rhode Island',
  ATL: 'Atlanta',
  WI: 'Wisconsin',
  VT: 'Vermont',
  KSA: 'Saudi Arabia',
  AR: 'Arkansas',
  PNW: 'Pacific Northwest',
  KY: 'Kentucky',
  NZ: 'New Zealand',
  AU: 'Australia',
  Nebraska: 'NE',
  BLR: 'Bangalore',
  ON: 'Ontario',

  Polska: 'Poland',
  'New York Ny': 'New York',
  'Ma Usa': 'Massachusetts',
  UAE: 'United Arab Emirates',
  Wien: 'Vienna',
  Roma: 'Rome',
  Köln: 'Cologne',
  Milano: 'Milan',
  España: 'Spain',
  München: 'Munich',
  'Comunidad De Madrid': 'Madrid',
  Bengaluru: 'Bangalore',
  Nederland: 'Netherlands',
  NL: 'Netherlands',
  'The Netherlands': 'Netherlands',
  Québec: 'Quebec',
  MT: 'Montana',
  DET: 'Detroit',
  IN: 'Indiana',
  ATX: 'Austin',
  SD: 'San Diego',
  BK: 'Brooklyn',
  Cdmx: 'Mexico City',
  America: 'United States',
  NH: 'New Hampshire',
  Lisboa: 'Lisbon',
  'Ciudad De México': 'Mexico City',
  Oklahoma: 'OK',
  Warszawa: 'Warsaw',
  Iowa: 'IA',
  'Hudson Valley': 'NY',
};

export function consolidateDuplicates(data) {
  const consolidatedData = {};

  for (const [key, valueObj] of Object.entries(data)) {
    const mappedKey = duplicate_mapping[key] || key;

    if (!consolidatedData[mappedKey]) {
      consolidatedData[mappedKey] = {};
    }

    Object.assign(consolidatedData[mappedKey], valueObj);
  }

  return consolidatedData;
}

export const getLocationParts = (location, alsoSplitComma = true) => {
  const splitRegex = alsoSplitComma
    ? /\s*(?:via|,|\/|\\|&|\+|\||·|\/\/|\|\||→|•|✈️|➡️)\s*|\s+and\s+/
    : /\s*(?:via|\/|\\|&|\+|\||·|\/\/|\|\||→|•|✈️|➡️)\s*|\s+and\s+/;

  const flagEmojiRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF]){2}/g;

  const replacedLocation = location.replace(flagEmojiRegex, (match) => {
    try {
      const code = emojiCountryCode(match);
      return code;
    } catch (e) {
      return '';
    }
  });
  return replacedLocation
    .replace(/\s*\([^)]*\)/g, '') // Remove content within parentheses
    .replace(/\b\d+k?\b|\b\d+m?\b/gi, '') // Remove numbers and numbers followed by 'k', 'K', 'M', or 'm'
    .split(splitRegex) // Split by delimiters
    .map((l) => {
      if (l.includes('bay area') || l.includes('silicon valley')) {
        return 'san francisco';
      }
      return l.trim();
    })
    .filter((l) => l !== '');
};

export const processLocations = (users) => {
  const locations = addLocations(users);

  const titledLocations = {};

  for (let location in locations) {
    titledLocations[titleCaseWithAcronyms(location)] = locations[location];
  }

  const consolidated = consolidateDuplicates(titledLocations);

  return consolidated;
};

export const addLocations = (theList) => {
  const locations = {};

  theList.forEach((member) => {
    if (member.location && member.location !== '') {
      const processedLocations = processLocation(member.location);

      processedLocations?.forEach((location) => {
        if (!locations[location]) {
          locations[location] = {};
        }
        locations[location][member.screen_name] = member;
      });
    }
  });

  return locations;
};

export const addAddressParts = (
  originalValue,
  placeNameParts,
  mappedLocations,
  locationToTypeMapping,
  cityToCountryMapping
) => {
  for (const placeNamePart of placeNameParts) {
    let placeNameText = placeNamePart.text || placeNamePart;

    if (placeNamePart.text) {
      if (uniqueLocationRegex.test(placeNameText)) {
        placeNameText = `${placeNameText}, ${placeNameParts[placeNameParts.length - 1].text}`;
      }

      const placeType = placeNamePart.placeType === 'place' ? 'city' : placeNamePart.placeType;

      if (!locationToTypeMapping[placeNameText] || placeType === 'city') {
        locationToTypeMapping[placeNameText] = placeType;
      }

      if (placeType === 'city') {
        cityToCountryMapping[placeNameText] = placeNameParts[placeNameParts.length - 1].text;
      }
    }

    if (!mappedLocations[placeNameText]) {
      mappedLocations[placeNameText] = originalValue;
    } else {
      mappedLocations[placeNameText] = {
        ...mappedLocations[placeNameText],
        ...originalValue,
      };
    }
  }

  return mappedLocations;
};
