import express from "express";
import cors from "cors";
import apiRoutes from "./routes/apiRoutes.js";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
    cors({
        origin: "*" // Replace with the domain of your frontend app
    })
);
app.use(express.json());

// Routes
app.use("/api", apiRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
