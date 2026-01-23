/**
 * Country name to coordinates mapping
 * Coordinates are [longitude, latitude] format for d3-geo projections
 */
export const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  // North Africa
  "Algeria": [3.0, 28.0],
  "Egypt": [30.0, 27.0],
  "Libya": [17.0, 27.0],
  "Morocco": [-5.0, 32.0],
  "Sudan": [30.0, 15.0],
  "Tunisia": [9.0, 34.0],
  "Western Sahara": [-12.9, 24.2],
  
  // East Africa
  "British Indian Ocean Territory": [71.5, -6.0],
  "Burundi": [29.9, -3.4],
  "Comoros": [43.3, -11.6],
  "Djibouti": [42.6, 11.6],
  "Eritrea": [39.8, 15.2],
  "Ethiopia": [40.5, 9.0],
  "French Southern Territories": [69.2, -49.3],
  "Kenya": [38.0, 1.0],
  "Madagascar": [47.0, -20.0],
  "Malawi": [34.3, -13.3],
  "Mauritius": [57.6, -20.3],
  "Mayotte": [45.2, -12.8],
  "Mozambique": [35.0, -18.3],
  "Réunion": [55.5, -21.1],
  "Rwanda": [30.1, -2.0],
  "Seychelles": [55.5, -4.7],
  "Somalia": [46.2, 5.2],
  "South Sudan": [31.3, 6.9],
  "Uganda": [32.3, 1.4],
  "United Republic of Tanzania": [35.0, -6.0],
  "Tanzania": [35.0, -6.0],
  "Zambia": [28.0, -15.0],
  "Zimbabwe": [29.2, -19.0],
  
  // Central Africa
  "Angola": [17.9, -11.2],
  "Cameroon": [12.4, 7.4],
  "Central African Republic": [21.0, 6.6],
  "Chad": [19.0, 15.5],
  "Congo": [15.8, -0.2],
  "Democratic Republic of the Congo": [21.8, -4.0],
  "DRC": [21.8, -4.0],
  "Equatorial Guinea": [10.3, 1.7],
  "Gabon": [11.6, -0.8],
  "Sao Tome and Principe": [6.6, 0.2],
  
  // Southern Africa
  "Botswana": [24.7, -22.3],
  "Eswatini": [31.5, -26.5],
  "Lesotho": [28.2, -29.6],
  "Namibia": [18.5, -22.0],
  "South Africa": [24.0, -29.0],
  
  // West Africa
  "Benin": [2.3, 9.3],
  "Burkina Faso": [-1.6, 12.2],
  "Cabo Verde": [-24.0, 16.0],
  "Cape Verde": [-24.0, 16.0],
  "Côte d'Ivoire": [-5.5, 7.5],
  "Ivory Coast": [-5.5, 7.5],
  "Gambia": [-16.6, 13.4],
  "Ghana": [-1.0, 8.0],
  "Guinea": [-10.9, 9.9],
  "Guinea-Bissau": [-15.2, 12.0],
  "Liberia": [-9.4, 6.4],
  "Mali": [-4.0, 17.6],
  "Mauritania": [-10.5, 21.0],
  "Niger": [8.1, 17.6],
  "Nigeria": [8.7, 9.1],
  "Saint Helena": [-5.7, -15.9],
  "Senegal": [-14.5, 14.5],
  "Sierra Leone": [-11.8, 8.5],
  "Togo": [0.8, 8.6],
  "Sahel": [0.0, 15.0],
  
  // Caribbean
  "Anguilla": [-63.1, 18.2],
  "Antigua and Barbuda": [-61.8, 17.1],
  "Aruba": [-70.0, 12.5],
  "Bahamas": [-77.4, 25.0],
  "Barbados": [-59.5, 13.2],
  "Bonaire, Sint Eustatius and Saba": [-68.3, 12.2],
  "British Virgin Islands": [-64.6, 18.4],
  "Cayman Islands": [-80.6, 19.5],
  "Cuba": [-77.8, 21.5],
  "Curaçao": [-69.0, 12.2],
  "Dominica": [-61.4, 15.4],
  "Dominican Republic": [-70.2, 18.7],
  "Grenada": [-61.7, 12.1],
  "Guadeloupe": [-61.6, 16.3],
  "Haiti": [-72.3, 18.5],
  "Jamaica": [-77.3, 18.1],
  "Martinique": [-61.0, 14.6],
  "Montserrat": [-62.2, 16.7],
  "Puerto Rico": [-66.6, 18.2],
  "Saint Barthélemy": [-62.8, 17.9],
  "Saint Kitts and Nevis": [-62.8, 17.4],
  "Saint Lucia": [-61.0, 13.9],
  "Saint Martin (French Part)": [-63.1, 18.1],
  "Saint Vincent and the Grenadines": [-61.2, 13.3],
  "Sint Maarten (Dutch part)": [-63.0, 18.0],
  "Trinidad and Tobago": [-61.3, 10.5],
  "Turks and Caicos Islands": [-71.8, 21.7],
  "United States Virgin Islands": [-64.9, 18.3],
  
  // Central America
  "Belize": [-88.5, 17.2],
  "Costa Rica": [-84.0, 9.9],
  "El Salvador": [-88.9, 13.8],
  "Guatemala": [-90.2, 15.8],
  "Honduras": [-86.2, 15.2],
  "Mexico": [-102.6, 23.6],
  "Nicaragua": [-85.2, 13.0],
  "Panama": [-80.8, 8.4],
  
  // South America
  "Argentina": [-64.0, -34.0],
  "Bolivia (Plurinational State of)": [-63.6, -16.3],
  "Bolivia": [-63.6, -16.3],
  "Bouvet Island": [3.4, -54.4],
  "Brazil": [-51.9, -14.2],
  "Chile": [-71.5, -35.7],
  "Colombia": [-74.3, 4.6],
  "Ecuador": [-78.2, -1.8],
  "Falkland Islands (Malvinas)": [-59.5, -51.8],
  "Falkland Islands": [-59.5, -51.8],
  "French Guiana": [-53.1, 4.0],
  "Guyana": [-58.9, 5.0],
  "Paraguay": [-58.4, -23.4],
  "Peru": [-77.0, -10.0],
  "South Georgia and the South Sandwich Islands": [-36.5, -54.4],
  "Suriname": [-56.0, 4.0],
  "Uruguay": [-55.8, -32.5],
  "Venezuela (Bolivarian Republic of)": [-66.6, 6.4],
  "Venezuela": [-66.6, 6.4],
  
  // North America
  "Bermuda": [-64.8, 32.3],
  "Canada": [-106.3, 56.1],
  "Greenland": [-42.0, 72.0],
  "Saint Pierre and Miquelon": [-56.3, 46.9],
  "United States of America": [-95.7, 37.1],
  "United States": [-95.7, 37.1],
  "USA": [-95.7, 37.1],
  
  // Central Asia
  "Kazakhstan": [66.9, 48.0],
  "Kyrgyzstan": [74.8, 41.2],
  "Tajikistan": [71.3, 38.9],
  "Turkmenistan": [59.6, 38.7],
  "Uzbekistan": [64.6, 41.4],
  
  // East Asia
  "China": [104.2, 35.9],
  "China, Hong Kong Special Administrative Region": [114.2, 22.4],
  "Hong Kong": [114.2, 22.4],
  "China, Macao Special Administrative Region": [113.5, 22.2],
  "Macao": [113.5, 22.2],
  "Democratic People's Republic of Korea": [127.5, 40.3],
  "North Korea": [127.5, 40.3],
  "Japan": [138.3, 36.2],
  "Mongolia": [103.8, 46.9],
  "Republic of Korea": [127.8, 35.9],
  "South Korea": [127.8, 35.9],
  "Taiwan": [121.0, 23.7],
  
  // Southeast Asia
  "Brunei Darussalam": [114.7, 4.5],
  "Brunei": [114.7, 4.5],
  "Cambodia": [105.0, 12.6],
  "Indonesia": [113.9, -0.8],
  "Lao People's Democratic Republic": [102.5, 19.9],
  "Laos": [102.5, 19.9],
  "Malaysia": [101.7, 4.2],
  "Myanmar": [95.9, 21.9],
  "Burma": [95.9, 21.9],
  "Philippines": [121.8, 12.9],
  "Singapore": [103.8, 1.4],
  "Thailand": [100.5, 15.9],
  "Timor-Leste": [125.7, -8.9],
  "East Timor": [125.7, -8.9],
  "Viet Nam": [108.3, 14.1],
  "Vietnam": [108.3, 14.1],
  
  // South Asia
  "Afghanistan": [67.7, 33.9],
  "Bangladesh": [90.4, 23.7],
  "Bhutan": [90.4, 27.5],
  "India": [79.0, 21.0],
  "Iran (Islamic Republic of)": [53.7, 32.4],
  "Iran": [53.7, 32.4],
  "Maldives": [73.2, 3.2],
  "Nepal": [84.1, 28.4],
  "Pakistan": [69.3, 30.4],
  "Sri Lanka": [80.8, 7.9],
  
  // Middle East
  "Armenia": [45.0, 40.1],
  "Azerbaijan": [47.6, 40.1],
  "Bahrain": [50.6, 26.0],
  "Cyprus": [33.4, 35.1],
  "Georgia": [43.4, 42.3],
  "Iraq": [43.7, 33.2],
  "Israel": [34.9, 31.0],
  "Jordan": [36.2, 30.6],
  "Kuwait": [47.5, 29.3],
  "Lebanon": [35.9, 33.9],
  "Oman": [55.9, 21.5],
  "Qatar": [51.2, 25.4],
  "Saudi Arabia": [45.1, 23.9],
  "State of Palestine": [35.2, 31.9],
  "Palestine": [35.2, 31.9],
  "Gaza": [34.5, 31.5],
  "West Bank": [35.2, 31.9],
  "Syrian Arab Republic": [38.9, 34.8],
  "Syria": [38.9, 34.8],
  "Türkiye": [35.2, 39.0],
  "Turkey": [35.2, 39.0],
  "United Arab Emirates": [53.8, 23.4],
  "UAE": [53.8, 23.4],
  "Yemen": [48.5, 15.6],
  
  // Eastern Europe
  "Belarus": [27.9, 53.7],
  "Bulgaria": [25.5, 42.7],
  "Czechia": [15.5, 49.8],
  "Czech Republic": [15.5, 49.8],
  "Hungary": [19.5, 47.2],
  "Poland": [19.1, 51.9],
  "Republic of Moldova": [28.4, 47.4],
  "Moldova": [28.4, 47.4],
  "Romania": [25.0, 46.0],
  "Russian Federation": [105.3, 61.5],
  "Russia": [105.3, 61.5],
  "Slovakia": [19.7, 48.7],
  "Ukraine": [31.2, 48.4],
  
  // Northern Europe
  "Åland Islands": [20.0, 60.2],
  "Denmark": [9.5, 56.3],
  "Estonia": [25.0, 58.6],
  "Faroe Islands": [-6.9, 62.0],
  "Finland": [25.7, 61.9],
  "Guernsey": [-2.6, 49.5],
  "Iceland": [-19.0, 65.0],
  "Ireland": [-8.2, 53.1],
  "Isle of Man": [-4.5, 54.2],
  "Jersey": [-2.1, 49.2],
  "Latvia": [24.6, 56.9],
  "Lithuania": [23.9, 55.2],
  "Norway": [8.5, 60.5],
  "Svalbard and Jan Mayen Islands": [23.7, 77.9],
  "Sweden": [18.6, 60.1],
  "United Kingdom of Great Britain and Northern Ireland": [-3.4, 55.4],
  "United Kingdom": [-3.4, 55.4],
  "UK": [-3.4, 55.4],
  
  // Southern Europe
  "Albania": [20.2, 41.2],
  "Andorra": [1.6, 42.5],
  "Bosnia and Herzegovina": [17.7, 43.9],
  "Croatia": [15.2, 45.1],
  "Gibraltar": [-5.4, 36.1],
  "Greece": [21.8, 39.1],
  "Holy See": [12.5, 41.9],
  "Vatican": [12.5, 41.9],
  "Italy": [12.6, 42.5],
  "Malta": [14.4, 35.9],
  "Montenegro": [19.4, 42.7],
  "North Macedonia": [21.7, 41.5],
  "Macedonia": [21.7, 41.5],
  "Portugal": [-8.2, 39.4],
  "San Marino": [12.5, 43.9],
  "Serbia": [21.0, 44.0],
  "Slovenia": [15.0, 46.2],
  "Spain": [-3.7, 40.5],
  "Kosovo": [21.0, 42.7],
  
  // Western Europe
  "Austria": [14.6, 47.5],
  "Belgium": [4.5, 50.5],
  "France": [2.2, 46.2],
  "Germany": [10.5, 51.2],
  "Liechtenstein": [9.6, 47.2],
  "Luxembourg": [6.1, 49.8],
  "Monaco": [7.4, 43.7],
  "Netherlands (Kingdom of the)": [5.3, 52.1],
  "Netherlands": [5.3, 52.1],
  "Switzerland": [8.2, 46.8],
  
  // Australia & New Zealand
  "Australia": [133.8, -25.3],
  "Christmas Island": [105.7, -10.5],
  "Cocos (Keeling) Islands": [96.9, -12.2],
  "Heard Island and McDonald Islands": [73.5, -53.1],
  "New Zealand": [174.9, -40.9],
  "Norfolk Island": [168.0, -29.0],
  
  // Melanesia
  "Fiji": [179.4, -16.6],
  "New Caledonia": [165.6, -20.9],
  "Papua New Guinea": [143.9, -6.3],
  "Solomon Islands": [160.2, -9.6],
  "Vanuatu": [166.9, -15.4],
  
  // Micronesia
  "Guam": [144.8, 13.4],
  "Kiribati": [-157.4, 1.9],
  "Marshall Islands": [171.2, 7.1],
  "Micronesia (Federated States of)": [150.6, 7.4],
  "Nauru": [166.9, -0.5],
  "Northern Mariana Islands": [145.8, 15.1],
  "Palau": [134.6, 7.5],
  "United States Minor Outlying Islands": [-176.6, 28.2],
  
  // Polynesia
  "American Samoa": [-170.1, -14.3],
  "Cook Islands": [-159.8, -21.2],
  "French Polynesia": [-149.4, -17.7],
  "Niue": [-169.9, -19.1],
  "Pitcairn": [-130.1, -24.4],
  "Samoa": [-172.1, -13.8],
  "Tokelau": [-171.9, -9.2],
  "Tonga": [-175.2, -21.2],
  "Tuvalu": [177.6, -7.1],
  "Wallis and Futuna Islands": [-176.2, -13.3],
  
  // Other
  "Antarctica": [0.0, -75.0],
};

