/** Lead Search phantom pipeline — shared localStorage (Lead Search page + Settings). */
export const LEAD_SEARCH_PIPELINE_STORAGE_KEY = 'leadSearchPipeline_v2';

export const LEAD_SEARCH_PIPELINE_SYNC_EVENT = 'leadSearchPipelineSync';

const LEGACY_CONNECTIONS_AUTO_SYNC_KEY = 'connectionsAutoSync_v1';

export function readLeadSearchPipelineStorage() {
    try {
        const raw = localStorage.getItem(LEAD_SEARCH_PIPELINE_STORAGE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            const ts = Number(p?.nextRunAt);
            const enabled = typeof p?.enabled === 'boolean' ? p.enabled : true;
            return {
                nextRunAt: Number.isFinite(ts) ? ts : Date.now(),
                enabled,
            };
        }
        const v1raw = localStorage.getItem(LEGACY_CONNECTIONS_AUTO_SYNC_KEY);
        if (v1raw) {
            const p = JSON.parse(v1raw);
            if (p?.enabled === true) {
                const ts = Number(p?.nextRunAt);
                if (Number.isFinite(ts) && ts > Date.now()) {
                    return { nextRunAt: ts, enabled: true };
                }
            }
        }
    } catch {
        /* ignore */
    }
    return { nextRunAt: Date.now(), enabled: true };
}

/**
 * @param {Partial<{ nextRunAt: number, enabled: boolean }>} patch
 */
export function writeLeadSearchPipelineStorage(patch) {
    const prev = readLeadSearchPipelineStorage();
    const next = { ...prev, ...patch };
    if (!Number.isFinite(next.nextRunAt)) next.nextRunAt = Date.now();
    if (typeof next.enabled !== 'boolean') next.enabled = true;
    localStorage.setItem(LEAD_SEARCH_PIPELINE_STORAGE_KEY, JSON.stringify(next));
    try {
        window.dispatchEvent(new CustomEvent(LEAD_SEARCH_PIPELINE_SYNC_EVENT));
    } catch {
        /* ignore */
    }
}
