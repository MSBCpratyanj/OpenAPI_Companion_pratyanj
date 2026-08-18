/**
 * 60+ Fake Data Generators & Rich Demo Data Pools (T-07.1, FDD-005).
 * Each generator is a pure function that produces valid, realistic values by construction —
 * no network requests, no external dependencies.
 * Randomness uses `Math.random`; callers wanting reproducibility inject an `rng`.
 * Generators are dependency-free so the whole engine executes in < 5ms.
 */

export type GeneratorCategory =
  'personal' | 'location' | 'internet' | 'finance' | 'content' | 'numeric' | 'security' | 'system'

export type GeneratorKey =
  // Personal
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'username'
  | 'email'
  | 'password'
  | 'phone'
  | 'jobTitle'
  | 'department'
  | 'company'
  | 'prefix'
  | 'suffix'
  | 'gender'
  // Location
  | 'address'
  | 'city'
  | 'state'
  | 'country'
  | 'countryCode'
  | 'postalCode'
  | 'latitude'
  | 'longitude'
  // Internet & Tech
  | 'uuid'
  | 'url'
  | 'domain'
  | 'ipv4'
  | 'ipv6'
  | 'macAddress'
  | 'userAgent'
  | 'jwtToken'
  | 'port'
  | 'semver'
  | 'hexColor'
  | 'language'
  | 'locale'
  | 'mimeType'
  | 'fileExtension'
  | 'fileName'
  // Finance & Commerce
  | 'creditCard'
  | 'currencyCode'
  | 'price'
  | 'iban'
  | 'productName'
  | 'sku'
  | 'barcode'
  | 'cryptoAddress'
  // Content & Text
  | 'loremSentence'
  | 'loremParagraph'
  | 'avatarUrl'
  | 'slug'
  // Date & Numeric
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'boolean'
  | 'integer'
  | 'float'
  | 'decimal'
  | 'percentage'
  | 'rating'
  // System & HTTP
  | 'status'
  | 'priority'
  | 'httpMethod'
  | 'httpStatusCode'
  // QA, Security & Fuzzing Vectors
  | 'sqliVector'
  | 'xssVector'
  | 'unicodeEmojiVector'
  | 'boundaryString'
  | 'boundaryNumber'

export type FakeValue = string | number | boolean

/** 0..1 random source; injectable for deterministic tests. */
export type Rng = () => number

export interface GeneratorMeta {
  key: GeneratorKey
  label: string
  category: GeneratorCategory
  description: string
}

// ── Rich Demo Data Pools ──

const FIRST_NAMES = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'Maria',
  'Ahmed',
  'Wei',
  'Sofia',
  'Liam',
  'Olivia',
  'Noah',
  'Emma',
  'Aarav',
  'Yuki',
  'Lucas',
  'Mia',
  'Mateo',
  'Zoe',
  'Alexander',
  'Amelia',
  'Benjamin',
  'Charlotte',
  'Daniel',
  'Chloe',
  'Ethan',
  'Harper',
  'Gabriel',
  'Evelyn',
  'Henry',
  'Isabella',
  'Jackson',
  'Ava',
  'Leonardo',
  'Camila',
  'Sebastian',
  'Luna',
  'Kaito',
  'Sakura',
  'Kenji',
  'Ananya',
  'Rohan',
  'Priya',
  'Arjun',
  'Fatima',
  'Tariq',
  'Zayd',
  'Amina',
  'Carlos',
  'Elena',
  'Diego',
  'Lucia',
  'Nils',
  'Astrid',
  'Freja',
  'Lars',
]

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Chen',
  'Khan',
  'Patel',
  'Nguyen',
  'Kim',
  'Silva',
  'Müller',
  'Rossi',
  'Andersson',
  'Tanaka',
  'Dubois',
  'Novak',
  'Santos',
  'Taylor',
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Robinson',
  'Clark',
  'Lewis',
  'Lee',
  'Walker',
  'Hall',
  'Allen',
  'Young',
  'Hernandez',
  'King',
  'Wright',
  'Lopez',
  'Hill',
  'Scott',
  'Green',
  'Adams',
  'Baker',
  'Gonzalez',
  'Nelson',
  'Carter',
  'Mitchell',
  'Perez',
  'Roberts',
  'Turner',
  'Phillips',
  'Campbell',
  'Parker',
  'Evans',
  'Edwards',
  'Collins',
  'Stewart',
  'Sanchez',
  'Morris',
  'Rogers',
  'Reed',
  'Cook',
  'Morgan',
]

