const express = require('express');

const createError = (status, messsage) => {
    const err = new Error();
    err.status = status
    err.message = messsage;
    return err;

}

module.exports = createError;