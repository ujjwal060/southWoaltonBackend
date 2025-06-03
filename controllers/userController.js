const User = require('../models/userModel');

const Role = require('../models/roleModel');
const upload = require('../middleware/multer'); // Updated multer middleware
const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const createError = require('../middleware/error')
const createSuccess = require('../middleware/success');
// to update-password
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




//to Create user 
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
        // return res.status(200).json("User Registered Successfully")
        return next(createSuccess(200, "User Registered Successfully"))
    }
    catch (error) {
        //return res.status(500).send("Something went wrong")
        return next(createError(500, "Something went wrong"))
    }
}
//get users
const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        return next(createSuccess(200, "All Users", users));

    } catch (error) {
        return next(createError(500, "Internal Server Error!"))
    }
}
//get user
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

//update user
// const updateUser = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         // const image = req.file ? `http://44.196.64.110:5001/api/user/uploads/${req.file.filename}`:null;
//         if (req.file) {
//             const host = req.hostname;
//             const port = process.env.PORT || 5001;
//             imageUrl = `${req.protocol}://${host}:${port}/uploads/${req.file.filename}`;
//         }
//         console.log('image', imageUrl);
//         const updatedData = { ...req.body, image: imageUrl };
//         const user = await User.findByIdAndUpdate(id, updatedData, { new: true });
//         if (!user) {
//             return next(createError(404, "User Not Found"));
//         }
//         return next(createSuccess(200, "User Details Updated", user));
//     } catch (error) {
//         return next(createError(500, "Internal Server Error1"))
//     }
// }
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, email, phoneNumber, state } = req.body;
        let imageUrl = null;

        if (req.file) {
            // S3 upload parameters without ACL
            const params = {
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: `${Date.now()}-${path.basename(req.file.originalname)}`,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            };

            // Initialize S3 client
            const s3 = new S3({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
            });

            try {
                const command = new PutObjectCommand(params);
                await s3.send(command);

                // Construct the public URL for the uploaded image
                imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
            } catch (s3Error) {
                console.error('S3 upload error:', s3Error);
                return next(createError(500, "Failed to upload image to S3"));
            }
        }

        // Updating user data
        const updatedData = {
            fullName,
            email,
            phoneNumber,
            state,
        };
        if (imageUrl) {
            updatedData.image = imageUrl;
        }

        // Find and update the user
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


// const updateImage = async (req, res, next) => {
//     try{
//         const {id} = req.params;
//         // const image = req.file ? '/uploads/${req.file.filename}':null;
//         const user = await User.findByIdAndUpdate(id, {image:image});
//         if (!user) {
//             return next(createError(404, "User Not Found"));
//         }
//         return next(createSuccess(200, "Image Updated",user));
//     } catch (error) {
//         return next(createError(500, "Internal Server Error1"))
//     }
// }


//delete user
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
    getAllUsers, getUser, deleteUser, updateUser, register,updatePassword
}