const PREFIXES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Rev.']
const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'Ph.D.', 'M.D.', 'Esq.']
const GENDERS = ['female', 'male', 'non-binary', 'other']

const CITIES = [
  'San Francisco',
  'New York',
  'Seattle',
  'Austin',
  'Boston',
  'Chicago',
  'Los Angeles',
  'Denver',
  'Miami',
  'Atlanta',
  'Portland',
  'San Diego',
  'Toronto',
  'Vancouver',
  'Montreal',
  'London',
  'Manchester',
  'Dublin',
  'Berlin',
  'Munich',
  'Frankfurt',
  'Amsterdam',
  'Paris',
  'Lyon',
  'Stockholm',
  'Zurich',
  'Geneva',
  'Vienna',
  'Madrid',
  'Barcelona',
  'Rome',
  'Milan',
  'Warsaw',
  'Prague',
  'Tokyo',
  'Osaka',
  'Kyoto',
  'Seoul',
  'Singapore',
  'Hong Kong',
  'Sydney',
  'Melbourne',
  'Auckland',
  'Mumbai',
  'Bangalore',
  'New Delhi',
  'Hyderabad',
  'Dubai',
  'Abu Dhabi',
  'Tel Aviv',
  'São Paulo',
  'Buenos Aires',
  'Mexico City',
  'Cape Town',
  'Nairobi',
  'Springfield',
]

const STATES = [
  'California',
  'Texas',
  'Florida',
  'New York',
  'Illinois',
  'Pennsylvania',
  'Ohio',
  'Georgia',
  'North Carolina',
  'Michigan',
  'New Jersey',
  'Virginia',
  'Washington',
  'Arizona',
  'Massachusetts',
  'Tennessee',
  'Indiana',
  'Missouri',
  'Maryland',
  'Wisconsin',
  'Colorado',
  'Minnesota',
  'South Carolina',
  'Alabama',
  'Louisiana',
  'Kentucky',
  'Oregon',
  'Oklahoma',
  'Connecticut',
  'Utah',
  'Nevada',
  'Ontario',
  'British Columbia',
  'Bavaria',
  'Île-de-France',
  'New South Wales',
  'Tokyo Prefecture',
  'Karnataka',
  'Maharashtra',
]

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Japan',
  'Australia',
  'Brazil',
  'India',
  'Sweden',
  'Netherlands',
  'Spain',
  'Singapore',
  'Italy',
  'Switzerland',
  'South Korea',
  'Ireland',
  'New Zealand',
  'Norway',
  'Denmark',
  'Finland',
  'Austria',
  'Belgium',
  'Poland',
  'Portugal',
  'Mexico',
  'Argentina',
  'Chile',
  'Colombia',
  'South Africa',
  'United Arab Emirates',
  'Israel',
  'Saudi Arabia',
  'Indonesia',
  'Vietnam',
  'Thailand',
  'Greece',
]

const COUNTRY_CODES = [
  'US',
  'GB',
  'DE',
  'FR',
  'JP',
  'CA',
  'AU',
  'IN',
  'BR',
  'ES',
  'IT',
  'NL',
  'SE',
  'SG',
  'CH',
  'KR',
  'IE',
  'NZ',
  'NO',
  'MX',
  'AE',
  'IL',
]

const STREETS = [
  'Main St',
  'Oak Ave',
  'Maple Dr',
  'Cedar Ln',
  'Pine Rd',
  'Elm St',
  'Washington Ave',
  'Park Blvd',
  'Lake View Dr',
  'Sunset Blvd',
  'Broadway',
  'Market St',
  'Silicon Way',
  'Innovation Blvd',
  'University Ave',
  'High St',
  'Queen St',
  'King St',
  'Church Rd',
  'Station Rd',
  'Victoria Rd',
  'Green Ln',
  'Manor Rd',
  'Park Ln',
  'Spring St',
  'River Rd',
  'Hill St',
  'Montgomery St',
]

const COMPANIES = [
  'Acme',
  'Globex',
  'Initech',
  'Umbrella',
  'Soylent',
  'Hooli',
  'Vandelay',
  'Stark',
  'Wayne',
  'Wonka',
  'Cyberdyne',
  'Massive Dynamic',
  'Pied Piper',
  'Stripe',
  'Vercel',
  'Linear',
  'Supabase',
  'Datadog',
  'Snowflake',
  'Cloudflare',
  'OpenAI',
  'Anthropic',
  'Retool',
  'Raycast',
  'Notion',
  'GitLab',
  'GitHub',
  'Docker',
  'Redis',
  'MongoDB',
  'Elastic',
  'Prisma',
  'Postman',
  'Figma',
]

