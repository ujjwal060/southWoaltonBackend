
const Image = require('../models/signModel');
const upload = require('../middleware/multer');
const { S3 } = require('@aws-sdk/client-s3');

const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const Sign = require('../models/signModel');

const s3 = new S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION,
});

exports.saveImageUrl = async (req, res) => {
    // Use multer middleware
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
            // Sanitize the file name by replacing spaces with hyphens
            const sanitizedFileName = `${Date.now()}-${file.originalname.replace(/ /g, '-')}`;

            // S3 upload parameters
            const params = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: sanitizedFileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            // Upload to S3
            await s3.putObject(params);

            // Construct the file URL
            const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${sanitizedFileName}`;

            // Save image URL and userId to the database
            const newImage = new Image({ userId, image: fileUrl });
            await newImage.save();

            // Return success response
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
    const { userId, image, pdf } = req.body;  // Assume image and pdf URLs are passed in the body

    // Validate that userId is provided
    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        // Find the existing image record by userId
        const imageRecord = await Image.findOne({ userId });

        if (!imageRecord) {
            return res.status(404).json({ success: false, message: 'Image record not found.' });
        }

        // Prepare an object with the fields to update
        const updateData = {};
        if (image) {
            updateData.image = image;  // Only update image if provided
        }
        if (pdf) {
            updateData.pdf = pdf;  // Only update pdf if provided
        }

        // Update the image record using findByIdAndUpdate
        const updatedImage = await Image.findByIdAndUpdate(
            imageRecord._id,  // Use the _id of the image record found
            { $set: updateData },  // Set the updated fields in the document
            { new: true }  // Return the updated document
        );

        // Return the updated image record
        return res.status(200).json({
            success: true,
            message: 'Image record updated successfully.',
            data: updatedImage,  // Send the updated data back
        });
    } catch (error) {
        console.error('Error updating image record:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.', details: error.message });
    }
};
exports.getImageByUserId = async (req, res) => {
    const { userId } = req.params; // Retrieve userId from the URL parameter

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    try {
        // Find the image record by userId
        const imageRecord = await Image.findOne({ userId });

        if (!imageRecord) {
            return res.status(404).json({ success: false, message: 'Image record not found.' });
        }

        // Return the image record including the image URL and PDF URL (if available)
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
        // Retrieve all image records from the database
        const allImages = await Image.find();

        if (allImages.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No image records found.',
            });
        }

        // Return all image records
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


// email of agreement sign 


exports.sendRentalAgreementEmail = async (req, res) => {
    try {
      const { userId } = req.body;
      const file = req.file; // File uploaded via multer
  
      if (!userId || !file) {
        return res.status(400).json({ message: 'User ID and file are required.' });
      }
  
      // Fetch user from the database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      // Upload the PDF to S3
      const fileKey = `rental-agreements/${userId}-${Date.now()}-${file.originalname}`;
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
  
      // Upload the file to S3
      await s3.putObject(uploadParams);
      const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
  
      // Save the document details in the database
      const signEntry = new Sign({
        userId,
        pdf: fileUrl,
      });
      await signEntry.save();
  
      // Create nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'development.aayaninfotech@gmail.com',
          pass: 'defe qhhm kgmu ztkf',
        },
      });
  
      // Email content
      const mailOptions = {
        from: 'development.aayaninfotech@gmail.com',
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
  
      // Send email
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
  
