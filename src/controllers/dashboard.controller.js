const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { dashboardService, jobService } = require('../services');

const getDashboardData = catchAsync(async (req, res) => {
  console.log('Dashboard Data Start');
  const tenantId = req.user.tenantID;
  const role = req.user.role;
  const userId = req.user.id;

  const dashboardData = await dashboardService.getDashboardData({ tenantId, role, userId });

  res.status(httpStatus.OK).send(dashboardData);
});

const getJobsForCalendar = catchAsync(async (req, res) => {
  const tenantId = req.user.tenantID;
  const role = req.user.role;
  const userId = req.user.id;
  const selectedDate = req.body.selectedDate; // Expecting date to filter jobs

  // Call the service to get the jobs
  const jobsData = await jobService.getJobsForCalendar(tenantId, selectedDate, role, userId);

  const items = jobsData.items;

  /* // Now, transform the jobs data into the format Agenda expects
  const items = {};

  // Iterate over the jobs and group them by date
  jobsData.items.forEach((job) => {
    const dueDate = job.dueDate.split('T')[0]; // Extract just the date part in YYYY-MM-DD

    // Ensure each date is a key in the items object
    if (!items[dueDate]) {
      items[dueDate] = [];
    }

    // Add the job to that date's array
    items[dueDate].push({
      id: job.jobNumber, // Use job number or job id
      jobTitle: job.jobTitle,
      dueDate: job.dueDate, // Include full date if needed
      jobDescription: job.jobDescription,
      priority: job.priority,
      assignedTo: job.assignedTo,
      status: job.status,
      // Add any other job details you need here
    });
  });

  // Ensure that at least one job exists for each day of the month
  const daysWithJobs = jobsData.daysWithJobs;
  daysWithJobs.forEach((day) => {
    if (day.hasJob && !items[day.date]) {
      items[day.date] = []; // Ensure the day exists in the items, even if no jobs
    }
  });
 */
  // Return the transformed data in the required format
  res.status(httpStatus.OK).send(items);
});

module.exports = {
  getDashboardData,
  getJobsForCalendar,
};