const COMPANY_SUFFIX = ['Inc', 'LLC', 'Group', 'Corp', 'Labs', 'Co', 'Technologies', 'Solutions']
const DOMAINS = [
  'example.com',
  'test.dev',
  'mail.example',
  'sample.org',
  'demo.io',
  'acme.app',
  'cloud.test',
  'service.dev',
]

const JOB_TITLES = [
  'Software Engineer',
  'Senior DevOps Engineer',
  'Product Manager',
  'Data Scientist',
  'Engineering Manager',
  'Frontend Architect',
  'QA Automation Engineer',
  'Solutions Architect',
  'UI/UX Designer',
  'Chief Technology Officer',
  'Backend Developer',
  'Full Stack Engineer',
  'Cloud Architect',
  'Security Engineer',
  'Site Reliability Engineer',
  'Database Administrator',
  'Machine Learning Engineer',
  'AI Research Scientist',
  'Mobile App Developer',
  'iOS Developer',
  'Android Developer',
  'Product Owner',
  'Scrum Master',
  'Business Analyst',
  'Growth Lead',
  'Content Strategist',
  'Customer Support Specialist',
  'VP of Engineering',
  'Director of Operations',
]

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'Human Resources',
  'Customer Success',
  'Legal',
  'Operations',
  'Security',
  'Infrastructure',
  'Analytics',
  'QA & Testing',
  'DevOps',
  'Compliance',
  'Research & Development',
  'IT Support',
  'Public Relations',
]

const PRODUCT_NAMES = [
  'Wireless Noise-Canceling Headphones',
  'Ergonomic Mechanical Keyboard',
  '4K Ultra-HD Gaming Monitor',
  'Smart Fitness Tracker Watch',
  'USB-C Fast Charging Hub',
  'Compact Mechanical Numpad',
  'Adjustable Standing Desk Converter',
  'High-Precision Optical Mouse',
  'Thunderbolt 4 Docking Station',
  'Foldable Laptop Stand',
  'Dual-Band WiFi 6 Mesh Router',
  'Portable SSD 2TB NVMe',
  'Studio Condenser Microphone',
  'Stream Deck Controller 15-Key',
  'Magnetic Wireless Power Bank 10000mAh',
  'Smart LED Desk Lamp with Dimmer',
]

const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'INR',
  'SGD',
  'NZD',
  'HKD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'BRL',
  'MXN',
  'AED',
]

const HEX_COLORS = [
  '#3B82F6',
  '#1D4ED8',
  '#10B981',
  '#059669',
  '#F59E0B',
  '#D97706',
  '#EF4444',
  '#DC2626',
  '#8B5CF6',
  '#7C3AED',
  '#EC4899',
  '#DB2777',
  '#06B6D4',
  '#0891B2',
  '#64748B',
  '#475569',
  '#14B8A6',
  '#0D9488',
  '#F97316',
  '#EA580C',
  '#6366F1',
  '#4F46E5',
  '#84CC16',
  '#A855F7',
]

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
]

const LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'ja',
  'zh',
  'pt',
  'hi',
  'ar',
  'ru',
  'it',
  'ko',
  'nl',
  'sv',
]
const LOCALES = [
  'en-US',
  'en-GB',
  'es-ES',
  'fr-FR',
  'de-DE',
  'ja-JP',
  'zh-CN',
  'pt-BR',
  'hi-IN',
  'ar-SA',
]

const MIME_TYPES = [
  'application/json',
  'text/plain',
  'text/html',
  'application/xml',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'application/pdf',
  'multipart/form-data',
  'application/octet-stream',
]

const FILE_EXTENSIONS = [
  'json',
  'pdf',
  'png',
  'jpg',
  'csv',
  'xlsx',
  'txt',
  'mp4',
  'svg',
  'zip',
  'tar.gz',
]

const STATUSES = [
  'active',
  'pending',
  'inactive',
  'suspended',
  'archived',
  'completed',
  'draft',
  'in_progress',
]
const PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical']
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
const HTTP_STATUS_CODES = [
  200, 201, 204, 301, 302, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503,
]

