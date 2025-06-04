const User = require('../models/userModel');

const Role = require('../models/roleModel');
const upload = require('../middleware/multer');
const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const createError = require('../middleware/error')
const createSuccess = require('../middleware/success');
const { getConfig } = require('../config');

const updatePassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;


        const user = await User.findById(id);
        if (!user) {
            return next(createError(404, "User not found"))

        }
        user.password = newPassword;
        await user.save();

        return next(createSuccess(200, "password Updated Succesfully", user))
    }
    catch (error) {
        return next(createError(500, "Internal Server Error"))
    }
};

const register = async (req, res, next) => {
    try {
        const role = await Role.find({ role: 'User' });
        const newUser = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            mobileNumber: req.body.mobileNumber,
            jobTitle: req.body.jobTitle,
            roles: role
        })
        await newUser.save();
        return next(createSuccess(200, "User Registered Successfully"))
    }
    catch (error) {
        return next(createError(500, "Something went wrong"))
    }
}

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        return next(createSuccess(200, "All Users", users));

    } catch (error) {
        return next(createError(500, "Internal Server Error!"))
    }
}

const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return next(createError(404, "User Not Found"));
        }
        return next(createSuccess(200, "Single User", user));
    } catch (error) {
        return next(createError(500, "Internal Server Error1"))
    }
}

const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, email, phoneNumber, state } = req.body;
        let imageUrl = null;
        const AWS_S3_BUCKET_NAME = await getConfig('AWS_S3_BUCKET_NAME');
        const AWS_REGION = await getConfig('AWS_REGION');
        const AWS_ACCESS_KEY_ID = await getConfig('AWS_ACCESS_KEY_ID');
        const AWS_SECRET_ACCESS_KEY = await getConfig('AWS_SECRET_ACCESS_KEY');


        if (req.file) {
            const params = {
                Bucket:AWS_S3_BUCKET_NAME,
                Key: `${Date.now()}-${path.basename(req.file.originalname)}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            const s3 = new S3({
                region:AWS_REGION,
                credentials: {
                    accessKeyId:AWS_ACCESS_KEY_ID,
                    secretAccessKey: AWS_SECRET_ACCESS_KEY,
                },
            });

            try {
                const command = new PutObjectCommand(params);
                await s3.send(command);

                imageUrl = `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${params.Key}`;
            } catch (s3Error) {
                console.error('S3 upload error:', s3Error);
                return next(createError(500, "Failed to upload image to S3"));
            }
        }

        const updatedData = {
            fullName,
            email,
            phoneNumber,
            state,
        };
        if (imageUrl) {
            updatedData.image = imageUrl;
        }

        const user = await User.findByIdAndUpdate(id, updatedData, { new: true });
        if (!user) {
            return next(createError(404, "User Not Found"));
        }

        return next(createSuccess(200, "User Details Updated", user));
    } catch (error) {
        console.error('Error updating user:', error);
        return next(createError(500, "Internal Server Error"));
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return next(createError(404, "User Not Found"));
        }
        return next(createSuccess(200, "User Deleted", user));
    } catch (error) {
        return next(createError(500, "Internal Server Error1"))
    }
}

module.exports = {
    getAllUsers, getUser, deleteUser, updateUser, register, updatePassword
}