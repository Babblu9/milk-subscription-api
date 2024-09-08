const express = require('express');
const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

// In-memory storage for subscriptions
let subscriptions = [];

// Utility function to get the next delivery date
const getNextDeliveryDate = (currentDate, deliveryInterval) => {
    const nextDelivery = new Date(currentDate);
    nextDelivery.setDate(currentDate.getDate() + deliveryInterval);
    return nextDelivery;
};

// POST /subscribe - Subscribe to a milk plan
app.post('/subscribe', (req, res) => {
    const { userId, plan, date } = req.body;

    if (!userId || !plan || !date) {
        return res.status(400).json({ message: 'User ID, plan, and date are required.' });
    }

    // Check if the user is already subscribed
    const existingSubscription = subscriptions.find(sub => sub.userId === userId);
    if (existingSubscription) {
        return res.status(400).json({ message: 'User already has an active subscription.' });
    }

    // Parse the provided date
    const startDate = new Date(date);
    if (isNaN(startDate)) {
        return res.status(400).json({ message: 'Invalid date format.' });
    }

    let totalDays, deliveryInterval;

    if (plan === 'Elite') {
        // Elite plan: 12 days per month, total 24 days
        totalDays = 24;
        deliveryInterval = 2; // Delivery every 2 days (skipping one day)
    } else if (plan === 'Premium') {
        // Premium plan: 24 days total, 48 days duration
        totalDays = 48;
        deliveryInterval = 2; // Delivery every 2 days (skipping one day)
    } else {
        return res.status(400).json({ message: 'Invalid plan. Choose Elite or Premium.' });
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + totalDays);

    const newSubscription = {
        userId,
        product: 'Milk',
        plan,
        startDate,
        endDate,
        deliveryInterval, // Add delivery interval for calculation
    };

    subscriptions.push(newSubscription);

    res.status(201).json({ message: 'Subscription created successfully.', subscription: newSubscription });
});

// GET /subscriptions - Get all subscriptions
app.get('/subscriptions', (req, res) => {
    res.json(subscriptions);
});

// POST /pause - Pause the subscription
app.post('/pause', (req, res) => {
    const { userId, pauseDate, pauseDays } = req.body;

    if (!userId || !pauseDate || pauseDays === undefined) {
        return res.status(400).json({ message: 'User ID, pauseDate, and pauseDays are required.' });
    }

    const subscription = subscriptions.find(sub => sub.userId === userId);
    if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found.' });
    }

    const { plan, startDate, endDate, deliveryInterval } = subscription;
    const pauseStartDate = new Date(pauseDate);
    if (isNaN(pauseStartDate)) {
        return res.status(400).json({ message: 'Invalid pauseDate format.' });
    }

    if (pauseDays < 1 || pauseDays > 2) {
        return res.status(400).json({ message: 'PauseDays must be between 1 and 2 days in a week.' });
    }

    // Calculate the new end date considering the pause
    const newEndDate = new Date(endDate);
    newEndDate.setDate(newEndDate.getDate() + pauseDays);

    // Adjust for delivery schedule
    const nextDeliveryDate = getNextDeliveryDate(pauseStartDate, deliveryInterval);

    res.json({
        userId,
        plan,
        pauseStartDate: pauseStartDate.toISOString(),
        pauseEndDate: new Date(pauseStartDate.getTime() + (pauseDays * 24 * 60 * 60 * 1000)).toISOString(),
        newEndDate: newEndDate.toISOString(),
        nextDeliveryDate: nextDeliveryDate.toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
