class CustomerProgress {
    constructor(db) {
        this.db = db;
    }

    async updateCustomerProgress(customerId, latestStep) {
        try {
            // Delete the existing progress record if it exists
            const deleteSql = `
                DELETE FROM customer_progress
                WHERE customer_id = ?;
            `;
            await this.db.promise().execute(deleteSql, [customerId]);

            // Insert the new step for the customer
            const insertSql = `
                INSERT INTO customer_progress (customer_id, latest_step)
                VALUES (?, ?);
            `;
            await this.db
                .promise()
                .execute(insertSql, [customerId, latestStep]);

            return { message: "Customer progress updated successfully." };
        } catch (error) {
            console.log("error is", error);
            // throw error;
        }
    }

    async fetchCustomerProgress(customerId) {
        try {
            // Fetch the latest step for the customer from the database
            const fetchSql = `
                SELECT latest_step FROM customer_progress
                WHERE customer_id = ?;
            `;
            const [rows] = await this.db
                .promise()
                .execute(fetchSql, [customerId]);

            if (rows.length === 0) {
                return {
                    latest_step: null,
                    message: "No progress found for this customer."
                };
            }

            return {
                latest_step: rows[0].latest_step,
                message: "Customer progress fetched successfully."
            };
        } catch (error) {
            throw error;
        }
    }
}

export default CustomerProgress;
