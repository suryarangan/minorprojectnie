const express = require('express');
const router = express.Router();
require('dotenv').config();
const Business = require('../models/Business');
const { spawn } = require('child_process');
const path = require('path');

router.get('/', async (req, res) => {
    try {
        const { lng, lat, radius } = req.query;

        // Fetch businesses within the given area
        const businesses = await Business.find({
            location: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radius / 6378.1],
                },
            },
        }).lean();


        // Default strategy: Most popular business in the area
        const mostPopular = businesses.sort((a, b) => b.averageRating - a.averageRating)[0];
        if (!mostPopular) {
            return res.json([]); // No businesses in the area
        }

        // Use the most popular business ID
        businessId = mostPopular._id;

        // Call recommender.py
        const recommendedBusinesses = await getRecommendations(businessId);

        res.json(recommendedBusinesses);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations.' });
    }
});

async function getRecommendations(businessId) {
    return new Promise((resolve, reject) => {
        // Path to your Python script
        const scriptPath = path.join(__dirname, '../surprise/recommender.py');

        // Parameters to pass to the Python script
        const args = [businessId || ''];

        // Spawn the Python process
        const pythonProcess = spawn('python3', [scriptPath, ...args]);

        let output = '';
        let errorOutput = '';

        // Listen for data from stdout
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        // Listen for errors from stderr
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        // Handle the process exit
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // Parse the output as JSON
                    // console.log(output);
                    const recommendations = JSON.parse(output);
                    // console.log(typeof(recommendations));

                    resolve(recommendations);
                } catch (err) {
                    reject(new Error('Failed to parse JSON from Python script.'));
                }
            } else {
                reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
            }
        });

        // Handle unexpected process errors
        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });
    });
}

// router.get('/findBusiness/:place_id', async (req, res) => {
//     const place_id = req.params['place_id'];
//     try {
//         const clicked_business = await Business.findById({ _id: place_id }); console.log(clicked_business); res.json.stringify(clicked_business); // Send the result back to the client 
//     } catch (error) {
//         console.error(error); res.status(500).send('Server Error');
//     }

// })

module.exports = router;
