import express from "express";
import { authenticateToken } from "../middleware/authenticateToken.js";
import {
    getProfile,
    getDataUsingNpi,
    getNpiInstitutesByCityAndTaxonomy,
    searchData,
    postExample,
    getLastTenCustomers,
    createCustomer,
    loginCustomer,
    forgotPassword,
    checkOTP,
    changePassword,
    addCustomerInstitutes,
    getCustomerInstitutesDetails,
    addManualInstitute,
    updateManualInstitutes,
    updateCptCodes,
    fetchCptData,
    fetchBasicCptData,
    searchCptData,
    filterCptData,
    fetchGeneralCptData,
    getCptCodeOptions,
    buildCodes,
    uploadFile
} from "../controllers/apiController.js";

const router = express.Router();

router.post("/postExample", postExample);
router.get("/getProfile", authenticateToken, getProfile);
router.get("/getDataUsingNpi", getDataUsingNpi);
router.post(
    "/getCustomerInstitutes",
    authenticateToken,
    getCustomerInstitutesDetails
);
router.post(
    "/getDefaultInstitutes",
    authenticateToken,
    getNpiInstitutesByCityAndTaxonomy
);
router.get("/searchData", searchData);
router.get("/getCustomers", getLastTenCustomers);
router.post("/signup", createCustomer);
router.post("/login", loginCustomer);
router.post("/forgotPassword", forgotPassword);
router.post("/checkOTP", checkOTP);
router.post("/changePassword", changePassword);
router.post("/addCustomerInstitutes", addCustomerInstitutes);
router.post("/addManualInstitute", addManualInstitute);
router.post("/updateManualInstitutes", updateManualInstitutes);
router.post("/updateCptCodes", authenticateToken, updateCptCodes);
router.get("/fetchCptData", fetchCptData);
router.get("/fetchBasicCptData", fetchBasicCptData);
router.get("/searchCptData", searchCptData);
router.get("/filterCptData", filterCptData);
router.get("/fetchGeneralCptData", fetchGeneralCptData);
router.get("/getCptCodeOptions", authenticateToken, getCptCodeOptions);
router.get("/buildCodes", authenticateToken, buildCodes);
router.post("/uploadFile", authenticateToken, uploadFile);

export default router;
