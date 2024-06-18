import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export function generateToken(payload, secret, options) {
    return jwt.sign(payload, secret, options);
}

export async function hashPassword(password, saltRounds) {
    return await bcrypt.hash(password, saltRounds);
}

export function filterFetchedData(fetchedData, existingData) {
    const existingNumbers = new Set(
        existingData.map((item) => item.npi_number)
    );
    return fetchedData.filter((item) => !existingNumbers.has(item.number));
}
