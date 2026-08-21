    import pool from "../config/db.js";

    class UserModel {

async createOrUpdateUser(clerkId, fullName, email) {

    const result = await pool.query(
        `
        INSERT INTO users
        (
            clerk_id,
            full_name,
            email
        )

        VALUES
        (
            $1,$2,$3
        )

        ON CONFLICT (clerk_id)

        DO UPDATE

        SET

        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email

        RETURNING *;
        `,
        [
            clerkId,
            fullName,
            email
        ]
    );

    return result.rows[0];

}

        async getUserByClerkId(clerkId) {

            const result = await pool.query(
                `SELECT * FROM users WHERE clerk_id=$1`,
                [clerkId]
            );

            return result.rows[0];
        }

        async updateCredits(userId, credits) {

            const result = await pool.query(
                `UPDATE users
                SET credits=$1
                WHERE id=$2
                RETURNING *`,
                [credits, userId]
            );

            return result.rows[0];
        }

    }

    export default new UserModel();