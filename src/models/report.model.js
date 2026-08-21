import pool from "../config/db.js";

class ReportModel {

    async createReport(data) {

        const query = `

        INSERT INTO reports
        (
            analysis_id,
            report_type,
            score,
            problems,
            recommendations,
            opportunity,
            cold_email
        )

        VALUES
        (
            $1,$2,$3,$4,$5,$6,$7
        )

        RETURNING *;

        `;

        const values = [

            data.analysis_id,
            data.report_type,
            data.score,
            JSON.stringify(data.problems),
            JSON.stringify(data.recommendations),
            data.opportunity,
            data.cold_email

        ];

        const result = await pool.query(query, values);

        return result.rows[0];

    }

}

export default new ReportModel();