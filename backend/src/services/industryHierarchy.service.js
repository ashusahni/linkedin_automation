import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IndustryHierarchyService {
    constructor() {
        this.hierarchyMap = new Map();
        this.industryData = [];
        this.loaded = false;
    }

    /**
   * Load and parse the CSV file on startup
   */
    async loadIndustryData() {
        if (this.loaded) return;

        try {
            const csvPath = path.join(__dirname, '../data/linkedin_industry_code_v2_all_eng.csv');
            const fileContent = fs.readFileSync(csvPath, 'utf-8');

            const records = parse(fileContent, {
                columns: false,
                skip_empty_lines: true,
                relax_column_count: true
            });

            // First pass: collect all records
            const allRecords = [];
            for (const record of records) {
                const [code, name, hierarchyPath, description] = record;

                // Parse hierarchy path (e.g., "Education > Higher Education")
                const pathParts = hierarchyPath.split('>').map(p => p.trim());
                const topLevelIndustry = pathParts[0];
                const level = pathParts.length;

                allRecords.push({
                    code,
                    name,
                    hierarchyPath,
                    pathParts,
                    topLevelIndustry,
                    level,
                    description,
                    isTopLevel: level === 1,
                    parent: level > 1 ? pathParts[level - 2] : null
                });
            }

            // Second pass: build hierarchy map
            for (const record of allRecords) {
                const { topLevelIndustry, level, name, code, hierarchyPath, description } = record;

                // Initialize top-level industry if not exists
                if (!this.hierarchyMap.has(topLevelIndustry)) {
                    this.hierarchyMap.set(topLevelIndustry, {
                        name: topLevelIndustry,
                        code: null,
                        subIndustries: [],
                        jobRoles: new Set(),
                        metadataTags: new Set()
                    });
                }

                const topLevel = this.hierarchyMap.get(topLevelIndustry);

                // Set the code for top-level industry
                if (level === 1) {
                    topLevel.code = code;
                }

                // Add ALL sub-industries (level 2+) that belong to this top-level industry
                if (level > 1) {
                    topLevel.subIndustries.push({
                        name,
                        code,
                        level,
                        parent: record.pathParts[level - 2],
                        fullPath: hierarchyPath,
                        pathParts: record.pathParts
                    });
                }

                // Extract and aggregate job roles and metadata
                const jobRoles = this.extractJobRoles(description);
                const metadataTags = this.extractMetadataTags(name, description);

                jobRoles.forEach(role => topLevel.jobRoles.add(role));
                metadataTags.forEach(tag => topLevel.metadataTags.add(tag));

                // Store in industryData for reference
                this.industryData.push({
                    ...record,
                    jobRoles,
                    metadataTags
                });
            }

            // Convert Sets to Arrays for JSON serialization
            for (const [key, value] of this.hierarchyMap.entries()) {
                value.jobRoles = Array.from(value.jobRoles);
                value.metadataTags = Array.from(value.metadataTags);

                // Sort sub-industries by level and name for better display
                value.subIndustries.sort((a, b) => {
                    if (a.level !== b.level) return a.level - b.level;
                    return a.name.localeCompare(b.name);
                });
            }

            this.loaded = true;
            console.log(`✅ Loaded ${this.industryData.length} industries into hierarchy`);
            console.log(`📊 Top-level industries: ${this.hierarchyMap.size}`);

            // Debug: Log sample subtags for Education
            const educationData = this.hierarchyMap.get('Education');
            if (educationData) {
                console.log(`📚 Education has ${educationData.subIndustries.length} sub-industries`);
            }
        } catch (error) {
            console.error('❌ Error loading industry data:', error);
            throw error;
        }
    }

    /**
     * Extract job roles from description text
     */
    extractJobRoles(description) {
        const roles = [];
        const roleKeywords = [
            'manager', 'director', 'engineer', 'analyst', 'consultant', 'specialist',
            'coordinator', 'administrator', 'technician', 'developer', 'designer',
            'officer', 'executive', 'supervisor', 'associate', 'assistant'
        ];

        const lowerDesc = description.toLowerCase();
        roleKeywords.forEach(keyword => {
            if (lowerDesc.includes(keyword)) {
                roles.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
            }
        });

        return roles;
    }

    /**
     * Extract metadata tags from name and description
     */
    extractMetadataTags(name, description) {
        const tags = [];
        const text = `${name} ${description}`.toLowerCase();

        // Common metadata categories
        const tagPatterns = {
            'B2B': /\b(business-to-business|b2b|enterprise|commercial)\b/,
            'B2C': /\b(consumer|retail|individual|personal)\b/,
            'Technology': /\b(software|hardware|digital|tech|IT|computer)\b/,
            'Healthcare': /\b(health|medical|hospital|clinical|patient)\b/,
            'Finance': /\b(financial|banking|investment|insurance)\b/,
            'Manufacturing': /\b(manufactur|production|industrial|factory)\b/,
            'Services': /\b(service|consulting|support|assistance)\b/,
            'Education': /\b(education|training|learning|academic)\b/,
            'Government': /\b(government|public|federal|state|municipal)\b/,
            'Nonprofit': /\b(nonprofit|non-profit|charitable|foundation)\b/
        };

        for (const [tag, pattern] of Object.entries(tagPatterns)) {
            if (pattern.test(text)) {
                tags.push(tag);
            }
        }

        return tags;
    }

    /**
     * Get full hierarchy structure
     */
    getFullHierarchy() {
        if (!this.loaded) {
            throw new Error('Industry data not loaded. Call loadIndustryData() first.');
        }

        return Object.fromEntries(this.hierarchyMap);
    }

    /**
     * Get subtags for a specific industry
     */
    getSubtags(industryName) {
        if (!this.loaded) {
            throw new Error('Industry data not loaded. Call loadIndustryData() first.');
        }

        const industry = this.hierarchyMap.get(industryName);
        if (!industry) {
            return null;
        }

        return {
            industry: industryName,
            subIndustries: industry.subIndustries,
            jobRoles: industry.jobRoles,
            metadataTags: industry.metadataTags
        };
    }

    /**
     * Get all top-level industries
     */
    getTopLevelIndustries() {
        if (!this.loaded) {
            throw new Error('Industry data not loaded. Call loadIndustryData() first.');
        }

        return Array.from(this.hierarchyMap.keys()).sort();
    }

    /**
     * Calculate priority score for an industry based on profile
     */
    calculatePriorityScore(industryName, profile, leadCount) {
        if (!profile) return Math.log(leadCount + 1);

        const profileIndustry = (profile.industry || '').toLowerCase();
        const profileTitle = (profile.title || '').toLowerCase();
        const profileCompany = (profile.company || '').toLowerCase();
        const industry = this.hierarchyMap.get(industryName);

        if (!industry) return Math.log(leadCount + 1);

        let score = 0;

        // 1. Direct industry name match (weight: 10)
        const industryLower = industryName.toLowerCase();
        if (profileIndustry && industryLower.includes(profileIndustry)) {
            score += 10;
        }

        // 2. Sub-industry match (weight: 8)
        if (profileIndustry || profileCompany) {
            const matchingSubIndustries = industry.subIndustries.filter(sub => {
                const subName = sub.name.toLowerCase();
                return (profileIndustry && subName.includes(profileIndustry)) ||
                    (profileCompany && subName.includes(profileCompany));
            });
            if (matchingSubIndustries.length > 0) {
                score += 8;
            }
        }

        // 3. Company-based industry inference (weight: 7)
        // e.g., "Scottish Chemical Industries" should match "Manufacturing"
        if (profileCompany) {
            const companyIndustryKeywords = {
                'Manufacturing': ['chemical', 'industries', 'manufacturing', 'industrial', 'materials', 'production'],
                'Technology': ['tech', 'software', 'digital', 'systems', 'solutions'],
                'Finance': ['bank', 'capital', 'financial', 'investment'],
                'Healthcare': ['health', 'medical', 'pharma', 'clinical'],
                'Consulting': ['consulting', 'advisory', 'partners'],
                'Retail': ['retail', 'commerce', 'store'],
                'Education': ['education', 'university', 'academy', 'learning']
            };

            const keywords = companyIndustryKeywords[industryName] || [];
            if (keywords.some(kw => profileCompany.includes(kw))) {
                score += 7;
            }
        }

        // 4. Job role/title match (weight: 5)
        if (profileTitle) {
            const matchingRoles = industry.jobRoles.filter(role =>
                profileTitle.includes(role.toLowerCase()) ||
                role.toLowerCase().includes(profileTitle)
            );
            if (matchingRoles.length > 0) {
                score += 5;
            }
        }

        // 5. Metadata tag match (weight: 4)
        if (profile.metadata && profile.metadata.length > 0) {
            const profileTags = new Set((profile.metadata || []).map(t => t.toLowerCase()));
            const matchingTags = industry.metadataTags.filter(tag =>
                profileTags.has(tag.toLowerCase())
            );
            score += matchingTags.length * 4;
        }

        // 6. Semantic similarity for common patterns
        // Director -> Management-heavy industries
        if (profileTitle.includes('director') || profileTitle.includes('manager')) {
            const managementIndustries = ['Consulting', 'Finance', 'Professional Services', 'Management'];
            if (managementIndustries.some(ind => industryName.includes(ind))) {
                score += 3;
            }
        }

        // 7. Add logarithmic count component (weight: 1-3)
        // This ensures industries with more leads still get some priority
        score += Math.log(leadCount + 1);

        return score;
    }

    /**
     * Sort industries by priority score
     */
    sortIndustriesByPriority(industryCounts, profile, preferenceMode = false) {
        const industries = Object.entries(industryCounts).map(([name, count]) => ({
            name,
            count,
            score: this.calculatePriorityScore(name, profile, count)
        }));

        // Custom priority: Marketing & Advertising first, then Manufacturing, then by count
        industries.sort((a, b) => {
            const aLower = a.name.toLowerCase();
            const bLower = b.name.toLowerCase();

            // Priority 1: Marketing & Advertising (exact match or contains 'marketing')
            const aIsMarketing = aLower.includes('marketing') || aLower.includes('advertising');
            const bIsMarketing = bLower.includes('marketing') || bLower.includes('advertising');
            if (aIsMarketing && !bIsMarketing) return -1;
            if (!aIsMarketing && bIsMarketing) return 1;

            // Priority 2: Manufacturing
            const aIsManufacturing = aLower.includes('manufacturing');
            const bIsManufacturing = bLower.includes('manufacturing');
            if (aIsManufacturing && !bIsManufacturing) return -1;
            if (!aIsManufacturing && bIsManufacturing) return 1;

            // Priority 3: Sort by count (descending)
            return b.count - a.count;
        });

        console.log('📊 Sorted industries (top 5):', industries.slice(0, 5).map(i => i.name));

        return industries;
    }
}

// Singleton instance
const industryHierarchyService = new IndustryHierarchyService();

export default industryHierarchyService;
