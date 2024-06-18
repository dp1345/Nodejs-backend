import axios from "axios";
import bcrypt from "bcrypt";
import "dotenv/config";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import { CPT_SEARCH_RESULTS_PER_PAGE } from "../constants/common.js";
import upload from "../middleware/multer.js";
import uploadToS3 from "../middleware/multer.js";
import CptData from "../models/CptData.js";
import Crosswalk from "../models/Crosswalk.js";
import Customer from "../models/Customer.js";
import CustomerInstitute from "../models/CustomerInstitute.js";
import CustomerManualInstitute from "../models/CustomerManualInstitute.js";
import CustomerProgress from "../models/CustomerProgress.js";
import CustomerUploads from "../models/CustomerUploads.js";
import CustomerCptCodes from "../models/CustomerCptCodes.js";

import {
    filterFetchedData,
    generateToken,
    hashPassword
} from "../utils/commonFunctions.js";

const customerModel = new Customer(pool);
const crosswalkModel = new Crosswalk(pool);
const customerInstituteModel = new CustomerInstitute(pool);
const customerManualInstituteModel = new CustomerManualInstitute(pool);
const customerProgressModel = new CustomerProgress(pool);
const customerUploadsModel = new CustomerUploads(pool);
const cptDataModel = new CptData(pool);
const customerCptCodesModel = new CustomerCptCodes(pool);

export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await customerModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        delete user.password;

        res.json(user);
    } catch (error) {
        console.log("Error fetching data:", error.message);
        res.status(500).json({
            message: "Server error",
            error: "Internal error occurred."
        });
    }
};

export const getDataUsingNpi = async (req, res) => {
    const { number } = req.query;
    try {
        const response = await axios.get(
            `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${number}`
        );
        res.json(response.data);
    } catch (error) {
        console.log("Error fetching data:", error.message);
        res.status(500).json({
            message: "Error fetching data from NPI Registry",
            error: "Internal error occurred."
        });
    }
};

export const getCustomerInstitutesDetails = async (req, res) => {
    const { customerId } = req.body;

    if (!customerId) {
        return res.status(400).json({ message: "Customer ID is required." });
    }

    try {
        const institutesDetails =
            await customerInstituteModel.fetchCustomerInstitutesWithDetails(
                customerId
            );
        const manualInstitutes =
            await customerManualInstituteModel.fetchManualInstitutesByCustomerId(
                customerId
            );

        res.json({ npiInstitutes: institutesDetails, manualInstitutes });
    } catch (error) {
        console.log(
            "Error fetching customer's institutes details:",
            error.message
        );
        res.status(500).json({
            message: "Error fetching customer's institutes details",
            error: "Internal error occurred."
        });
    }
};

