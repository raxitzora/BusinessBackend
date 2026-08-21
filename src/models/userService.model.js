import pool from "../config/db.js";

class UserServiceModel {

    // Assign a service to a user
    async assignService(userId, serviceId) {

        const query = `
            INSERT INTO user_services (user_id, service_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, service_id) DO NOTHING
            RETURNING *;
        `;

        const values = [userId, serviceId];

        const result = await pool.query(query, values);

        return result.rows[0];
    }

    // Get all selected services of a user
    async getUserServices(userId) {

        const query = `
            SELECT
                services.id,
                services.name,
                services.credit_cost
            FROM user_services
            INNER JOIN services
                ON user_services.service_id = services.id
            WHERE user_services.user_id = $1
            ORDER BY services.id;
        `;

        const result = await pool.query(query, [userId]);

        return result.rows;
    }

    // Remove all selected services
    async removeUserServices(userId) {

        const query = `
            DELETE FROM user_services
            WHERE user_id = $1;
        `;

        await pool.query(query, [userId]);

        return true;
    }

}

export default new UserServiceModel();