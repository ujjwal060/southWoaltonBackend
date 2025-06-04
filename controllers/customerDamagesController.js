const CustomerDamage = require('../models/customerDamagesModel');
const { S3, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const createError = require('../middleware/error')
const createSuccess = require('../middleware/success')
const { getConfig } = require('../config');


let s3;
async function initializeS3() {
    const region = await getConfig('AWS_REGION');
    const accessKeyId = await getConfig('AWS_ACCESS_KEY_ID');
    const secretAccessKey = await getConfig('AWS_SECRET_ACCESS_KEY');

    s3 = new S3({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

const uploadToS3 = async (file) => {
    if (!s3) {
        await initializeS3();
    }
    const region = await getConfig('AWS_REGION');
    const bucketName = await getConfig('AWS_S3_BUCKET_NAME');
    const params = {
        Bucket: bucketName,
        Key: `uploads/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };
    const command = new PutObjectCommand(params);
    await s3.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${params.Key}`;
};

exports.createCustomerDamage = async (req, res, next) => {
  try {
    const { paymentId, description } = req.body;

    const reasonsD = Array.isArray(req.body.DReasons)
      ? req.body.DReasons
      : req.body.DReasons
        ? [req.body.DReasons]
        : [];
    const reasonsA = Array.isArray(req.body.AReasons)
      ? req.body.AReasons
      : req.body.AReasons
        ? [req.body.AReasons]
        : [];

    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadToS3(file))
    );

    const newCustomerDamage = new CustomerDamage({
      images: uploadedImages,
      paymentId,
      DReasons: reasonsD,
      AReasons: reasonsA,
      description
    });

    await newCustomerDamage.save();

    return next(createSuccess(200, "Customer Damage created successfully", newCustomerDamage));
  } catch (error) {
    return next(createError(500, "Internal Server Error!"))
  }
};

exports.getAllCustomerDamage = async (req, res,next) => {
  try {
      const customerDamage = await CustomerDamage.find();
      return next(createSuccess(200, "All Customer Damages", customerDamage));
  } catch (error) {
    return next(createError(500, "Internal Server Error!"))
  }
};

exports.deleteDamage = async (req, res, next) => {
  try {
      const { id } = req.params;
      const damage = await CustomerDamage.findByIdAndDelete(id);
      if (!damage) {
          return next(createError(404, "Damage not found"));
      }
      return next(createSuccess(200, "Damage deleted", damage));
  } catch (error) {
      return next(createError(500, "Internal Server Error1"))
  }
}

exports.getDamageById = async (req, res, next) => {
  try {
      const damage = await CustomerDamage.findById(req.params.id);
      if (!damage) {
          return next(createError(404, "Damage Not Found"));
      }
      return next(createSuccess(200, "Single Damage", damage));
  } catch (error) {
      return next(createError(500, "Internal Server Error1"))
  }
}