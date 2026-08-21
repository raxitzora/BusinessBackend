import pool from "../config/db.js";

class AnalysisModel {

    async createAnalysis(userId, businessId) {

        const result = await pool.query(

            `INSERT INTO analyses
            (user_id,business_id)
            VALUES($1,$2)
            RETURNING *`,

            [userId, businessId]

        );

        return result.rows[0];
    }

}

export default new AnalysisModel();