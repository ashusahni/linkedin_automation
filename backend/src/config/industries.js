/**
 * Sub-industry keyword groups for dashboard subcategory breakdown.
 * Used when linkedin_industries DB has no match - provides fallback via metadata/keyword matching.
 * Each subcategory has keywords; a lead matches if company+title contains any keyword.
 */
export const SUB_INDUSTRY_KEYWORDS = {
  "Technology, Information and Media": [
    { name: "Artificial Intelligence", keywords: [" ai ", " ai,", " ai.", "artificial intelligence", "machine learning", "deep learning", "ml ", " llm", "gpt", "neural", "gen ai", "generative ai"] },
    { name: "Software & SaaS", keywords: ["software", "saas", "platform", "cloud", "developer", "engineering", "app ", "application"] },
    { name: "IT Services", keywords: ["it services", "information technology", "consulting", "solutions", "system integrator", "managed services"] },
    { name: "Cybersecurity", keywords: ["cybersecurity", "security", "infosec", "penetration", "firewall", "encryption"] },
    { name: "Data & Analytics", keywords: ["data ", "analytics", "big data", "business intelligence", "bi ", "data science"] },
    { name: "Telecom & Network", keywords: ["telecom", "telecommunications", "network", "5g", "connectivity", "isp"] },
  ],
  Education: [
    { name: "Higher Education", keywords: ["university", "college", "academic", "research", "professor", "faculty", "campus"] },
    { name: "K-12 & Schools", keywords: ["school", "elementary", "high school", "primary", "secondary", "district"] },
    { name: "EdTech & E-Learning", keywords: ["edtech", "e-learning", "online learning", "mooc", "course", "lms", "learning platform"] },
    { name: "Training & Development", keywords: ["training", "professional development", "corporate learning", "certification"] },
  ],
  "Financial Services": [
    { name: "Banking", keywords: ["bank", "banking", "credit union", "lending"] },
    { name: "Investment & Asset Management", keywords: ["investment", "asset management", "hedge fund", "private equity", "wealth management"] },
    { name: "Insurance", keywords: ["insurance", "underwriting", "claims", "actuarial"] },
    { name: "Fintech", keywords: ["fintech", "financial technology", "payments", "blockchain", "cryptocurrency"] },
  ],
  "Hospitals and Health Care": [
    { name: "Pharmaceuticals", keywords: ["pharma", "pharmaceutical", "drug", "biopharma"] },
    { name: "Biotechnology", keywords: ["biotech", "biotechnology", "genomics", "life sciences"] },
    { name: "Clinical & Hospitals", keywords: ["hospital", "clinic", "clinical", "patient care", "healthcare"] },
    { name: "Medical Devices", keywords: ["medical device", "medtech", "diagnostics", "equipment"] },
  ],
  "Manufacturing": [
    { name: "Industrial Manufacturing", keywords: ["industrial", "factory", "production", "assembly", "machinery"] },
    { name: "Electronics", keywords: ["electronics", "semiconductor", "chip", "pcb", "components"] },
    { name: "Automotive Manufacturing", keywords: ["automotive", "automobile", "oem", "tier 1", "tier 2"] },
  ],
  "Marketing & Advertising": [
    { name: "Digital Marketing", keywords: ["digital marketing", "seo", "ppc", "social media", "content marketing"] },
    { name: "Advertising & Creative", keywords: ["advertising", "creative", "agency", "branding", "campaign"] },
    { name: "Market Research", keywords: ["market research", "insights", "analytics", "consumer"] },
  ],
  Construction: [
    { name: "Commercial Construction", keywords: ["commercial", "commercial construction", "office", "retail space"] },
    { name: "Residential", keywords: ["residential", "housing", "home", "real estate development"] },
    { name: "Infrastructure", keywords: ["infrastructure", "civil", "highway", "bridge", "road"] },
  ],
  "Professional Services": [
    { name: "Legal", keywords: ["legal", "law firm", "attorney", "lawyer", "legal services"] },
    { name: "Consulting", keywords: ["consulting", "consultant", "advisory", "management consulting"] },
  ],
};

