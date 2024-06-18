import axios from "axios";

class CustomerInstitute {
    constructor(db) {
        this.db = db;
    }

    async addCustomerInstitutes(customerId, npiNumbers) {
        try {
            // Delete existing institutes for the customer
            const deleteSql = `
                DELETE FROM customer_institutes
                WHERE customer_id = ?;
            `;
            await this.db.promise().execute(deleteSql, [customerId]);

            // Check if there are NPI numbers to add
            if (npiNumbers.length > 0) {
                // Prepare the INSERT query
                const insertSql = `
                    INSERT INTO customer_institutes (customer_id, npi_number)
                    VALUES ?;
                `;
                const values = npiNumbers.map((npiNumber) => [
                    customerId,
                    npiNumber
                ]);

                // Execute the INSERT query
                await this.db.promise().query(insertSql, [values]);
            }

            return { message: "Institutes updated successfully." };
        } catch (error) {
            console.log("error in ins is", error);
            // throw error;
        }
    }

    async fetchCustomerInstitutesWithDetails(customerId) {
        try {
            // Fetch NPI numbers for the customer from the database
            const fetchSql = `
                SELECT npi_number FROM customer_institutes
                WHERE customer_id = ?;
            `;
            const [institutes] = await this.db
                .promise()
                .execute(fetchSql, [customerId]);

            // Use the NPI public API to fetch details for each institute
            const instituteDetailsPromises = institutes.map(
                async (institute) => {
                    const response = await axios.get(
                        `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-2&number=${institute.npi_number}`
                    );
                    return response.data.results
                        ? response.data.results[0]
                        : null; // Assuming you want the first result
                }
            );

            // Await all the API calls
            const instituteDetails = await Promise.all(
                instituteDetailsPromises
            );

            // Filter out any null responses (in case some institutes weren't found)
            return instituteDetails.filter((detail) => detail !== null);
        } catch (error) {
            throw error;
        }
    }

    async fetchCustomerInstitutes(customerId) {
        try {
            // Fetch NPI numbers for the customer from the database
            const fetchSql = `
                SELECT npi_number FROM customer_institutes
                WHERE customer_id = ?;
            `;
            const [institutes] = await this.db
                .promise()
                .execute(fetchSql, [customerId]);

            return institutes;
        } catch (error) {
            throw error;
        }
    }
}

export default CustomerInstitute;