export const getNpiInstitutesByCityAndTaxonomy = async (req, res) => {
    const { customerId, city, taxonomy_description } = req.body;

    if (!customerId || !city || !taxonomy_description) {
        return res.status(400).json({
            message:
                "Customer ID, 'city' and 'taxonomy_description' fields are required and cannot be empty."
        });
    }

    try {
        const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&enumeration_type=NPI-2&taxonomy_description=${encodeURIComponent(
            taxonomy_description
        )}&city=${encodeURIComponent(city)}`;
        const response = await axios.get(url);

        const institutes = await customerInstituteModel.fetchCustomerInstitutes(
            customerId
        );
        const fetchedData = response.data.results;
        const result = filterFetchedData(fetchedData, institutes);

        res.json(result);
    } catch (error) {
        console.log("Error fetching data:", error.message);
        res.status(500).json({
            message: "Error fetching data from NPI Registry",
            error: "Internal error occurred."
        });
    }
};

export const searchData = async (req, res) => {
    const { npi, instituteName, postalCode } = req.query;

    let apiUrl = "https://npiregistry.cms.hhs.gov/api/?version=2.1";

    if (npi) {
        apiUrl += `&enumeration_type=NPI-2&number=${npi}`;
    } else if (instituteName && postalCode) {
        apiUrl += `&enumeration_type=NPI-2&organizationName=${encodeURIComponent(
            instituteName
        )}&postal_code=${postalCode}`;
    } else {
        return res.status(400).json({
            message:
                "Please provide an NPI number or both institute name (as instituteName) and zipcode."
        });
    }

    try {
        const response = await axios.get(apiUrl);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching data:", error.message);
        res.status(500).json({
            message: "Error fetching data from NPI Registry",
            error: "Internal error occurred."
        });
    }
};

export const postExample = (req, res) => {
    const { data } = req.body;
    res.json({ message: "Received your data!", data });
};

export const getLastTenCustomers = async (req, res) => {
    try {
        const [rows] = await connection
            .promise()
            .query("SELECT * FROM customers ORDER BY id DESC LIMIT 10");
        res.json(rows);
    } catch (error) {
        console.log("Error fetching customers:", error.message);
        res.status(500).json({
            message: "Error fetching customers",
            error: "Internal error occurred."
        });
    }
};

export const createCustomer = async (req, res) => {
    try {
        const {
            email,
            password,
            first_name,
            last_name,
            middle_name = "",
            phone_number,
            npi_number,
            city,
            taxonomy_description,
            taxonomy_code
        } = req.body;

        if (
            !email ||
            !password ||
            !first_name ||
            !last_name ||
            !phone_number ||
            !npi_number ||
            !city ||
            !taxonomy_description ||
            !taxonomy_code
        ) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }

        const existingUser = await customerModel.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "Email already exists." });
        }

        const hashedPassword = await hashPassword(password, 10);

        const userData = {
            first_name,
            middle_name,
            last_name,
            email,
            password: hashedPassword,
            phone_number,
            npi_number,
            city,
            taxonomy_description,
            taxonomy_code
        };

        const result = await customerModel.create(userData);

        const { password: pwd, ...customerWithoutPassword } = userData;
        customerWithoutPassword.id = result.insertId;

        const token = generateToken(
            { id: result.insertId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.log("Error creating customer:", error.message);
        res.status(500).json({
            message: "Error creating customer",
            error: "Internal error occurred."
        });
    }
};

export const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        const customer = await customerModel.findByEmail(email);
        if (!customer) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Invalid email or password." });
        }

        const token = generateToken(
            { id: customer.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.log("Error logging in customer:", error.message);
        res.status(500).json({
            message: "Error logging in",
            error: "Internal error occurred."
        });
    }
};

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE.toLowerCase() === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const customer = await customerModel.findByEmail(email);

        if (!customer || customer.active !== 1) {
            return res
                .status(404)
                .json({ message: "User not found or not active." });
        }

        const otp = Math.floor(1000 + Math.random() * 9000);

        await customerModel.updateCustomerFields(customer.id, {
            otp: otp,
            otp_created_at: new Date()
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset",
            html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. This OTP is valid for 30 minutes.</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log("Error sending email:", error);
                return res.status(500).json({
                    message: "Failed to send email",
                    error: "Internal error occurred."
                });
            } else {
                return res
                    .status(200)
                    .json({ message: "Email sent successfully" });
            }
        });
    } catch (error) {
        console.log("Error handling forgot password:", error.message);
        res.status(500).json({
            message: "Error handling forgot password",
            error: "Internal error occurred."
        });
    }
};

export const checkOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const customer = await customerModel.findByEmail(email);

        if (!customer) {
            return res.status(404).json({ message: "User not found." });
        }

        if (!customer.otp || customer.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP." });
        }

        return res.status(200).json({ message: "OTP is valid." });
    } catch (error) {
        console.log("Error verifying OTP:", error.message);
        res.status(500).json({
            message: "Error verifying OTP",
            error: "Internal error occurred."
        });
    }
};

export const changePassword = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
            message: "New password must be at least 8 characters long."
        });
    }

    try {
        const customer = await customerModel.findByEmail(email);
        if (!customer) {
            return res.status(404).json({ message: "User not found." });
        }

        const hashedPassword = await hashPassword(newPassword, 10);

        await customerModel.updateCustomerFields(customer.id, {
            password: hashedPassword
        });

        return res
            .status(200)
            .json({ message: "Password updated successfully." });
    } catch (error) {
        console.log("Error changing password:", error.message);
        res.status(500).json({
            message: "Error changing password",
            error: "Internal error occurred."
        });
    }
};

export const addCustomerInstitutes = async (req, res) => {
    const { customerId, npiNumbers } = req.body;

    if (!customerId) {
        return res.status(400).json({ message: "Missing customer ID." });
    }

    try {
        await customerInstituteModel.addCustomerInstitutes(
            customerId,
            npiNumbers
        );
        await customerProgressModel.updateCustomerProgress(customerId, 2);

        res.status(201).json({
            message: "Institutes and progress updated successfully."
        });
    } catch (error) {
        console.error("Error in operation:", error.message);
        res.status(500).json({
            message: "Failed to update institutes or progress."
        });
    }
};

export const addManualInstitute = async (req, res) => {
    const { customerId, name, zipcode } = req.body;

    if (!customerId || !name || !zipcode) {
        return res.status(400).json({
            message: "Missing required fields: customerId, name, and zipcode."
        });
    }

    try {
        const result = await customerManualInstituteModel.addManualInstitute(
            customerId,
            name,
            zipcode
        );

        if (result.affectedRows > 0) {
            res.status(201).json({
                message: "Manual institute added successfully."
            });
        } else {
            res.status(400).json({
                message: "Failed to add the manual institute."
            });
        }
    } catch (error) {
        console.log("Error adding manual institute:", error.message);
        res.status(500).json({
            message: "Error adding manual institute",
            error: "Internal error occurred."
        });
    }
};

export const updateManualInstitutes = async (req, res) => {
    const { customerId, ids } = req.body;

    if (!customerId || !ids || ids.length === 0) {
        return res.status(400).json({
            message: "Missing required fields: customerId, or ids is empty."
        });
    }

    try {
        const result =
            await customerManualInstituteModel.deleteManualInstitutes(
                customerId,
                ids
            );

        if (result.affectedRows > 0) {
            res.json({
                message: `${result.affectedRows} manual institute(s) deleted successfully.`
            });
        } else {
            res.status(404).json({
                message: "No manual institutes found for the specified ids."
            });
        }
    } catch (error) {
        console.log("Error updating manual institutes:", error.message);
        res.status(500).json({
            message: "Error updating manual institutes",
            error: "Internal error occurred."
        });
    }
};

export const fetchCptData = async (req, res) => {
    try {
        const categoriesPromise = cptDataModel.fetchDistinctValues("category");
        const subCategoriesPromise =
            cptDataModel.fetchDistinctValues("sub_category");
        const anatomiesPromise = cptDataModel.fetchDistinctValues("anatomy");

        const [categoriesResult, subCategoriesResult, anatomiesResult] =
            await Promise.all([
                categoriesPromise,
                subCategoriesPromise,
                anatomiesPromise
            ]);

        res.json({
            categories: categoriesResult.values,
            subCategories: subCategoriesResult.values,
            anatomies: anatomiesResult.values,
            message: "Distinct values fetched successfully."
        });
    } catch (error) {
        console.log("Error fetching distinct values:", error.message);
        res.status(500).json({
            message: "Error fetching distinct values",
            error: error.message
        });
    }
};

export const fetchBasicCptData = async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let pageSize = parseInt(req.query.pageSize) || CPT_SEARCH_RESULTS_PER_PAGE;

    try {
        const basicDataResult = await cptDataModel.fetchCodesAndDescription(
            page,
            pageSize
        );

        if (!basicDataResult.data) {
            return res.status(404).json({ message: "No CPT data found." });
        }

        res.json({
            data: basicDataResult.data,
            totalPages: basicDataResult.totalPages,
            message: basicDataResult.message
        });
    } catch (error) {
        console.log("Error fetching basic CPT data:", error.message);
        res.status(500).json({
            message: "Error fetching basic CPT data",
            error: "Internal error occurred."
        });
    }
};

export const searchCptData = async (req, res) => {
    const query = req.query.q || "";
    const sortOrder = req.query.order || "ASC";
    let page = parseInt(req.query.page) || 1;
    let pageSize = parseInt(req.query.pageSize) || CPT_SEARCH_RESULTS_PER_PAGE;

    try {
        const searchResults = await cptDataModel.fetchCodeOrDescription(
            query,
            page,
            pageSize,
            sortOrder
        );

        if (!searchResults.data) {
            return res.status(404).json({
                message: "No CPT data found for this query.",
                totalPages: searchResults.totalPages
            });
        }

        res.json({
            data: searchResults.data,
            totalPages: searchResults.totalPages,
            message: searchResults.message
        });
    } catch (error) {
        console.log("Error searching CPT data:", error.message);
        res.status(500).json({
            message: "Error searching CPT data",
            error: "Internal error occurred."
        });
    }
};

export const filterCptData = async (req, res) => {
    const fieldName = req.query.fieldName;
    const fieldValue = req.query.fieldValue;
    const sortOrder = req.query.order || "ASC";
    let page = parseInt(req.query.page) || 1;
    let pageSize = parseInt(req.query.pageSize) || CPT_SEARCH_RESULTS_PER_PAGE;

    try {
        const categoryResults = await cptDataModel.filterDataByField(
            fieldName,
            fieldValue,
            sortOrder,
            page,
            pageSize
        );

        if (!categoryResults.data) {
            return res.status(404).json({
                message: "No CPT data found for the specified category.",
                totalPages: categoryResults.totalPages
            });
        }

        res.json({
            data: categoryResults.data,
            totalPages: categoryResults.totalPages,
            message: categoryResults.message
        });
    } catch (error) {
        console.log("Error fetching category data:", error.message);
        res.status(500).json({
            message: "Error fetching category data",
            error: "Internal error occurred."
        });
    }
};

export const fetchGeneralCptData = async (req, res) => {
    const {
        searchTerm,
        fieldName,
        fieldValue,
        order = "ASC",
        page = 1,
        pageSize = CPT_SEARCH_RESULTS_PER_PAGE
    } = req.query;

    const options = {
        filterField: fieldName,
        filterValue: fieldValue,
        query: searchTerm,
        sortOrder: order,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
    };

    try {
        let results = await cptDataModel.fetchData(options);

        const categoriesPromise = cptDataModel.fetchDistinctValues("category");
        const subCategoriesPromise =
            cptDataModel.fetchDistinctValues("sub_category");
        const anatomiesPromise = cptDataModel.fetchDistinctValues("anatomy");

        const [categoriesResult, subCategoriesResult, anatomiesResult] =
            await Promise.all([
                categoriesPromise,
                subCategoriesPromise,
                anatomiesPromise
            ]);

        let distinctValues = {
            categories: categoriesResult.values,
            subCategories: subCategoriesResult.values,
            anatomies: anatomiesResult.values
        };

        if (!results.data) {
            return res.status(404).json({
                message: "No CPT data found.",
                totalPages: results.totalPages || 0
            });
        }

        res.json({
            data: results.data,
            counts: distinctValues,
            totalPages: results.totalPages || 0,
            message: results.message
        });
    } catch (error) {
        console.log("Error:", error.message);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

export const buildCodes = async (req, res) => {
    try {
        const userData = await customerModel.findById(req.user.id);

        if (!userData) {
            return res.status(404).json({
                message: "No user data found."
            });
        }

        let userNpiNumber = userData.npi_number;
        let userTaxonomyCode = userData.taxonomy_code;

        userNpiNumber = 1306064696;
        userTaxonomyCode = "213E00000X";
        userTaxonomyCode = "207U00000X";

        let userDataFromCms = await fetchCptDataFromCms(userNpiNumber);

        if (userDataFromCms.length > 0) {
            const filteredData = userDataFromCms.map((item) => ({
                CPT_CODE: item.HCPCS_Cd,
                DESCRIPTION: item.HCPCS_Desc,
                PLACE_OF_SERVICE: item.Place_Of_Srvc
            }));

            return res.send({
                data: filteredData
            });
        } else {
            const crosswalkData = await crosswalkModel.searchBy(
                "taxonomy_code",
                userTaxonomyCode
            );
            const formattedCrosswalkData = crosswalkData.map((code) => ({
                CPT_CODE: code.cpt_code,
                DESCRIPTION: "",
                PLACE_OF_SERVICE: ""
            }));

            return res.send({ data: formattedCrosswalkData });
        }
    } catch (error) {
        console.log("Error fetching CPT data:", error.message);
        return res.status(500).json({
            message: "Error fetching CPT data",
            error: "Internal error occurred."
        });
    }
};

async function fetchCptDataFromCms(npiNumber) {
    const url = `https://data.cms.gov/data-api/v1/dataset/5c67d835-3862-4f63-897d-85d3eac82d5b/data-viewer?size=10&offset=0&keyword=${encodeURIComponent(
        npiNumber
    )}`;

    try {
        const response = await axios.get(url);
        const { data, meta } = response.data;

        const headers = meta.headers;
        const dataRows = data;

        const formattedData = dataRows.map((row) => {
            let item = {};
            headers.forEach((header, index) => {
                item[header] = row[index];
            });
            return item;
        });

        return formattedData;
    } catch (error) {
        console.log("Error fetching CPT data from CMS:", error.message);
        throw error;
    }
}

export const updateCptCodes = async (req, res) => {
    const cptCodesString = req.body.cptCodes || "";
    const codeBuilderApproach = req.body.codeBuilderApproach || "";

    try {
        const userId = req.user.id;
        const user = await customerModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const cptCodes = cptCodesString.split(", ").map((code) => code.trim());

        // Update customer CPT codes
        await customerCptCodesModel.updateCustomerCptCodes(userId, cptCodes);

        // Update the code builder approach if provided
        let updatedData = {};
        if (codeBuilderApproach) {
            updatedData.code_builder_approach = codeBuilderApproach;
            await customerModel.updateCustomerFields(userId, updatedData);
        }

        // Update customer progress
        await customerProgressModel.updateCustomerProgress(userId, 3); // latest step will be one more than last step

        return res
            .status(200)
            .json({ message: "CPT codes updated successfully." });
    } catch (error) {
        console.log("Error updating CPT codes:", error.message);
        res.status(500).json({
            message: "Error updating CPT codes",
            error: "Internal error occurred."
        });
    }
};

export const getCptCodeOptions = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await customerModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const taxonomyCode = user.taxonomy_code;
        if (!taxonomyCode) {
            return res
                .status(400)
                .json({ message: "Taxonomy code not found for user" });
        }

        const results = await crosswalkModel.searchBy(
            "taxonomy_code",
            taxonomyCode
        );
        const cptCodes = results.map((result) => result.cpt_code);

        if (!cptCodes || cptCodes.length === 0) {
            return res.status(404).json({
                message: "No CPT codes found for the given taxonomy code"
            });
        }

        res.json({ data: cptCodes });
    } catch (error) {
        console.error("Error fetching data:", error.message);
        res.status(500).json({
            message: "Server error",
            error: "Internal error occurred."
        });
    }
};

export const uploadFile = (req, res) => {
    uploadToS3(req, res, (err) => {
        if (err) {
            res.status(400).json({ message: err });
        } else {
            if (req.file == undefined) {
                res.status(400).json({ message: "No file selected" });
            } else {
                (async function () {
                    await customerUploadsModel.uploadCustomerFile(
                        req.user.id,
                        req.file.location,
                        "chargemaster"
                    );
                })().then(() => {
                    res.status(200).json({
                        message: "File uploaded successfully"
                        // fileUrl: req.file.location // Use the S3 file URL
                    });
                });
            }
        }
    });
};
