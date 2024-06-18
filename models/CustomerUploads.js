class CustomerUploads {
    constructor(db) {
        this.db = db;
    }

    async uploadCustomerFile(customerId, file, comments) {
        try {
            // Insert the new file for the customer
            const insertSql = `
                INSERT INTO customer_uploads (customer_id, file, comments)
                VALUES (?, ?, ?);
            `;
            await this.db
                .promise()
                .execute(insertSql, [customerId, file, comments]);

            return { message: "File uploaded successfully." };
        } catch (error) {
            console.log("Error is", error);
            // throw error;
        }
    }

    async fetchCustomerFiles(customerId) {
        try {
            // Fetch the files for the customer from the database
            const fetchSql = `
                SELECT id, file, comments FROM customer_uploads
                WHERE customer_id = ?;
            `;
            const [rows] = await this.db
                .promise()
                .execute(fetchSql, [customerId]);

            if (rows.length === 0) {
                return {
                    files: [],
                    message: "No files found for this customer."
                };
            }

            return {
                files: rows,
                message: "Customer files fetched successfully."
            };
        } catch (error) {
            throw error;
        }
    }
}

export default CustomerUploads;
