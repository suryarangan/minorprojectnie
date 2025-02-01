const express = require('express');
const mongoose = require('mongoose');
const businessRoutes = require('./routes/business');
const recommendationsRouter = require('./routes/recommendations')
const path = require('path');
const Business = require('./models/Business');
const connectDB = require('./db');
const cors = require('cors');

connectDB();


const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api', businessRoutes);
app.use('/recommendations', recommendationsRouter);
app.use(cors());

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/business', async (req, res) => {
    try {
        const businesses = await Business.find(); // Retrieve all businesses from MongoDB
        res.json(businesses); // Send the array of businesses as JSON
    } catch (error) {
        console.error("Error retrieving businesses:", error); // Logs the error in the server console
        res.status(500).json({ error: "Internal Server Error" }); // Sends a 500 status if there is an error
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
