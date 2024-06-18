import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";

dotenv.config();

// Configure AWS SDK
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 } // Limit file size to 10Mb
}).single("file");

const uploadToS3 = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No file selected" });
        }

        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${Date.now()}-${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype // Optional: Set the correct MIME type
        };

        try {
            const upload = new Upload({
                client: s3,
                params
            });

            const result = await upload.done();
            req.file.location = result.Location; // Add the S3 file URL to the request object
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "File upload failed", error });
        }
    });
};

export default uploadToS3;