export const INDUSTRY_KEYWORDS = {
    "Accommodation Services": ["hotel", "resort", "lodging", "hospitality", "accommodation", "inn", "motel", "hostel", "bed and breakfast", "bnb"],
    "Administrative and Support Services": ["administrative", "support services", "business services", "office support", "facilities management", "call center", "outsourcing"],
    "Construction": ["construction", "contractor", "builder", "building", "infrastructure", "civil engineering", "architecture", "renovation"],
    "Consumer Services": ["consumer services", "retail services", "customer service", "personal services", "consumer goods", "hairdresser", "salon", "laundry"],
    "Education": ["education", "school", "university", "college", "academic", "learning", "training", "educational", "institute", "student", "teacher", "professor", "faculty"],
    "Entertainment Providers": ["entertainment", "media", "film", "television", "music", "gaming", "sports", "recreation", "amusement", "cinema", "theater"],
    "Farming, Ranching, Forestry": ["farming", "ranching", "forestry", "agriculture", "agricultural", "farm", "ranch", "crop", "livestock", "forest"],
    "Financial Services": ["financial", "banking", "finance", "investment", "insurance", "accounting", "wealth management", "credit", "loan", "mortgage", "fintech", "audit", "tax", "cpa"],
    "Government Administration": ["government", "public sector", "municipal", "federal", "state", "public administration", "civic", "ministry", "department"],
    "Holding Companies": ["holding", "holdings", "investment company", "conglomerate", "group"],
    "Hospitals and Health Care": ["hospital", "healthcare", "health care", "medical", "clinic", "health", "pharmaceutical", "pharma", "biotech", "nursing", "physician", "doctor", "surgeon", "dentist"],
    "Manufacturing": ["manufacturing", "manufacturer", "production", "factory", "industrial", "assembly", "fabrication"],
    "Oil, Gas, and Mining": ["oil", "gas", "petroleum", "mining", "energy", "drilling", "refinery", "extraction", "mineral"],
    "Professional Services": ["professional services", "consulting", "legal", "law firm", "advisory", "professional", "attorney", "lawyer", "consultant"],
    "Real Estate and Equipment Rental Services": ["real estate", "property", "realtor", "rental", "leasing", "equipment rental", "property management", "broker"],
    "Retail": ["retail", "store", "shop", "merchandise", "e-commerce", "commerce", "shopping", "supermarket", "mall"],
    "Technology, Information and Media": ["technology", "tech", "software", "it ", "information technology", "digital", "computer", "saas", "cloud", "data", "internet", "web", "app", "developer", "programming", "ai", "artificial intelligence", "machine learning", "cybersecurity", "blockchain", "network", "telecom"],
    "Transportation, Logistics, Supply Chain and Storage": ["transportation", "logistics", "shipping", "freight", "delivery", "supply chain", "warehouse", "storage", "trucking"],
    "Utilities": ["utilities", "utility", "electric", "power", "water", "gas utility", "energy utility", "public utility"],
    "Wholesale": ["wholesale", "distributor", "distribution", "wholesaler", "bulk", "import", "export", "trading"],
    "Marketing & Advertising": ["marketing", "advertising", "pr", "public relations", "branding", "creative agency", "digital marketing", "market research", "seo", "social media", "content creator", "copywriter"],
    "Food & Beverage Services": ["food", "beverage", "restaurant", "cafe", "dining", "catering", "brewery", "winery", "bar", "bakery", "culinary", "chef", "cook"],
    "Automotive": ["automotive", "automobile", "car", "vehicle", "dealership", "motor", "auto repair", "mechanic"],
    "Non-profit & Organization": ["non-profit", "nonprofit", "charity", "foundation", "social organization", "ngo", "philanthropy", "association", "society", "community organization"],
    "Design & Arts": ["design", "graphic design", "interior design", "creative", "art", "photography", "artist", "illustrator", "animator"],
};

/**
 * Default profile-based tier groups (used when no manual LinkedIn Preference tiers are set).
 * All leads from My Contacts (any source) are split into:
 *   Primary = industries closely related to user profile (e.g. chemical CEO → manufacturing, chemicals, marketing, sales)
 *   Secondary = adjacent industries (e.g. IT, tech, education)
 *   Tertiary = remaining leads
 * Keys are top-level industry names (must match INDUSTRY_KEYWORDS). Manual preference_tiers override this.
 */
