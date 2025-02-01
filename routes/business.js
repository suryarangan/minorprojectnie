const express = require('express');
const router = express.Router();
const Business = require('../models/Business');

const { exec } = require('child_process');
const path = require('path');


const { anonymousTokenMiddleware, enforceAnonymousToken } = require('../middlewares/anonymousTokenMiddleware');
const cookieParser = require('cookie-parser');
router.use(cookieParser()); // Parse cookies in requests

// Apply the middleware globally
router.use(anonymousTokenMiddleware);


// Create a new business
router.post('/business', async (req, res) => {
  try {
    const { b_name, description, location, category } = req.body;

    // Validate request data
    if (!b_name || !description || !location || !category) {
      return res.status(400).json({ error: 'All fields are required!' });
    }

    // Create a new business
    const newBusiness = new Business({
          b_name,
          description,
          category,
          location,
      });
    const savedBusiness = await newBusiness.save();

    res.status(201).json(savedBusiness); // Respond with the saved business
  } catch (error) {
    console.error('Error saving business:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});






// Read the businesses
router.get('/businesses', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {}; // Filter by category if provided
    const businesses = await Business.find(filter);
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


router.get('/reviews/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ message: "Business not found." });
    }

    res.status(200).json(business.reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "An error occurred while fetching reviews." });
  }
});



// POST: Add a review for a specific business
router.post('/businesses/:businessId/reviews', enforceAnonymousToken, async (req, res) => {
  const { businessId } = req.params;
  const { reviewText, starRating } = req.body;

  if (!reviewText || !starRating) {
    return res.status(400).json({ message: 'Review text and star rating are required.' });
  }

  try {
    // Path to the Python script
    const scriptPath = path.join(__dirname, '../vader/sentiment_combi.py');

    // Encode the review text to handle special characters like emojis
    const encodedReviewText = encodeURIComponent(reviewText);

    // Run the Python script for sentiment analysis
    exec(`python "${scriptPath}" "${encodedReviewText}"`, { encoding: 'utf8' }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Error running sentiment analysis:', error);
        return res.status(500).json({ message: 'Failed to analyze sentiment.' });
      }
      if (stderr) {
        console.error('Python script error output:', stderr);
      }

      // Parse the output as JSON (this will include emojis)
      try {
        const sentiment = JSON.parse(stdout.trim()); // Ensure it's correctly parsed
        // Add the review with sentiment to the business's reviews
        const business = await Business.findById(businessId);
        if (!business) {
          return res.status(404).json({ message: 'Business not found.' });
        }
        business.reviews.push({ reviewText, starRating, sentiment: sentiment.sentiment });
        await business.save();

        res.status(201).json({ message: 'Review added successfully with sentiment analysis.', sentiment: sentiment.sentiment });
      } catch (err) {
        console.error('Error parsing sentiment output:', err);
        res.status(500).json({ message: 'Failed to parse sentiment analysis.' });
      }
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Failed to add review.' });
  }
});


// Voting route
router.post('/reviews/:reviewId/vote', async (req, res) => {
  const { reviewId } = req.params; // ID of the review
  const { voteType } = req.body; // 'upvote' or 'downvote'

  // Validate the vote type
  if (!['upvote', 'downvote'].includes(voteType)) {
    return res.status(400).json({ message: 'Invalid vote type' });
  }


  try {
    // Find the business that contains the review
    const business = await Business.findOne({ 'reviews._id': reviewId });
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Find the specific review
    const review = business.reviews.id(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }


    // Check if the user has already voted on this review (via cookies)
    const userVote = req.cookies[`vote_${reviewId}`];
    if (userVote===voteType) {
      return res.status(400).json({ message: 'You have already voted on this review' });
    }

    // Handle vote type
    if (voteType === 'upvote') {
      // Remove downvote if it exists
      if (review.downvotes > 0) {
        review.downvotes -= 1;
      }
      review.upvotes += 1;
    } else if (voteType === 'downvote') {
      // Remove upvote if it exists
      if (review.upvotes > 0) {
        review.upvotes -= 1;
      }
      review.downvotes += 1;
    }

    // Save the updated business document
    await business.save();

    // Set a cookie to track this user's vote for this review
    res.cookie(`vote_${reviewId}`, voteType, { maxAge: 3600000, httpOnly: true }); // Expires in 1 hour

    // Respond with the updated vote counts
    res.status(200).json({
      message: 'Vote registered successfully',
      upvotes: review.upvotes,
      downvotes: review.downvotes
    });
  } catch (error) {
    console.error('Error updating vote:', error);
    res.status(500).json({ message: 'Server error' });
  }
});












// Update a business
router.put('/business/:id', async (req, res) => {
  try {
    const updatedBusiness = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedBusiness);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a business
router.delete('/business/:id', async (req, res) => {
  try {
    await Business.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