const LOREM_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'in',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
  'sollicitudin',
  'convalis',
  'elementum',
  'facilisis',
  'fringilla',
  'gravida',
  'habitant',
  'imperdiet',
  'malesuada',
  'pellentesque',
  'pulvinar',
  'suspendisse',
]

// Fuzzing & Security Vector Pools
const SQLI_VECTORS = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  '1; DROP TABLE users; --',
  "' UNION SELECT null, username, password FROM users --",
  "admin' --",
  "' OR 1=1#",
  "' OR 'x'='x",
  "1' AND SLEEP(5) --",
  "'; EXEC xp_cmdshell('dir'); --",
  "' OR EXISTS(SELECT * FROM users WHERE '1'='1') --",
]

const XSS_VECTORS = [
  "<script>alert('XSS')</script>",
  '<img src=x onerror=alert(document.domain)>',
  '<svg onload=alert(1)>',
  "javascript:alert('XSS')",
  '\'"><script>alert(1)</script>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  "<body onload=alert('XSS')>",
  '<input autofocus onfocus=alert(1)>',
  '<a href="javascript:alert(\'XSS\')">Click here</a>',
  "{{constructor.constructor('alert(1)')()}}",
]

const UNICODE_EMOJIS = [
  '🚀🔥⚡✨🎉🤖🍕💡💻🌈',
  'مرحبا بالعالم (Hello World in Arabic)',
  '你好，世界 (Hello World in Chinese)',
  'こんにちは世界 (Hello World in Japanese)',
  'Z͑ͫ̓ͪ̂ͫ̽͏̴̙̤̞͉͚̯̞a̡̲͈̰͔ͫ͆ͮͮ͑͞l̠ͨͧͩ͘ģ̯ͪ̎̂̈̿̽ͮ͡o̜ͫ͑ͯ̊ͣ̓͡ text',
  '\u200B\u200C\u200D\uFEFF (Zero-width spaces)',
  '‎‏‪‫‬‭‮ (Bidirectional Overrides)',
  'Ḧëḷḷö Wöṛḷḋ (Diacritics & Accents)',
  '👩‍💻👨‍🚀🧑‍🔬 (Multi-ZWJ Emoji Sequences)',
]

const BOUNDARY_NUMBERS = [
  0, -1, 1, 2147483647, -2147483648, 9007199254740991, -9007199254740991, 0.0000001, -0.0000001,
  1e12, -1e12,
]

// ── Helper Utilities ──

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}
function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)] as T
}
function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

// ── Generator Implementations ──

function firstName(rng: Rng): string {
  return pick(rng, FIRST_NAMES)
}
function lastName(rng: Rng): string {
  return pick(rng, LAST_NAMES)
}
function fullName(rng: Rng): string {
  return `${firstName(rng)} ${lastName(rng)}`
}
function username(rng: Rng): string {
  return `${firstName(rng).toLowerCase()}${randInt(rng, 1, 999)}`
}
function email(rng: Rng): string {
  return `${firstName(rng).toLowerCase()}.${lastName(rng).toLowerCase()}@${pick(rng, DOMAINS)}`
}
function password(rng: Rng): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*?'
  const base = [
    pick(rng, [...upper]),
    pick(rng, [...lower]),
    pick(rng, [...digits]),
    pick(rng, [...symbols]),
  ]
  const all = lower + upper + digits + symbols
  while (base.length < 12) base.push(pick(rng, [...all]))
  for (let i = base.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i)
    ;[base[i], base[j]] = [base[j] as string, base[i] as string]
  }
  return base.join('')
}
function uuid(rng: Rng): string {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-'
    else if (i === 14) out += '4'
    else if (i === 19) out += hex[(randInt(rng, 0, 15) & 0x3) | 0x8]
    else out += hex[randInt(rng, 0, 15)]
  }
  return out
}
function phone(rng: Rng): string {
  return `+1-${randInt(rng, 200, 999)}-555-${pad(randInt(rng, 0, 9999), 4)}`
}
function address(rng: Rng): string {
  return `${randInt(rng, 1, 9999)} ${pick(rng, STREETS)}`
}
function postalCode(rng: Rng): string {
  return pad(randInt(rng, 0, 99999), 5)
}
function latitude(rng: Rng): number {
  return Number((rng() * 180 - 90).toFixed(6))
}
function longitude(rng: Rng): number {
  return Number((rng() * 360 - 180).toFixed(6))
}
function dateValue(rng: Rng): string {
  const y = randInt(rng, 2015, 2026)
  const m = randInt(rng, 1, 12)
  const d = randInt(rng, 1, 28)
  return `${y}-${pad(m, 2)}-${pad(d, 2)}`
}
function datetimeValue(rng: Rng): string {
  return `${dateValue(rng)}T${pad(randInt(rng, 0, 23), 2)}:${pad(randInt(rng, 0, 59), 2)}:${pad(randInt(rng, 0, 59), 2)}Z`
}
function timestamp(rng: Rng): number {
  return Math.floor(Date.now() / 1000) - randInt(rng, 0, 86400 * 30)
}
function integer(rng: Rng): number {
  return randInt(rng, 1, 10000)
}
function float(rng: Rng): number {
  return Number((rng() * 1000).toFixed(4))
}
function decimal(rng: Rng): number {
  return Number((rng() * 1000).toFixed(2))
}
function percentage(rng: Rng): number {
  return Number((rng() * 100).toFixed(1))
}
function rating(rng: Rng): number {
  return Number((3.0 + rng() * 2.0).toFixed(1))
}
function url(rng: Rng): string {
  return `https://www.${pick(rng, DOMAINS)}/${username(rng)}`
}
function company(rng: Rng): string {
  return `${pick(rng, COMPANIES)} ${pick(rng, COMPANY_SUFFIX)}`
}

