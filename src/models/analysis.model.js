import pool from "../config/db.js";

class AnalysisModel {

    // ============================================
    // CREATE ANALYSIS
    // ============================================

    async createAnalysis(
        userId,
        businessId,
        analysisData
    ) {

        const result =
            await pool.query(
                `
                INSERT INTO analyses
                (
                    user_id,
                    business_id,
                    analysis_data
                )
                VALUES
                (
                    $1,
                    $2,
                    $3
                )
                RETURNING *
                `,
                [
                    userId,
                    businessId,
                    analysisData
                ]
            );

        return result.rows[0];
    }


    // ============================================
    // GET LATEST ANALYSIS
    // ============================================

    async getLatestAnalysisByBusinessId(
        userId,
        businessId
    ) {

        const result =
            await pool.query(
                `
                SELECT *
                FROM analyses
                WHERE user_id = $1
                AND business_id = $2
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [
                    userId,
                    businessId
                ]
            );

        return result.rows[0] || null;
    }


    // ============================================
    // GET ANALYSIS HISTORY
    // ============================================

    async getAnalysesByBusinessId(
        userId,
        businessId
    ) {

        const result =
            await pool.query(
                `
                SELECT *
                FROM analyses
                WHERE user_id = $1
                AND business_id = $2
                ORDER BY created_at DESC
                `,
                [
                    userId,
                    businessId
                ]
            );

        return result.rows;
    }

}

export default new AnalysisModel();