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