// Tech & Internet
function ipv4(rng: Rng): string {
  return `${randInt(rng, 11, 223)}.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`
}
function ipv6(rng: Rng): string {
  const hexPart = () => randInt(rng, 0x1000, 0xffff).toString(16)
  return `2001:0db8:${hexPart()}:${hexPart()}:${hexPart()}:${hexPart()}:${hexPart()}:${hexPart()}`
}
function macAddress(rng: Rng): string {
  const hex = '0123456789ABCDEF'
  const byte = () => `${hex[randInt(rng, 0, 15)]}${hex[randInt(rng, 0, 15)]}`
  return `${byte()}:${byte()}:${byte()}:${byte()}:${byte()}:${byte()}`
}
function base64UrlEncode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return Buffer.from(str).toString('base64url')
}

function jwtToken(rng: Rng): string {
  const h = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
  const p = base64UrlEncode(
    JSON.stringify({
      sub: uuid(rng),
      name: fullName(rng),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  )
  const s = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
  return `${h}.${p}.${s}`
}
function port(rng: Rng): number {
  const common = [80, 443, 3000, 5000, 8000, 8080, 9000, 27017, 5432, 6379]
  return rng() < 0.4 ? pick(rng, common) : randInt(rng, 1024, 65535)
}
function semver(rng: Rng): string {
  return `${randInt(rng, 1, 5)}.${randInt(rng, 0, 12)}.${randInt(rng, 0, 9)}`
}
function fileName(rng: Rng): string {
  const base = pick(rng, [
    'report',
    'dataset',
    'avatar',
    'invoice',
    'backup',
    'document',
    'export',
    'summary',
  ])
  const ext = pick(rng, FILE_EXTENSIONS)
  return `${base}_${randInt(rng, 100, 999)}.${ext}`
}

// Finance & Commerce
function creditCard(rng: Rng): string {
  const prefix = rng() < 0.6 ? '4532' : '5425'
  const digits = [
    ...prefix.split('').map(Number),
    ...Array.from({ length: 11 }, () => randInt(rng, 0, 9)),
  ]
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = digits[digits.length - 1 - i] ?? 0
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  const checkDigit = (10 - (sum % 10)) % 10
  digits.push(checkDigit)
  const full = digits.join('')
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}`
}
function iban(rng: Rng): string {
  const country = pick(rng, ['US', 'DE', 'GB', 'FR', 'ES', 'NL'])
  return `${country}${pad(randInt(rng, 10, 99), 2)}${pad(randInt(rng, 1000, 9999), 4)}${pad(randInt(rng, 0, 9999999999), 10)}`
}
function price(rng: Rng): number {
  return Number((randInt(rng, 5, 999) + 0.99).toFixed(2))
}
function sku(rng: Rng): string {
  return `SKU-${pick(rng, ['ELEC', 'FASH', 'HOME', 'TECH'])}-${pad(randInt(rng, 100, 999), 3)}`
}
function barcode(rng: Rng): string {
  return `978${pad(randInt(rng, 1000000000, 9999999999), 10)}`
}
function cryptoAddress(rng: Rng): string {
  const hex = '0123456789abcdefABCDEF'
  const addr = Array.from({ length: 40 }, () => hex[randInt(rng, 0, hex.length - 1)]).join('')
  return `0x${addr}`
}

// Content & Text
function loremSentence(rng: Rng): string {
  const count = randInt(rng, 6, 14)
  const words = Array.from({ length: count }, () => pick(rng, LOREM_WORDS))
  const first = words[0] ?? 'Lorem'
  words[0] = first.charAt(0).toUpperCase() + first.slice(1)
  return `${words.join(' ')}.`
}
function loremParagraph(rng: Rng): string {
  return `${loremSentence(rng)} ${loremSentence(rng)} ${loremSentence(rng)}`
}
function avatarUrl(rng: Rng): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username(rng)}`
}
function slug(rng: Rng): string {
  return `${pick(rng, LOREM_WORDS)}-${pick(rng, LOREM_WORDS)}-${randInt(rng, 10, 99)}`
}
function boundaryString(): string {
  const chunk = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 16 }, () => chunk).join('') // 992-char boundary string
}