/**
 * Get coordinates for a country name
 * Handles various name formats and aliases
 */
export function getCountryCoordinates(countryName: string): [number, number] | null {
  // Direct lookup first
  if (COUNTRY_COORDINATES[countryName]) {
    return COUNTRY_COORDINATES[countryName];
  }
  
  // Try normalized lookup (lowercase, trimmed)
  const normalized = countryName.trim();
  for (const [key, coords] of Object.entries(COUNTRY_COORDINATES)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return coords;
    }
  }
  
  // Partial match for common variations
  const partialMatches: Record<string, string> = {
    "democratic republic of congo": "Democratic Republic of the Congo",
    "dr congo": "Democratic Republic of the Congo",
    "republic of congo": "Congo",
    "ivory coast": "Côte d'Ivoire",
    "north korea": "Democratic People's Republic of Korea",
    "south korea": "Republic of Korea",
    "korea": "Republic of Korea",
    "vietnam": "Viet Nam",
    "laos": "Lao People's Democratic Republic",
    "burma": "Myanmar",
    "iran": "Iran (Islamic Republic of)",
    "syria": "Syrian Arab Republic",
    "turkey": "Türkiye",
    "russia": "Russian Federation",
    "czech republic": "Czechia",
    "uk": "United Kingdom of Great Britain and Northern Ireland",
    "britain": "United Kingdom of Great Britain and Northern Ireland",
    "england": "United Kingdom of Great Britain and Northern Ireland",
    "usa": "United States of America",
    "america": "United States of America",
    "uae": "United Arab Emirates",
    "palestine": "State of Palestine",
    "vatican city": "Holy See",
    "vatican": "Holy See",
    "cape verde": "Cabo Verde",
    "swaziland": "Eswatini",
    "tanzania": "United Republic of Tanzania",
    "bolivia": "Bolivia (Plurinational State of)",
    "venezuela": "Venezuela (Bolivarian Republic of)",
    "falklands": "Falkland Islands (Malvinas)",
    "hong kong": "China, Hong Kong Special Administrative Region",
    "macau": "China, Macao Special Administrative Region",
    "macao": "China, Macao Special Administrative Region",
    "east timor": "Timor-Leste",
    "brunei": "Brunei Darussalam",
    "micronesia": "Micronesia (Federated States of)",
    "netherlands": "Netherlands (Kingdom of the)",
    "moldova": "Republic of Moldova",
    "macedonia": "North Macedonia",
  };
  
  const lowerName = normalized.toLowerCase();
  if (partialMatches[lowerName]) {
    return COUNTRY_COORDINATES[partialMatches[lowerName]] || null;
  }
  
  return null;
}

/**
 * Convert country entry data to heatmap points
 */
export function countriesToHeatmapData(
  countries: { country_name: string; count: string | number }[]
): { coordinates: [number, number]; intensity: number; name: string }[] {
  const result: { coordinates: [number, number]; intensity: number; name: string }[] = [];
  
  let maxCount = 0;
  for (const country of countries) {
    const count = typeof country.count === 'string' ? parseInt(country.count) : country.count;
    if (count > maxCount) maxCount = count;
  }
  
  for (const country of countries) {
    const coords = getCountryCoordinates(country.country_name);
    if (coords) {
      const count = typeof country.count === 'string' ? parseInt(country.count) : country.count;
      result.push({
        coordinates: coords,
        intensity: maxCount > 0 ? count / maxCount : 0,
        name: country.country_name,
      });
    }
  }
  
  return result;
}
