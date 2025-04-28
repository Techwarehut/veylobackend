// routes/dashboard.route.js
const express = require('express');
const auth = require('../../middlewares/auth');
const dashboardController = require('../../controllers/dashboard.controller');

const router = express.Router();

router.route('/metrics').get(auth('viewDashboard'), dashboardController.getDashboardData);

// New route for fetching jobs
router.route('/agenda').post(auth('viewDashboard'), dashboardController.getJobsForCalendar);

module.exports = router;