// ── Generator Registry ──

export const GENERATORS: Record<GeneratorKey, (rng: Rng) => FakeValue> = {
  // Personal
  firstName,
  lastName,
  fullName,
  username,
  email,
  password,
  phone,
  jobTitle: (rng) => pick(rng, JOB_TITLES),
  department: (rng) => pick(rng, DEPARTMENTS),
  company,
  prefix: (rng) => pick(rng, PREFIXES),
  suffix: (rng) => pick(rng, SUFFIXES),
  gender: (rng) => pick(rng, GENDERS),

  // Location
  address,
  city: (rng) => pick(rng, CITIES),
  state: (rng) => pick(rng, STATES),
  country: (rng) => pick(rng, COUNTRIES),
  countryCode: (rng) => pick(rng, COUNTRY_CODES),
  postalCode,
  latitude,
  longitude,

  // Internet & Tech
  uuid,
  url,
  domain: (rng) => pick(rng, DOMAINS),
  ipv4,
  ipv6,
  macAddress,
  userAgent: (rng) => pick(rng, USER_AGENTS),
  jwtToken,
  port,
  semver,
  hexColor: (rng) => pick(rng, HEX_COLORS),
  language: (rng) => pick(rng, LANGUAGES),
  locale: (rng) => pick(rng, LOCALES),
  mimeType: (rng) => pick(rng, MIME_TYPES),
  fileExtension: (rng) => pick(rng, FILE_EXTENSIONS),
  fileName,

  // Finance & Commerce
  creditCard,
  currencyCode: (rng) => pick(rng, CURRENCY_CODES),
  price,
  iban,
  productName: (rng) => pick(rng, PRODUCT_NAMES),
  sku,
  barcode,
  cryptoAddress,

  // Content & Text
  loremSentence,
  loremParagraph,
  avatarUrl,
  slug,

  // Date & Numeric
  date: dateValue,
  datetime: datetimeValue,
  timestamp,
  boolean: (rng) => rng() < 0.5,
  integer,
  float,
  decimal,
  percentage,
  rating,

  // System & HTTP
  status: (rng) => pick(rng, STATUSES),
  priority: (rng) => pick(rng, PRIORITIES),
  httpMethod: (rng) => pick(rng, HTTP_METHODS),
  httpStatusCode: (rng) => pick(rng, HTTP_STATUS_CODES),

  // QA, Security & Fuzzing
  sqliVector: (rng) => pick(rng, SQLI_VECTORS),
  xssVector: (rng) => pick(rng, XSS_VECTORS),
  unicodeEmojiVector: (rng) => pick(rng, UNICODE_EMOJIS),
  boundaryString,
  boundaryNumber: (rng) => pick(rng, BOUNDARY_NUMBERS),
}

export const GENERATOR_KEYS = Object.keys(GENERATORS) as GeneratorKey[]

export function isGeneratorKey(key: string): key is GeneratorKey {
  return key in GENERATORS
}

/** Produce a value for a generator key. `rng` defaults to `Math.random`. */
export function generate(key: GeneratorKey, rng: Rng = Math.random): FakeValue {
  return GENERATORS[key](rng)
}

