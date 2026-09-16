/**
 * Working out the town a restaurant is actually in.
 *
 * The FSA gives us two things and neither is the town:
 *
 *  - `area` is the local authority — "South Kesteven", "Dacorum",
 *    "Telford and Wrekin Council". Always present, but frequently
 *    meaningless to a human: nobody searching for a pub in Long
 *    Bennington thinks of it as South Kesteven.
 *  - `address` is AddressLine1-4 joined with commas (see
 *    scripts/sync-fhrs.ts), where the town appears in no fixed position.
 *
 * Looking at real records, the shape is consistent enough to exploit —
 * the town is the last address segment, unless the address ends with a
 * county, in which case it's the one before:
 *
 *   The Royal Oak, 74 Main Road, Long Bennington, Lincolnshire  -> Long Bennington
 *   The Kings Arms, 147 High Street, Berkhamsted, Hertfordshire -> Berkhamsted
 *   Southwater Square, Telford, Shropshire                      -> Telford
 *   147 Deane Road, Bolton                                      -> Bolton
 *   202 The Balcony, Westfield Stratford City, Montfichet Road, Stratford -> Stratford
 *
 * This is a heuristic over free text typed by thousands of different
 * council officers, so it is built to fail quietly: anything that looks
 * like a street, a building or a unit is rejected rather than guessed at,
 * and callers get null and fall back to leaving the location out. A title
 * that reads "Does The Oak add a service charge?" is fine; one that reads
 * "Does The Oak in Unit 4b add a service charge?" is not, and at 184,000
 * pages that difference matters.
 */

// Ceremonial, historic and postal counties, plus the home nations. Only
// used to strip a trailing county off an address, so over-inclusion is
// cheap and missing one just means a slightly worse title.
const COUNTIES = new Set(
  [
    // England
    "avon", "bedfordshire", "berkshire", "bristol", "buckinghamshire",
    "cambridgeshire", "cheshire", "cleveland", "cornwall", "cumbria",
    "cumberland", "derbyshire", "devon", "dorset", "durham", "county durham",
    "east riding of yorkshire", "east sussex", "essex", "gloucestershire",
    "greater london", "greater manchester", "hampshire", "herefordshire",
    "hertfordshire", "humberside", "isle of wight", "kent", "lancashire",
    "leicestershire", "lincolnshire", "merseyside", "middlesex", "norfolk",
    "north humberside", "north yorkshire", "northamptonshire",
    "northumberland", "nottinghamshire", "oxfordshire", "rutland",
    "shropshire", "somerset", "south humberside", "south yorkshire",
    "staffordshire", "suffolk", "surrey", "tyne and wear", "warwickshire",
    "west midlands", "west sussex", "west yorkshire", "wiltshire",
    "worcestershire",
    // Wales
    "anglesey", "blaenau gwent", "bridgend", "caerphilly", "cardiff",
    "carmarthenshire", "ceredigion", "clwyd", "conwy", "denbighshire",
    "dyfed", "flintshire", "gwent", "gwynedd", "mid glamorgan",
    "monmouthshire", "neath port talbot", "newport", "pembrokeshire",
    "powys", "rhondda cynon taf", "south glamorgan", "swansea", "torfaen",
    "vale of glamorgan", "west glamorgan", "wrexham",
    // Scotland
    "aberdeenshire", "angus", "argyll", "argyll and bute", "ayrshire",
    "banffshire", "berwickshire", "caithness", "clackmannanshire",
    "dumfriesshire", "dunbartonshire", "east lothian", "fife",
    "inverness-shire", "kincardineshire", "lanarkshire", "midlothian",
    "moray", "nairnshire", "orkney", "peeblesshire", "perthshire",
    "renfrewshire", "ross-shire", "roxburghshire", "selkirkshire",
    "shetland", "stirlingshire", "sutherland", "west lothian",
    "wigtownshire",
    // Northern Ireland
    "antrim", "armagh", "down", "fermanagh", "londonderry", "tyrone",
    // Nations / country
    "england", "scotland", "wales", "northern ireland", "united kingdom",
    "uk", "great britain",
  ].map((c) => c.toLowerCase())
);

// Words that mark a segment as a street, building or unit rather than a
// settlement. Checked as whole words so "Southwater Square" is rejected
// while "Stratford" survives.
//
// Deliberately NOT listed, despite looking street-ish:
//  - "st": St Ives, St Albans, St Helens, St Neots, St Austell. As a
//    final address segment it means Saint far more often than Street,
//    and excluding it wrote off every St-town in the country.
//  - "hill", "grove", "gardens", "park": Notting Hill, Ladbroke Grove,
//    Muswell Hill are the town for their listings. Retail and business
//    parks are caught by "retail"/"business"/"industrial"/"trading"
//    instead, which is the same catch without the collateral damage.
//
// The asymmetry to keep in mind when editing this: a false negative just
// means a title without a location, which is what we have today. A false
// positive puts "in Unit 4b" in front of searchers.
const NOT_A_TOWN =
  /\b(road|rd|street|lane|ln|avenue|ave|way|drive|dr|close|court|crescent|terrace|place|square|parade|row|walk|mews|wharf|quay|estate|industrial|retail|business|trading|shopping|centre|center|mall|precinct|unit|units|floor|suite|building|house|block|yard|farm|barn|market|arcade|plaza|services?|airport|station)\b/i;

/**
 * The town a restaurant sits in, or null when it can't be established
 * with reasonable confidence.
 *
 * @param address the FSA address string (comma-joined address lines)
 * @param name the restaurant's name, so a leading segment that just
 *   repeats it ("The Royal Oak, 74 Main Road, …") doesn't get mistaken
 *   for a place
 */
export function townFromAddress(
  address: string | null | undefined,
  name?: string
): string | null {
  if (!address) return null;

  let parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Drop a segment that merely repeats the restaurant's name.
  if (name) {
    const n = name.trim().toLowerCase();
    parts = parts.filter((p) => p.toLowerCase() !== n);
  }

  // Strip trailing counties/nations — sometimes more than one
  // ("Berkhamsted, Hertfordshire, England").
  while (parts.length > 1 && COUNTIES.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }

  const candidate = parts[parts.length - 1];
  if (!candidate) return null;

  // Reject anything that reads as an address line rather than a place:
  // a leading building number, a postcode fragment, or a street word.
  if (/^\d/.test(candidate)) return null;
  if (NOT_A_TOWN.test(candidate)) return null;
  // Guard against oddities — a single letter, or a whole sentence.
  if (candidate.length < 3 || candidate.length > 40) return null;

  return candidate;
}

/**
 * How to refer to where a restaurant is, in prose, preferring the town
 * and falling back to the local authority only when that reads like a
 * place rather than an administrative unit. Returns null when neither
 * works, so callers can simply leave the location out.
 */
export function placeLabel(
  address: string | null | undefined,
  area: string,
  name?: string
): string | null {
  const town = townFromAddress(address, name);
  if (town) return town;

  // "Telford and Wrekin Council" and friends read badly in a sentence;
  // better to say nothing than to say that.
  if (!area) return null;
  if (/\bcouncil\b|\bborough\b|\bdistrict\b|\bcity of\b/i.test(area)) return null;
  return area;
}
