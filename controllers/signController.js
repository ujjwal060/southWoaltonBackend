
const Image = require('../models/signModel');
const upload = require('../middleware/multer');
const { S3 } = require('@aws-sdk/client-s3');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const Sign = require('../models/signModel');
const { getConfig } = require('../config');


exports.saveImageUrl = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        }

        const { userId } = req.body;
        const { file } = req;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        if (!file) {
            return res.status(400).json({ success: false, message: 'Image is required.' });
        }

        try {
            const sanitizedFileName = `${Date.now()}-${file.originalname.replace(/ /g, '-')}`;
            const AWS_S3_BUCKET_NAME = await getConfig('AWS_S3_BUCKET_NAME');
            const AWS_REGION = await getConfig('AWS_REGION');

            const params = {
                Bucket: AWS_S3_BUCKET_NAME,
                Key: sanitizedFileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            const region = await getConfig('AWS_REGION');
            const accessKeyId = await getConfig('AWS_ACCESS_KEY_ID');
            const secretAccessKey = await getConfig('AWS_SECRET_ACCESS_KEY');

            let s3 = new S3({
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });
            await s3.putObject(params);


            const fileUrl = `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${sanitizedFileName}`;

            const newImage = new Image({ userId, image: fileUrl });
            await newImage.save();

            return res.status(201).json({
                success: true,
                message: 'Image URL saved successfully.',
                data: newImage,
            });
        } catch (error) {
            console.error('Error saving image URL:', error);
            return res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    });
};
exports.updateSign = async (req, res) => {
    const { userId, image, pdf } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const imageRecord = await Image.findOne({ userId });

        if (!imageRecord) {
            return res.status(404).json({ success: false, message: 'Image record not found.' });
        }

        const updateData = {};
        if (image) {
            updateData.image = image;
        }
        if (pdf) {
            updateData.pdf = pdf;
        }

        const updatedImage = await Image.findByIdAndUpdate(
            imageRecord._id,
            { $set: updateData },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Image record updated successfully.',
            data: updatedImage,
        });
    } catch (error) {
        console.error('Error updating image record:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
};
exports.getImageByUserId = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        const imageRecord = await Image.findOne({ userId });

        if (!imageRecord) {
            return res.status(404).json({ success: false, message: 'Image record not found.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Image record retrieved successfully.',
            data: imageRecord,
        });
    } catch (error) {
        console.error('Error retrieving image record:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
};
exports.getAllImages = async (req, res) => {
    try {
        const allImages = await Image.find();

        if (allImages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No image records found.',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'All image records retrieved successfully.',
            data: allImages,
        });
    } catch (error) {
        console.error('Error retrieving all image records:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.',
            details: error.message,
        });
    }
};

exports.sendRentalAgreementEmail = async (req, res) => {
    try {
        const { userId } = req.body;
        const file = req.file;

        if (!userId || !file) {
            return res.status(400).json({ message: 'User ID and file are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // const fileKey = `rental-agreements/${userId}-${Date.now()}-${file.originalname}`;
        // const AWS_S3_BUCKET_NAME = await getConfig('AWS_S3_BUCKET_NAME');
        // const AWS_REGION = await getConfig('AWS_REGION');
        // const uploadParams = {
        //     Bucket: AWS_S3_BUCKET_NAME,
        //     Key: fileKey,
        //     Body: file.buffer,
        //     ContentType: file.mimetype,
        // };

        // const region = await getConfig('AWS_REGION');
        // const accessKeyId = await getConfig('AWS_ACCESS_KEY_ID');
        // const secretAccessKey = await getConfig('AWS_SECRET_ACCESS_KEY');

        // let s3 = new S3({
        //     region,
        //     credentials: {
        //         accessKeyId,
        //         secretAccessKey,
        //     },
        // });
        // await s3.putObject(uploadParams);
        // const fileUrl = `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
        const fileUrl="https://internal-n0wsvav8.s3.us-east-1.amazonaws.com/1752794294889-1000043521.jpg";
         const lastEntry = await Sign.findOne().sort({ createdAt: -1 });
        let lastNumber = 0;
        if (lastEntry?.trackingNumber) {
            const match = lastEntry.trackingNumber.match(/swe-(\d+)/);
            if (match) {
                lastNumber = parseInt(match[1], 10);
            }
        }
        const trackingNumber = generateTrackingNumber(lastNumber);

        const signEntry = new Sign({
            userId,
            pdf: fileUrl,
            trackingNumber
        });
        await signEntry.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'ujjwalkumarsingh888@gmail.com',
                pass: 'bind deyf lnwl rzix',
            },
        });

        const mailOptions = {
            from: 'ujjwalkumarsingh888@gmail.com',
            to: user.email,
            subject: 'Rental Agreement Signed Successfully',
            html: `
          <h3>Dear ${user.fullName},</h3>
          <p>We are pleased to inform you that you have successfully signed the rental agreement with <b>South Walton Carts</b>.</p>
          <p>You can access your signed agreement using the following link:</p>
          <a href="${fileUrl}" target="_blank">View Rental Agreement</a>
          <p>Thank you for choosing our services!</p>
          <p>Best regards,<br>South Walton Carts Team</p>
        `,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            message: 'Rental agreement signed and email sent successfully.',
            data: { signEntry },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing request', error });
    }
};

function generateTrackingNumber(lastNumber) {
    const nextNumber = lastNumber + 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `swe-${paddedNumber}`;
}