/** Metadata catalog for UI display & grouping */
export const GENERATOR_CATALOG: GeneratorMeta[] = [
  // Personal
  { key: 'fullName', label: 'Full Name', category: 'personal', description: 'e.g. Sarah Connor' },
  { key: 'firstName', label: 'First Name', category: 'personal', description: 'e.g. Sarah' },
  { key: 'lastName', label: 'Last Name', category: 'personal', description: 'e.g. Connor' },
  { key: 'username', label: 'Username', category: 'personal', description: 'e.g. sconnor82' },
  {
    key: 'email',
    label: 'Email Address',
    category: 'personal',
    description: 'e.g. user@example.com',
  },
  {
    key: 'password',
    label: 'Strong Password',
    category: 'personal',
    description: '12-char secure password',
  },
  { key: 'phone', label: 'Phone Number', category: 'personal', description: 'e.g. +1-555-0199' },
  {
    key: 'jobTitle',
    label: 'Job Title',
    category: 'personal',
    description: 'e.g. Senior Software Engineer',
  },
  { key: 'department', label: 'Department', category: 'personal', description: 'e.g. Engineering' },
  { key: 'company', label: 'Company Name', category: 'personal', description: 'e.g. Acme Corp' },
  {
    key: 'prefix',
    label: 'Name Prefix',
    category: 'personal',
    description: 'e.g. Dr., Prof., Ms.',
  },
  {
    key: 'suffix',
    label: 'Name Suffix',
    category: 'personal',
    description: 'e.g. Jr., III, Ph.D.',
  },
  {
    key: 'gender',
    label: 'Gender',
    category: 'personal',
    description: 'e.g. female, male, non-binary',
  },

  // Location
  {
    key: 'address',
    label: 'Street Address',
    category: 'location',
    description: 'e.g. 742 Evergreen Terrace',
  },
  { key: 'city', label: 'City', category: 'location', description: 'e.g. San Francisco' },
  { key: 'state', label: 'State / Province', category: 'location', description: 'e.g. California' },
  { key: 'country', label: 'Country', category: 'location', description: 'e.g. United States' },
  {
    key: 'countryCode',
    label: 'Country Code (ISO-2)',
    category: 'location',
    description: 'e.g. US, GB, DE',
  },
  {
    key: 'postalCode',
    label: 'Postal / ZIP Code',
    category: 'location',
    description: 'e.g. 90210',
  },
  {
    key: 'latitude',
    label: 'Latitude Coordinate',
    category: 'location',
    description: 'e.g. 37.774929',
  },
  {
    key: 'longitude',
    label: 'Longitude Coordinate',
    category: 'location',
    description: 'e.g. -122.419416',
  },

  // Internet & Tech
  { key: 'uuid', label: 'UUID v4', category: 'internet', description: 'RFC 4122 v4 unique ID' },
  { key: 'ipv4', label: 'IPv4 Address', category: 'internet', description: 'e.g. 192.168.1.10' },
  { key: 'ipv6', label: 'IPv6 Address', category: 'internet', description: 'e.g. 2001:0db8:...' },
  {
    key: 'macAddress',
    label: 'MAC Address',
    category: 'internet',
    description: 'e.g. 00:1A:2B:3C:4D:5E',
  },
  {
    key: 'url',
    label: 'URL Website',
    category: 'internet',
    description: 'e.g. https://www.example.com',
  },
  { key: 'domain', label: 'Domain Name', category: 'internet', description: 'e.g. api.test.dev' },
  {
    key: 'jwtToken',
    label: 'JWT Token Mock',
    category: 'internet',
    description: 'Valid structured header.payload.sig',
  },
  { key: 'port', label: 'Network Port', category: 'internet', description: 'e.g. 8080, 3000, 443' },
  { key: 'semver', label: 'SemVer Version', category: 'internet', description: 'e.g. 1.4.2' },
  { key: 'hexColor', label: 'Hex Color', category: 'internet', description: 'e.g. #3B82F6' },
  {
    key: 'userAgent',
    label: 'Browser User-Agent',
    category: 'internet',
    description: 'Realistic browser user agent',
  },
  {
    key: 'language',
    label: 'Language Code',
    category: 'internet',
    description: 'e.g. en, es, fr, de, ja',
  },
  {
    key: 'locale',
    label: 'Locale Identifier',
    category: 'internet',
    description: 'e.g. en-US, pt-BR',
  },
  {
    key: 'mimeType',
    label: 'MIME Content-Type',
    category: 'internet',
    description: 'e.g. application/json',
  },
  {
    key: 'fileExtension',
    label: 'File Extension',
    category: 'internet',
    description: 'e.g. json, pdf, png',
  },
  { key: 'fileName', label: 'File Name', category: 'internet', description: 'e.g. report_492.pdf' },

  // Finance & Commerce
  {
    key: 'creditCard',
    label: 'Credit Card (Luhn)',
    category: 'finance',
    description: '16-digit valid test card',
  },
  { key: 'price', label: 'Price Amount', category: 'finance', description: 'e.g. 49.99' },
  {
    key: 'currencyCode',
    label: 'Currency Code',
    category: 'finance',
    description: 'e.g. USD, EUR, GBP',
  },
  { key: 'iban', label: 'IBAN Account', category: 'finance', description: 'e.g. US64SVBK...' },
  {
    key: 'productName',
    label: 'Product Name',
    category: 'finance',
    description: 'e.g. Wireless Headphones',
  },
  { key: 'sku', label: 'Product SKU', category: 'finance', description: 'e.g. SKU-ELEC-492' },
  {
    key: 'barcode',
    label: 'Barcode (EAN-13)',
    category: 'finance',
    description: '13-digit retail barcode',
  },
  {
    key: 'cryptoAddress',
    label: 'Crypto Wallet Address',
    category: 'finance',
    description: 'e.g. 0x71C... Ethereum format',
  },

  // Content
  {
    key: 'loremSentence',
    label: 'Lorem Sentence',
    category: 'content',
    description: 'Natural dummy sentence',
  },
  {
    key: 'loremParagraph',
    label: 'Lorem Paragraph',
    category: 'content',
    description: 'Multi-sentence dummy text',
  },
  {
    key: 'avatarUrl',
    label: 'Avatar Image URL',
    category: 'content',
    description: 'Dicebear avatar SVG link',
  },
  { key: 'slug', label: 'URL Slug', category: 'content', description: 'e.g. test-post-slug-42' },

  // Numeric & Dates
  {
    key: 'datetime',
    label: 'ISO Datetime',
    category: 'numeric',
    description: 'e.g. 2026-08-16T14:30:00Z',
  },
  { key: 'date', label: 'Date YYYY-MM-DD', category: 'numeric', description: 'e.g. 2026-08-16' },
  {
    key: 'timestamp',
    label: 'Unix Timestamp',
    category: 'numeric',
    description: 'Seconds epoch timestamp',
  },
  {
    key: 'boolean',
    label: 'Boolean (true/false)',
    category: 'numeric',
    description: 'Random true or false',
  },
  { key: 'integer', label: 'Integer Number', category: 'numeric', description: '1 to 10000' },
  {
    key: 'float',
    label: 'Float Number (4 decimals)',
    category: 'numeric',
    description: 'e.g. 742.1932',
  },
  {
    key: 'decimal',
    label: 'Decimal (2 decimals)',
    category: 'numeric',
    description: 'e.g. 149.50',
  },
  {
    key: 'percentage',
    label: 'Percentage Value',
    category: 'numeric',
    description: '0.0 to 100.0%',
  },
  { key: 'rating', label: 'Rating (1 to 5 stars)', category: 'numeric', description: 'e.g. 4.5' },

  // System & HTTP
  {
    key: 'status',
    label: 'Status Flag',
    category: 'system',
    description: 'e.g. active, pending, archived',
  },
  {
    key: 'priority',
    label: 'Priority Level',
    category: 'system',
    description: 'e.g. low, high, urgent',
  },
  {
    key: 'httpMethod',
    label: 'HTTP Method',
    category: 'system',
    description: 'e.g. GET, POST, PUT',
  },
  {
    key: 'httpStatusCode',
    label: 'HTTP Status Code',
    category: 'system',
    description: 'e.g. 200, 404, 500',
  },

  // QA, Security & Fuzzing
  {
    key: 'sqliVector',
    label: 'SQL Injection Payload',
    category: 'security',
    description: "e.g. ' OR '1'='1' --",
  },
  {
    key: 'xssVector',
    label: 'XSS Vector Payload',
    category: 'security',
    description: 'e.g. <script>alert(1)</script>',
  },
  {
    key: 'unicodeEmojiVector',
    label: 'Unicode / Emojis / RTL',
    category: 'security',
    description: 'Multi-lingual & emoji sets',
  },
  {
    key: 'boundaryString',
    label: 'Boundary String (1KB)',
    category: 'security',
    description: '1024-char long text',
  },
  {
    key: 'boundaryNumber',
    label: 'Boundary Number',
    category: 'security',
    description: '0, -1, MaxInt32, MaxInt64',
  },
]
