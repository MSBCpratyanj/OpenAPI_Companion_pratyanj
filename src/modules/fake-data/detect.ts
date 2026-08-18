import type { GeneratorKey } from './generators'

/**
 * Field-type detection (T-07.2, FR-FDG-001). Picks a generator from a field's
 * NAME first (the strongest signal in a JSON body), then falls back to the
 * current VALUE's runtime type. Returns `null` for fields we can't confidently
 * type — the caller leaves those unchanged (EC-029/EC-030). Detection is
 * best-effort and side-effect-free.
 */

/** Name rules, most-specific first. Tested against the normalized field name. */
const NAME_RULES: ReadonlyArray<[(n: string) => boolean, GeneratorKey]> = [
  [(n) => n.includes('email') || n === 'mail', 'email'],
  [
    (n) => n.includes('username') || n.includes('login') || n.includes('handle') || n === 'user',
    'username',
  ],
  [
    (n) => n.includes('password') || n.includes('passwd') || n === 'pwd' || n.includes('secret'),
    'password',
  ],
  [(n) => n.includes('firstname') || n.includes('givenname') || n === 'fname', 'firstName'],
  [
    (n) =>
      n.includes('lastname') || n.includes('surname') || n.includes('familyname') || n === 'lname',
    'lastName',
  ],
  [(n) => n.includes('prefix') || n.includes('salutation') || n.includes('honorific'), 'prefix'],
  [(n) => n.includes('suffix'), 'suffix'],
  [(n) => n.includes('gender') || n === 'sex', 'gender'],
  [
    (n) =>
      n.includes('fullname') ||
      n.includes('displayname') ||
      n.includes('contactname') ||
      n === 'name',
    'fullName',
  ],
  [
    (n) =>
      n.includes('jobtitle') ||
      n.includes('position') ||
      n.includes('role') ||
      n.includes('designation') ||
      n === 'title',
    'jobTitle',
  ],
  [(n) => n.includes('department') || n.includes('dept') || n.includes('division'), 'department'],
  [
    (n) =>
      n.includes('company') ||
      n.includes('organization') ||
      n.includes('organisation') ||
      n.includes('employer') ||
      n.includes('business'),
    'company',
  ],
  [
    (n) =>
      n.includes('phone') ||
      n.includes('mobile') ||
      n.includes('cell') ||
      n === 'tel' ||
      n.includes('telephone'),
    'phone',
  ],
  [(n) => n.includes('address') || n.includes('street'), 'address'],
  [(n) => n.includes('city') || n.includes('town'), 'city'],
  [(n) => n.includes('state') || n.includes('province') || n.includes('region'), 'state'],
  [(n) => n.includes('countrycode') || n.includes('iso2') || n === 'cc', 'countryCode'],
  [(n) => n.includes('country') || n.includes('nation'), 'country'],
  [(n) => n.includes('zip') || n.includes('postal') || n.includes('postcode'), 'postalCode'],
  [(n) => n.includes('latitude') || n === 'lat', 'latitude'],
  [(n) => n.includes('longitude') || n === 'lng' || n === 'lon', 'longitude'],
  // Tech & Internet
  [(n) => n.includes('ipv6'), 'ipv6'],
  [(n) => n.includes('ipv4') || n.includes('ipaddress') || n === 'ip', 'ipv4'],
  [(n) => n.includes('macaddress') || n === 'mac', 'macAddress'],
  [(n) => n.includes('jwt') || n.includes('accesstoken') || n.includes('bearertoken'), 'jwtToken'],
  [(n) => n.includes('useragent') || n === 'ua', 'userAgent'],
  [(n) => n.includes('hexcolor') || n === 'color' || n.endsWith('color'), 'hexColor'],
  [(n) => n.includes('semver') || n === 'version' || n.endsWith('version'), 'semver'],
  [(n) => n.includes('port') || n === 'serverport', 'port'],
  [(n) => n.includes('domain') || n.includes('hostname'), 'domain'],
  [(n) => n.includes('locale') || n === 'loc', 'locale'],
  [(n) => n.includes('language') || n === 'lang', 'language'],
  [(n) => n.includes('mimetype') || n.includes('contenttype') || n === 'mediatype', 'mimeType'],
  [(n) => n.includes('fileext') || n === 'extension' || n === 'ext', 'fileExtension'],
  [(n) => n.includes('filename') || n.includes('attachment') || n === 'file', 'fileName'],
  [(n) => n.includes('slug') || n.includes('permalink'), 'slug'],
  [
    (n) =>
      n.includes('avatar') ||
      n.includes('picture') ||
      n.includes('photo') ||
      n.includes('thumbnail') ||
      n.includes('profileimage'),
    'avatarUrl',
  ],
  // Finance & Commerce
  [
    (n) => n.includes('creditcard') || n.includes('cardnumber') || n === 'card' || n === 'pan',
    'creditCard',
  ],
  [(n) => n.includes('currency') || n === 'currencycode', 'currencyCode'],
  [(n) => n.includes('iban') || n.includes('bankaccount'), 'iban'],
  [
    (n) =>
      n.includes('wallet') ||
      n.includes('crypto') ||
      n.includes('ethaddress') ||
      n.includes('btcaddress'),
    'cryptoAddress',
  ],
  [(n) => n.includes('sku') || n.includes('itemcode') || n.includes('productcode'), 'sku'],
  [
    (n) => n.includes('barcode') || n.includes('ean') || n.includes('upc') || n.includes('isbn'),
    'barcode',
  ],
  [(n) => n.includes('productname') || n.includes('itemname'), 'productName'],
  // System & HTTP
  [(n) => n === 'status' || n.endsWith('status'), 'status'],
  [(n) => n === 'priority' || n.includes('severity') || n.includes('urgency'), 'priority'],
  [(n) => n === 'method' || n.includes('httpmethod'), 'httpMethod'],
  [(n) => n.includes('statuscode') || n.includes('httpstatus'), 'httpStatusCode'],
  // Content & Text
  [
    (n) =>
      n.includes('paragraph') ||
      n.includes('description') ||
      n.includes('bio') ||
      n.includes('content') ||
      n.includes('summary') ||
      n.includes('notes') ||
      n.includes('comment'),
    'loremParagraph',
  ],
  [
    (n) =>
      n.includes('sentence') ||
      n.includes('headline') ||
      n.includes('subject') ||
      n.includes('tagline') ||
      n.includes('subtitle'),
    'loremSentence',
  ],
  // datetime before date, since "datetime" contains "date".
  [
    (n) =>
      n.includes('datetime') ||
      n.includes('timestamp') ||
      /(created|updated|deleted|modified|expired|published)at$/.test(n) ||
      n === 'time' ||
      n.endsWith('time'),
    'datetime',
  ],
  [
    (n) =>
      n.includes('date') || n.includes('dob') || n.includes('birthday') || n.includes('birthdate'),
    'date',
  ],
  [
    (n) =>
      n.includes('url') ||
      n.includes('uri') ||
      n.includes('website') ||
      n.includes('link') ||
      n.includes('homepage'),
    'url',
  ],
  // Scores, ratings & percentages
  [(n) => n.includes('rating') || n.includes('score') || n.includes('stars'), 'rating'],
  [(n) => n.includes('percent') || n.includes('ratio') || n === 'pct', 'percentage'],
  // Boolean-ish flags
  [
    (n) =>
      n.startsWith('is') ||
      n.startsWith('has') ||
      n.startsWith('should') ||
      n.startsWith('can') ||
      n.startsWith('enable') ||
      n === 'active' ||
      n === 'enabled' ||
      n === 'verified',
    'boolean',
  ],
  // Money-ish fields → price / decimal (2dp)
  [
    (n) =>
      n.includes('amount') ||
      n.includes('price') ||
      n.includes('cost') ||
      n.includes('total') ||
      n.includes('balance') ||
      n.includes('salary') ||
      n.includes('subtotal') ||
      n.includes('discount') ||
      n === 'fee' ||
      n === 'tax',
    'decimal',
  ],
  [
    (n) =>
      n === 'id' ||
      n.endsWith('uuid') ||
      n === 'guid' ||
      /(user|account|order|item|product|customer|member|client|parent|org|session|auth|group|entity)id$/.test(
        n,
      ),
    'uuid',
  ],
]

/** Normalise a field name: lowercase, strip punctuation and whitespace. */
export function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Detect the best generator for a field (name + value). Pure, side-effect-free.
 * Returns `null` if no rule matches and value is non-primitive/empty/null.
 */
export function detectGenerator(name: string, value?: unknown): GeneratorKey | null {
  const norm = normalizeFieldName(name)

  // 1. Try name heuristics (strongest signal)
  for (const [match, key] of NAME_RULES) {
    if (match(norm)) return key
  }

  // 2. Fall back to current value type heuristics
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'float'
  }
  if (typeof value === 'string' && value.length > 0) {
    // ISO date/datetime string detection
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'datetime'
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
    // UUID v4 format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
    // Email format
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email'
    // URL format
    if (/^https?:\/\//i.test(value)) return 'url'
  }

  return null
}
