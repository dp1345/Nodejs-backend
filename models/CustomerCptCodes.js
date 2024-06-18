class CustomerCptCodes {
    constructor(db) {
        this.db = db;
    }

    async updateCustomerCptCodes(customerId, cptCodes) {
        try {
            // Delete the existing cpt code records if they exist
            const deleteSql = `
                DELETE FROM customer_cpt_codes
                WHERE customer_id = ?;
            `;
            await this.db.promise().execute(deleteSql, [customerId]);

            // If there are no new CPT codes, return early
            if (cptCodes.length === 0) {
                return { message: "Customer CPT codes updated successfully." };
            }

            // Prepare batch insert query
            const values = cptCodes.map(code => `(?, ?)`).join(',');
            const insertSql = `
                INSERT INTO customer_cpt_codes (customer_id, cpt_code)
                VALUES ${values};
            `;
            const params = cptCodes.reduce((acc, code) => acc.concat([customerId, code]), []);
            await this.db.promise().execute(insertSql, params);

            return { message: "Customer CPT codes updated successfully." };
        } catch (error) {
            console.log("Error:", error);
            throw error;
        }
    }

    async fetchCustomerCptCode(customerId) {
        try {
            // Fetch the cpt code for the customer from the database
            const fetchSql = `
                SELECT cpt_code FROM customer_cpt_codes
                WHERE customer_id = ?;
            `;
            const [rows] = await this.db.promise().execute(fetchSql, [customerId]);

            if (rows.length === 0) {
                return {
                    cpt_code: null,
                    message: "No CPT code found for this customer."
                };
            }

            return {
                cpt_code: rows[0].cpt_code,
                message: "Customer CPT code fetched successfully."
            };
        } catch (error) {
            throw error;
        }
    }

    async insertCustomerCptCode(customerId, cptCode) {
        try {
            // Insert the new cpt code for the customer
            const insertSql = `
                INSERT INTO customer_cpt_codes (customer_id, cpt_code)
                VALUES (?, ?);
            `;
            await this.db.promise().execute(insertSql, [customerId, cptCode]);

            return { message: "Customer CPT code inserted successfully." };
        } catch (error) {
            console.log("Error:", error);
            throw error;
        }
    }
}

export default CustomerCptCodes;
