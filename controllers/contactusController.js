const express = require('express');
const mongoose = require('mongoose');
const Contactus = require('../models/contactUsModel')

const router = express.Router()

// create book form

const CreatecontactForm = async (req, res) => {
    try {
        const contactForm = new Contactus(req.body);
        const savedForm = await contactForm.save();
        res.status(200).json({ 
            message: "Contact form submitted successfully",
             data: savedForm });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


module.exports={
    CreatecontactForm
};