const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Bookform = require("../models/checkoutModel");
const Payment = require("../models/PaymentModel");
const Reservation = require("../models/reserveModel");
const Vehicle = require("../models/newVehicleModel");
const { getConfig } = require("../config");
const upload = require("../middleware/multer");

const createError = require("../middleware/error");
const createSuccess = require("../middleware/success");

const uploadToS3 = async (file) => {
  const region = await getConfig("AWS_REGION");
  const bucketName = await getConfig("AWS_S3_BUCKET_NAME");
  const accessKeyId = await getConfig("AWS_ACCESS_KEY_ID");
  const secretAccessKey = await getConfig("AWS_SECRET_ACCESS_KEY");
  console.log(222, bucketName, accessKeyId, secretAccessKey,bucketName);
  const params = {
    Bucket: bucketName,
    Key: `uploads/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  const command = new PutObjectCommand(params);

  let s3 =  new S3Client({
    region:"us-east-1",
    credentials: {
     accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    },
  });

  await s3.send(command);
  return `https://${bucketName}.s3.${region}.amazonaws.com/${params.Key}`;
};

const createBooking = async (req, res) => {
  try {
    const {
      bname,
      bphone,
      bemail,
      bsize,
      baddress,
      baddressh,
      customerDrivers,
      reservationId,
    } = req.body;

    if (!bname) return res.status(400).json({ message: "Name is required" });
    if (!bphone)
      return res.status(400).json({ message: "Phone Number is required" });
    if (!bemail) return res.status(400).json({ message: "Email is required" });
    if (!bsize)
      return res.status(400).json({ message: "Size of cart is required" });
    if (!baddress)
      return res.status(400).json({ message: "Home Address is required" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bemail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    let parsedCustomerDrivers = [];
    try {
      parsedCustomerDrivers = JSON.parse(customerDrivers);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid customerDrivers format" });
    }

    if (
      !Array.isArray(parsedCustomerDrivers) ||
      parsedCustomerDrivers.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "At least one customer driver is required" });
    }

    const updatedCustomerDrivers = [];
    for (let index = 0; index < parsedCustomerDrivers.length; index++) {
      const driver = parsedCustomerDrivers[index];
      const { dphone, demail, dname } = driver;

      if (!dphone)
        return res
          .status(400)
          .json({
            message: `Driver Phone Number is required for driver ${index + 1}`,
          });
      if (!demail)
        return res
          .status(400)
          .json({
            message: `Driver Email is required for driver ${index + 1}`,
          });
      if (!dname)
        return res
          .status(400)
          .json({ message: `Driver Name is required for driver ${index + 1}` });

      if (!emailRegex.test(demail)) {
        return res
          .status(400)
          .json({ message: `Invalid email format for driver ${index + 1}` });
      }

      const dpolicyFile = req.files.find(
        (file) => file.fieldname === `dpolicy[${index}]`
      );
      const dlicenseFile = req.files.find(
        (file) => file.fieldname === `dlicense[${index}]`
      );

      if (!dpolicyFile || !dlicenseFile) {
        return res
          .status(400)
          .json({
            message: `Both dpolicy and dlicense files are required for driver ${
              index + 1
            }`,
          });
      }

      const dpolicyUrl = await uploadToS3(dpolicyFile);
      const dlicenseUrl = await uploadToS3(dlicenseFile);
      
      updatedCustomerDrivers.push({
        ...driver,
        dpolicy: dpolicyUrl,
        dlicense: dlicenseUrl,
      });
    }

    const booking = new Bookform({
      bname,
      bphone,
      bemail,
      bsize,
      baddress,
      baddressh,
      fromAdmin: false,
      customerDrivers: updatedCustomerDrivers,
      reservationId: reservationId,
    });

    const findreservation = await Reservation.findById(reservationId);
    if (findreservation && findreservation.bookingType === "Reservation") {
      findreservation.bookingType = "Booking";
      await findreservation.save();
    }

    const savedBooking = await booking.save();

    res.status(201).json({
      message: "Booking created successfully",
      bookingId: savedBooking._id,
      booking: savedBooking,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const bookingHistoryByUserId = async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, search = "" } = req.query;

 try {
  const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

  const bookings = [];
  const reservations = [];
  const bothReservationIds = new Set();

  for (const payment of payments) {
    const { amount, bookingId, reservationId, paymentType } = payment;

    const bookingDetails = bookingId
      ? await Bookform.findById(bookingId).lean()
      : null;

    const reservationDetails = reservationId
      ? await Reservation.findById(reservationId).lean()
      : null;

    if (!reservationDetails) continue;

    let vehicleDetails = null;
    if (reservationDetails.vehicleId) {
      vehicleDetails = await Vehicle.findById(reservationDetails.vehicleId)
        .select("vname image tagNumber")
        .lean();
    }

    const commonData = {
      amount,
      reservationDetails: {
        ...reservationDetails,
        vehicleDetails,
      },
    };

    if (paymentType === "Both") {
      bothReservationIds.add(reservationId?.toString());
    }

    if (
      (paymentType === "Booking" || paymentType === "Both") &&
      (reservationDetails.bookingType === "Booking" || reservationDetails.bookingType === "Both")
    ) {
      bookings.push({
        ...commonData,
        bookingDetails,
      });
    } else if (
      paymentType === "Reservation" &&
      reservationDetails.bookingType === "Reservation"
    ) {
      reservations.push(commonData);
    }
  }

  const filteredReservations = reservations.filter(
    (r) => !bothReservationIds.has(r.reservationDetails?._id?.toString())
  );

  const searchLower = search.toLowerCase();
  const finalReservations = filteredReservations.filter((r) => {
    const vname = r.reservationDetails?.vehicleDetails?.vname || "";
    return vname.toLowerCase().includes(searchLower);
  });

  const finalBookings = bookings.filter((b) => {
    const vname = b.reservationDetails?.vehicleDetails?.vname || "";
    return vname.toLowerCase().includes(searchLower);
  });

  const total = finalReservations.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  const paginatedReservations = finalReservations.slice(
    startIndex,
    startIndex + parseInt(limit)
  );

  return next(
    createSuccess(200, "History by userId", {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      reservations: paginatedReservations,
      bookings: finalBookings,
    })
  );
} catch (error) {
  console.error("Error fetching payment history:", error);
  return next(createError(500, error.message || "Internal Server Error"));
}

};

module.exports = {
  createBooking,
  bookingHistoryByUserId,
};
