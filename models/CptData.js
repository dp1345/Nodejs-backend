class CptData {
    constructor(db) {
        this.db = db;
    }

    async fetchDistinctValues(fieldName) {
        try {
            const fetchSql = `
                SELECT ${this.db.escapeId(
                    fieldName
                )} AS field, COUNT(${this.db.escapeId(fieldName)}) AS count
                FROM cpt_data
                WHERE ${this.db.escapeId(
                    fieldName
                )} IS NOT NULL AND TRIM(${this.db.escapeId(fieldName)}) <> ''
                GROUP BY ${this.db.escapeId(fieldName)};
            `;

            const [rows] = await this.db.promise().execute(fetchSql);

            return {
                values: rows.map((row) => ({
                    value: row.field, // This corresponds to the alias "field" in the SELECT statement
                    count: row.count // This corresponds to the alias "count" in the SELECT statement
                })),
                message: `Distinct values and counts for ${fieldName} fetched successfully.`
            };
        } catch (error) {
            if (error.code === "ER_BAD_FIELD_ERROR") {
                throw new Error(
                    `The field "${fieldName}" does not exist in the database.`
                );
            } else {
                throw error;
            }
        }
    }

    async fetchCodesAndDescription(page, pageSize) {
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        try {
            // Query to count total entries
            const countSql = `SELECT COUNT(*) AS total FROM cpt_data;`;
            const [countRows] = await this.db.promise().execute(countSql);
            const totalEntries = countRows[0].total;
            const totalPages = Math.ceil(totalEntries / pageSize);

            // Query to fetch paginated data
            const fetchSql = `
                SELECT id, code, description FROM cpt_data LIMIT ${offset}, ${limit};
            `;
            const [rows] = await this.db.promise().execute(fetchSql);

            if (rows.length === 0) {
                return {
                    data: null,
                    totalPages,
                    message: "No CPT data found."
                };
            }

            return {
                data: rows,
                totalPages,
                message: "Basic CPT data fetched successfully."
            };
        } catch (error) {
            throw error;
        }
    }

    async fetchCodeOrDescription(query, page, pageSize, sortOrder) {
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        const countSql = `
            SELECT COUNT(*) AS total FROM cpt_data
            WHERE code = ? OR description LIKE ?;
        `;

        const fetchSql = `
            SELECT * FROM cpt_data
            WHERE code = ? OR description LIKE ?
            ORDER BY code ${sortOrder} 
            LIMIT ${offset}, ${limit};
        `;

        try {
            const [totalResult] = await this.db
                .promise()
                .execute(countSql, [query, `%${query}%`]);
            const totalEntries = totalResult[0].total;
            const totalPages = Math.ceil(totalEntries / pageSize);

            const [rows] = await this.db
                .promise()
                .execute(fetchSql, [query, `%${query}%`]);

            if (rows.length === 0) {
                return {
                    data: null,
                    totalPages,
                    message: "No CPT data found for this query."
                };
            }

            return {
                data: rows,
                totalPages,
                message: "CPT data fetched successfully."
            };
        } catch (error) {
            throw error;
        }
    }

    async filterDataByField(
        filterField,
        filterValue,
        sortOrder,
        page,
        pageSize
    ) {
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);

        // Dynamically insert the field name into the SQL queries using template literals
        const countSql = `
            SELECT COUNT(*) AS total FROM cpt_data
            WHERE ${filterField} LIKE ?;
        `;
        const fetchSql = `
            SELECT * FROM cpt_data
            WHERE ${filterField} LIKE ?
            ORDER BY ${filterField} ${sortOrder}
            LIMIT ${offset}, ${limit};
        `;

        try {
            // Execute the count query to find the total number of entries matching the filter
            const [countResult] = await this.db
                .promise()
                .execute(countSql, [`%${filterValue}%`]);
            const totalEntries = countResult[0].total;
            const totalPages = Math.ceil(totalEntries / pageSize);

            // Execute the fetch query to get the actual data
            const [rows] = await this.db
                .promise()
                .execute(fetchSql, [`%${filterValue}%`]);

            if (rows.length === 0) {
                return {
                    data: null,
                    totalPages,
                    message: `No CPT data found for the specified ${filterField}.`
                };
            }

            return {
                data: rows,
                totalPages,
                message: `CPT data filtered by ${filterField} fetched successfully.`
            };
        } catch (error) {
            throw error;
        }
    }

    async fetchData({
        filterField = "",
        filterValue = "",
        query = "",
        sortOrder = "ASC",
        page = 1,
        pageSize = 10
    } = {}) {
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const limit = parseInt(pageSize);
        const whereClauses = [];
        const params = [];

        if (filterField && filterValue) {
            whereClauses.push(`${this.db.escapeId(filterField)} LIKE ?`);
            params.push(`%${filterValue}%`);
        }

        if (query) {
            whereClauses.push(`(code = ? OR description LIKE ?)`);
            params.push(query, `%${query}%`);
        }

        const whereClause = whereClauses.length
            ? `WHERE ${whereClauses.join(" AND ")}`
            : "";
        const countSql = `SELECT COUNT(*) AS total FROM cpt_data ${whereClause};`;
        const fetchSql = `SELECT * FROM cpt_data ${whereClause} ORDER BY ${
            filterField ? this.db.escapeId(filterField) : "id"
        } ${sortOrder} LIMIT ${offset}, ${limit};`;

        try {
            const [countResult] = await this.db
                .promise()
                .execute(countSql, params);
            const totalEntries = countResult[0].total;
            const totalPages = Math.ceil(totalEntries / pageSize);

            const [rows] = await this.db.promise().execute(fetchSql, params);
            if (rows.length === 0) {
                return {
                    data: null,
                    totalPages,
                    message: "No CPT data found."
                };
            }

            return {
                data: rows,
                totalPages,
                message: "CPT data fetched successfully."
            };
        } catch (error) {
            throw error;
        }
    }
}

export default CptData;
