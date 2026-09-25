import pool from "../config/db.js";

class BusinessModel {

    // ================================
    // Create Single Business
    // ================================
    async createBusiness(data) {

        const query = `
            INSERT INTO businesses
            (
                user_id,
                business_name,
                category,
                address,
                phone,
                email,
                website,
                google_rating,
                review_count,
                google_maps_link,
                instagram,
                facebook,
                linkedin,
                area
            )

            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
            )

            ON CONFLICT (user_id, google_maps_link)
            DO UPDATE SET
                business_name = EXCLUDED.business_name,
                category = EXCLUDED.category,
                address = EXCLUDED.address,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                website = EXCLUDED.website,
                google_rating = EXCLUDED.google_rating,
                review_count = EXCLUDED.review_count,
                instagram = EXCLUDED.instagram,
                facebook = EXCLUDED.facebook,
                linkedin = EXCLUDED.linkedin,
                area = EXCLUDED.area

            RETURNING *;
        `;

        const values = [
            data.user_id,
            data.business_name,
            data.category,
            data.address,
            data.phone,
            data.email,
            data.website,
            data.google_rating,
            data.review_count,
            data.google_maps_link,
            data.instagram,
            data.facebook,
            data.linkedin,
            data.area || null
        ];

        const result =
            await pool.query(
                query,
                values
            );

        return result.rows[0];

    }


    // ================================
    // Bulk Create Businesses
    // ================================
    async createBusinesses(businesses) {

        if (!businesses.length) {
            return [];
        }

        const insertedBusinesses =
            await Promise.all(
                businesses.map((business) =>
                    this.createBusiness(
                        business
                    )
                )
            );

        return insertedBusinesses;

    }


    // ================================
    // Get Business By ID
    // ================================
    async getBusinessById(
        id,
        userId
    ) {

        const result =
            await pool.query(
                `
                SELECT *
                FROM businesses
                WHERE id = $1
                AND user_id = $2
                `,
                [
                    id,
                    userId
                ]
            );

        return result.rows[0];

    }


    // ================================
    // Get Businesses Of User
    // ================================
    async getBusinesses(
        userId,
        page = 1,
        limit = 20
    ) {

        const offset =
            (page - 1) * limit;

        const result =
            await pool.query(
                `
                SELECT *
                FROM businesses
                WHERE user_id = $1
                ORDER BY id DESC
                LIMIT $2
                OFFSET $3
                `,
                [
                    userId,
                    limit,
                    offset
                ]
            );

        return result.rows;

    }


    // ================================
    // Save Lead
    // ================================
    async saveLead(
        userId,
        businessId
    ) {

        const result =
            await pool.query(
                `
                INSERT INTO saved_leads
                (
                    user_id,
                    business_id
                )

                VALUES
                (
                    $1,
                    $2
                )

                ON CONFLICT (
                    user_id,
                    business_id
                )
                DO NOTHING

                RETURNING *;
                `,
                [
                    userId,
                    businessId
                ]
            );

        return result.rows[0] || null;
    }


    // ================================
    // Check Saved Lead
    // ================================
    async isLeadSaved(
        userId,
        businessId
    ) {

        const result =
            await pool.query(
                `
                SELECT id
                FROM saved_leads
                WHERE user_id = $1
                AND business_id = $2
                `,
                [
                    userId,
                    businessId
                ]
            );

        return result.rows.length > 0;
    }


    // ================================
    // Get Saved Leads
    // ================================
    async getSavedLeads(userId) {

        const result =
            await pool.query(
                `
                SELECT
                    b.*,
                    sl.id AS saved_lead_id,
                    sl.created_at AS saved_at

                FROM saved_leads sl

                INNER JOIN businesses b
                    ON b.id = sl.business_id

                WHERE sl.user_id = $1

                ORDER BY sl.created_at DESC
                `,
                [
                    userId
                ]
            );

        return result.rows;
    }


    // ================================
    // Remove Saved Lead
    // ================================
    async removeSavedLead(
        userId,
        businessId
    ) {

        const result =
            await pool.query(
                `
                DELETE FROM saved_leads

                WHERE user_id = $1
                AND business_id = $2

                RETURNING *;
                `,
                [
                    userId,
                    businessId
                ]
            );

        return result.rows[0] || null;
    }


    // ================================
    // Update Contact Information
    // ================================
    async updateBusinessContact(
        id,
        contact
    ) {

        const result =
            await pool.query(
                `
                UPDATE businesses

                SET

                phone = $1,
                email = $2,
                website = $3,
                instagram = $4,
                facebook = $5,
                linkedin = $6

                WHERE id = $7

                RETURNING *;
                `,
                [
                    contact.phone,
                    contact.email,
                    contact.website,
                    contact.instagram,
                    contact.facebook,
                    contact.linkedin,
                    id
                ]
            );

        return result.rows[0];

    }


    // ================================
    // Background Enrichment
    // ================================
    async enrichBusinessesInBackground(
        businesses
    ) {

        const CommonWorkflowService =
            (
                await import(
                    "../services/commonWorkflow/commonWorkflow.service.js"
                )
            ).default;

        for (
            const business
            of businesses
        ) {

            try {

                if (
                    business.website
                ) {
                    continue;
                }

                console.log(
                    `Enriching: ${business.business_name}`
                );

                const contact =
                    await CommonWorkflowService
                        .getBusinessContact(
                            business.google_maps_link
                        );

                await this.updateBusinessContact(
                    business.id,
                    contact
                );

                console.log(
                    `Finished: ${business.business_name}`
                );

            } catch (error) {

                console.error(
                    `Failed: ${business.business_name}`,
                    error.message
                );

            }

        }

    }


    // ================================
    // Create Search History
    // ================================
    async createSearchHistory(
        userId,
        keyword,
        location,
        businessesFound,
        areas = []
    ) {

        const result =
            await pool.query(
                `
                INSERT INTO search_history
                (
                    user_id,
                    keyword,
                    location,
                    businesses_found,
                    areas
                )

                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5::jsonb
                )

                RETURNING *;
                `,
                [
                    userId,
                    keyword,
                    location,
                    businessesFound,
                    JSON.stringify(areas)
                ]
            );

        return result.rows[0];

    }


    // ================================
    // Get Search History
    // ================================
    async getSearchHistory(
        userId,
        limit = 50
    ) {

        const result =
            await pool.query(
                `
                SELECT
                    id,
                    keyword,
                    location,
                    areas,
                    businesses_found,
                    created_at
                FROM search_history
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2;
                `,
                [
                    userId,
                    limit
                ]
            );

        return result.rows;

    }


    // ================================
    // Get Search History Count
    // ================================
    async getSearchHistoryCount(
        userId
    ) {

        const result =
            await pool.query(
                `
                SELECT COUNT(*)::INTEGER AS count
                FROM search_history
                WHERE user_id = $1;
                `,
                [userId]
            );

        return result.rows[0].count;

    }

}

export default new BusinessModel();