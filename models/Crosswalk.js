class Crosswalk {
    constructor(db) {
        this.db = db;
    }

    /**
     * Search in the crosswalk table by a given field and value.
     *
     * @param {string} fieldName - The name of the field to search by (e.g., 'cpt_code').
     * @param {string} fieldValue - The value to search for in the specified field.
     * @returns {Promise<Array>} - A promise that resolves to the array of results.
     */
    async searchBy(fieldName, fieldValue) {
        if (!["id", "cpt_code", "taxonomy_code"].includes(fieldName)) {
            throw new Error(
                "Invalid field name. Please use 'id', 'cpt_code', or 'taxonomy_code'."
            );
        }

        try {
            const [results] = await this.db
                .promise()
                .execute(`SELECT * FROM crosswalk WHERE ${fieldName} = ?`, [
                    fieldValue
                ]);

            return results;
        } catch (error) {
            throw error;
        }
    }
}

export default Crosswalk;
