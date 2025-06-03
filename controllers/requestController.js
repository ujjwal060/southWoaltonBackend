const Request = require('../models/requestModel');
const createError = require('../middleware/error')
const createSuccess = require('../middleware/success')

exports.createRequest = async (req, res, next) => {
  try {
    const request = new Request(req.body);
    await request.save();
    return next(createSuccess(200, "Request Created", request));
  } catch (err) {
    return next(createError(500, "Internal Server Error"))
  }
};



exports.getAllRequests = async (req, res, next) => {
  try {
      const request = await Request.find({});
      return next(createSuccess(200, "All requests", request));

  } catch (error) {
      return next(createError(500, "Internal Server Error!"))
  }
}

exports.deleteRequest = async (req, res, next) => {
  try {
      const { id } = req.params;
      const request = await Request.findByIdAndDelete(id);
      if (!request) {
          return next(createError(404, "Request Not Found"));
      }
      return next(createSuccess(200, "Request Deleted", request));
  } catch (error) {
      return next(createError(500, "Internal Server Error1"))
  }
}