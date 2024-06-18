class CustomerManualInstitute {
    constructor(db) {
        this.db = db;
    }

    async addManualInstitute(customerId, name, zipcode) {
        try {
            const sql = `
                INSERT INTO customer_manual_institutes (customer_id, name, zipcode)
                VALUES (?, ?, ?);
            `;
            const values = [customerId, name, zipcode];
            const [result] = await this.db.promise().execute(sql, values);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async deleteManualInstitutes(customerId, ids) {
        try {
            // Prepare the question marks for parameterized query, one for each id
            const questionMarks = ids.map(() => "?").join(", ");
            // The SQL statement for deletion
            const sql = `
                DELETE FROM customer_manual_institutes
                WHERE customer_id = ? AND id IN (${questionMarks});
            `;
            // The first parameter is the customerId followed by all ids
            const values = [customerId, ...ids];
            // Execute the SQL statement with the parameters
            const [result] = await this.db.promise().execute(sql, values);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async fetchManualInstitutesByCustomerId(customerId) {
        try {
            const sql = `
                SELECT id, name, zipcode FROM customer_manual_institutes
                WHERE customer_id = ?;
            `;
            const [rows] = await this.db.promise().execute(sql, [customerId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

export default CustomerManualInstitute;
