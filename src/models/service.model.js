import pool from "../config/db.js";

class ServiceModel {

    async getAllServices() {

        const result = await pool.query(
            `SELECT * FROM services
             ORDER BY id ASC`
        );

        return result.rows;
    }

    async getServiceById(id) {

        const result = await pool.query(
            `SELECT * FROM services
             WHERE id=$1`,
            [id]
        );

        return result.rows[0];
    }

}

export default new ServiceModel();