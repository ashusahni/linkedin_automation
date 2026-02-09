import pool from '../db.js';

export const ConnectionService = {
    // Sync Connections (step 1 of SOW)
    // Accepts array of connection objects from PhantomBuster or CSV
    async syncConnections(connections) {
        let newCount = 0;
        let updatedCount = 0;

        for (const conn of connections) {
            // Upsert
            const result = await pool.query(`
        INSERT INTO audit_connections (linkedin_id, name, title, company, profile_url, connected_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (linkedin_id) 
        DO UPDATE SET 
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          updated_at = NOW()
        RETURNING id;
      `, [conn.id || conn.linkedinProfileUrl, conn.fullName, conn.title, conn.company, conn.linkedinProfileUrl]);

            // In a real app we'd differentiate insert vs update
            newCount++;
        }

        return { newCount, updatedCount };
    },

    async getConnections(limit = 100, offset = 0) {
        const result = await pool.query(
            "SELECT * FROM audit_connections ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            [limit, offset]
        );
        return result.rows;
    },

    async simulateSync() {
        const mockConns = [
            { id: 'sim_1', fullName: 'Satya Nadella', title: 'CEO', company: 'Microsoft', linkedinProfileUrl: 'https://linkedin.com/in/satyanadella' },
            { id: 'sim_2', fullName: 'Sundar Pichai', title: 'CEO', company: 'Google', linkedinProfileUrl: 'https://linkedin.com/in/sundarpichai' },
            { id: 'sim_3', fullName: 'Sam Altman', title: 'CEO', company: 'OpenAI', linkedinProfileUrl: 'https://linkedin.com/in/samaltman' }
        ];

        return await this.syncConnections(mockConns);
    }
};