export const TIER_INDUSTRY_GROUPS = {
  Manufacturing: {
    primary: ["Manufacturing", "Oil, Gas, and Mining", "Construction", "Wholesale", "Marketing & Advertising", "Professional Services", "Utilities", "Automotive", "Hospitals and Health Care", "Transportation, Logistics, Supply Chain and Storage"],
    secondary: ["Technology, Information and Media", "Education", "Financial Services", "Retail", "Administrative and Support Services", "Real Estate and Equipment Rental Services", "Entertainment Providers", "Consumer Services", "Accommodation Services", "Food & Beverage Services"],
  },
  "Technology, Information and Media": {
    primary: ["Technology, Information and Media", "Professional Services", "Marketing & Advertising", "Financial Services", "Administrative and Support Services", "Design & Arts"],
    secondary: ["Manufacturing", "Education", "Retail", "Hospitals and Health Care", "Entertainment Providers", "Real Estate and Equipment Rental Services", "Consumer Services", "Government Administration"],
  },
  "Hospitals and Health Care": {
    primary: ["Hospitals and Health Care", "Manufacturing", "Professional Services", "Oil, Gas, and Mining", "Utilities", "Wholesale", "Technology, Information and Media"],
    secondary: ["Education", "Financial Services", "Retail", "Government Administration", "Non-profit & Organization", "Real Estate and Equipment Rental Services"],
  },
  "Financial Services": {
    primary: ["Financial Services", "Professional Services", "Technology, Information and Media", "Administrative and Support Services", "Holding Companies"],
    secondary: ["Manufacturing", "Retail", "Real Estate and Equipment Rental Services", "Education", "Government Administration", "Marketing & Advertising"],
  },
  Education: {
    primary: ["Education", "Professional Services", "Technology, Information and Media", "Non-profit & Organization", "Government Administration"],
    secondary: ["Financial Services", "Hospitals and Health Care", "Retail", "Manufacturing", "Marketing & Advertising", "Entertainment Providers"],
  },
  "Marketing & Advertising": {
    primary: ["Marketing & Advertising", "Technology, Information and Media", "Professional Services", "Retail", "Entertainment Providers", "Design & Arts", "Consumer Services"],
    secondary: ["Manufacturing", "Financial Services", "Education", "Real Estate and Equipment Rental Services", "Administrative and Support Services"],
  },
  "Professional Services": {
    primary: ["Professional Services", "Technology, Information and Media", "Financial Services", "Marketing & Advertising", "Administrative and Support Services"],
    secondary: ["Manufacturing", "Education", "Retail", "Real Estate and Equipment Rental Services", "Government Administration", "Hospitals and Health Care"],
  },
  Construction: {
    primary: ["Construction", "Manufacturing", "Real Estate and Equipment Rental Services", "Oil, Gas, and Mining", "Utilities", "Wholesale", "Professional Services"],
    secondary: ["Technology, Information and Media", "Financial Services", "Government Administration", "Retail", "Transportation, Logistics, Supply Chain and Storage"],
  },
  Retail: {
    primary: ["Retail", "Consumer Services", "Marketing & Advertising", "Food & Beverage Services", "Wholesale", "Transportation, Logistics, Supply Chain and Storage"],
    secondary: ["Technology, Information and Media", "Financial Services", "Manufacturing", "Professional Services", "Real Estate and Equipment Rental Services", "Entertainment Providers"],
  },
  "Oil, Gas, and Mining": {
    primary: ["Oil, Gas, and Mining", "Manufacturing", "Utilities", "Construction", "Transportation, Logistics, Supply Chain and Storage", "Professional Services", "Wholesale"],
    secondary: ["Technology, Information and Media", "Financial Services", "Government Administration", "Education", "Retail"],
  },
  "Transportation, Logistics, Supply Chain and Storage": {
    primary: ["Transportation, Logistics, Supply Chain and Storage", "Manufacturing", "Retail", "Wholesale", "Oil, Gas, and Mining", "Professional Services"],
    secondary: ["Technology, Information and Media", "Financial Services", "Construction", "Real Estate and Equipment Rental Services", "Administrative and Support Services"],
  },
  "Real Estate and Equipment Rental Services": {
    primary: ["Real Estate and Equipment Rental Services", "Construction", "Professional Services", "Financial Services", "Government Administration"],
    secondary: ["Manufacturing", "Retail", "Technology, Information and Media", "Hospitals and Health Care", "Administrative and Support Services"],
  },
  "Accommodation Services": {
    primary: ["Accommodation Services", "Food & Beverage Services", "Consumer Services", "Retail", "Entertainment Providers"],
    secondary: ["Marketing & Advertising", "Real Estate and Equipment Rental Services", "Professional Services", "Technology, Information and Media", "Administrative and Support Services"],
  },
  "Food & Beverage Services": {
    primary: ["Food & Beverage Services", "Accommodation Services", "Retail", "Consumer Services", "Farming, Ranching, Forestry", "Wholesale"],
    secondary: ["Marketing & Advertising", "Transportation, Logistics, Supply Chain and Storage", "Professional Services", "Manufacturing", "Entertainment Providers"],
  },
  "Government Administration": {
    primary: ["Government Administration", "Professional Services", "Education", "Hospitals and Health Care", "Utilities", "Transportation, Logistics, Supply Chain and Storage"],
    secondary: ["Technology, Information and Media", "Financial Services", "Construction", "Non-profit & Organization", "Manufacturing"],
  },
  Utilities: {
    primary: ["Utilities", "Oil, Gas, and Mining", "Manufacturing", "Construction", "Government Administration", "Professional Services"],
    secondary: ["Technology, Information and Media", "Financial Services", "Transportation, Logistics, Supply Chain and Storage", "Education"],
  },
  Wholesale: {
    primary: ["Wholesale", "Manufacturing", "Retail", "Transportation, Logistics, Supply Chain and Storage", "Professional Services", "Oil, Gas, and Mining"],
    secondary: ["Technology, Information and Media", "Financial Services", "Construction", "Consumer Services", "Real Estate and Equipment Rental Services"],
  },
  "Entertainment Providers": {
    primary: ["Entertainment Providers", "Technology, Information and Media", "Marketing & Advertising", "Consumer Services", "Design & Arts", "Retail"],
    secondary: ["Professional Services", "Financial Services", "Education", "Real Estate and Equipment Rental Services", "Accommodation Services"],
  },
  "Consumer Services": {
    primary: ["Consumer Services", "Retail", "Food & Beverage Services", "Accommodation Services", "Marketing & Advertising", "Entertainment Providers"],
    secondary: ["Technology, Information and Media", "Professional Services", "Financial Services", "Real Estate and Equipment Rental Services"],
  },
  "Administrative and Support Services": {
    primary: ["Administrative and Support Services", "Professional Services", "Technology, Information and Media", "Financial Services", "Manufacturing", "Retail"],
    secondary: ["Education", "Government Administration", "Hospitals and Health Care", "Real Estate and Equipment Rental Services", "Transportation, Logistics, Supply Chain and Storage"],
  },
  "Farming, Ranching, Forestry": {
    primary: ["Farming, Ranching, Forestry", "Food & Beverage Services", "Wholesale", "Manufacturing", "Consumer Services", "Utilities"],
    secondary: ["Professional Services", "Financial Services", "Government Administration", "Retail", "Transportation, Logistics, Supply Chain and Storage"],
  },
  "Holding Companies": {
    primary: ["Holding Companies", "Financial Services", "Professional Services", "Manufacturing", "Technology, Information and Media", "Real Estate and Equipment Rental Services"],
    secondary: ["Retail", "Oil, Gas, and Mining", "Transportation, Logistics, Supply Chain and Storage", "Education", "Government Administration", "Utilities"],
  },
  Automotive: {
    primary: ["Automotive", "Manufacturing", "Retail", "Wholesale", "Transportation, Logistics, Supply Chain and Storage", "Professional Services"],
    secondary: ["Technology, Information and Media", "Financial Services", "Oil, Gas, and Mining", "Construction", "Consumer Services"],
  },
  "Non-profit & Organization": {
    primary: ["Non-profit & Organization", "Education", "Government Administration", "Hospitals and Health Care", "Professional Services"],
    secondary: ["Financial Services", "Technology, Information and Media", "Marketing & Advertising", "Real Estate and Equipment Rental Services", "Retail"],
  },
  "Design & Arts": {
    primary: ["Design & Arts", "Marketing & Advertising", "Technology, Information and Media", "Entertainment Providers", "Retail", "Consumer Services"],
    secondary: ["Professional Services", "Education", "Real Estate and Equipment Rental Services", "Manufacturing", "Financial Services"],
  },
};
