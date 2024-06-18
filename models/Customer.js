class Customer {
    constructor(db) {
        this.db = db;
    }

    async create(data) {
        try {
            const [result] = await this.db
                .promise()
                .execute(
                    "INSERT INTO customers (first_name, middle_name, last_name, email, password, phone_number, npi_number, city, taxonomy_description, taxonomy_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        data.first_name,
                        data.middle_name,
                        data.last_name,
                        data.email,
                        data.password,
                        data.phone_number,
                        data.npi_number,
                        data.city,
                        data.taxonomy_description,
                        data.taxonomy_code
                    ]
                );

            const customerId = result.insertId;

            // Insert into customer_progress table
            await this.db.promise().execute(
                "INSERT INTO customer_progress (customer_id, latest_step) VALUES (?, ?)",
                [customerId, 1] // Set latest_step to 1 by default
            );

            return result;
        } catch (error) {
            throw error;
        }
    }

    async findByEmail(email) {
        try {
            // Check if the connection is ready
            if (!this.db || this.db.state === "disconnected") {
                throw new Error("Database connection is not established");
            }

            const [rows] = await this.db
                .promise()
                .execute("SELECT * FROM customers WHERE email = ? LIMIT 1", [
                    email
                ]);

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw error;
        }
    }

    async findById(id) {
        try {
            // Check if the connection is ready
            if (!this.db || this.db.state === "disconnected") {
                throw new Error("Database connection is not established");
            }

            const [rows] = await this.db
                .promise()
                .execute(
                    "SELECT c.*, cp.latest_step as latest_step FROM customers c LEFT JOIN customer_progress cp on (c.id = cp.customer_id) WHERE c.id = ? LIMIT 1",
                    [id]
                );

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw error;
        }
    }

    async verifyOtp(email, otp) {
        try {
            const [rows] = await this.db
                .promise()
                .execute(
                    "SELECT otp, otp_created_at FROM customers WHERE email = ? LIMIT 1",
                    [email]
                );

            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw error;
        }
    }

    async updateCustomerFields(customerId, fieldsToUpdate) {
        const entries = Object.entries(fieldsToUpdate);
        const setClause = entries.map(([key, _]) => `${key} = ?`).join(", ");
        const sql = `UPDATE customers SET ${setClause} WHERE id = ?`;
        const values = [...entries.map(([_, value]) => value), customerId];

        try {
            const [result] = await this.db.promise().execute(sql, values);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

export default Customer;
