const express = require('express');
const Course = require('../models/Course');
const CourseFile = require('../models/CourseFile');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// Dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments({ isActive: true });
    const totalFiles = await CourseFile.countDocuments();
    const totalUsers = await User.countDocuments({ isActive: true });
    
    const filesByType = await CourseFile.aggregate([
      { $group: { _id: '$fileType', count: { $sum: 1 } } }
    ]);

    const recentFiles = await CourseFile.find()
      .populate('course', 'courseName')
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalCourses,
      totalFiles,
      totalUsers,
      filesByType,
      recentFiles
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// NBA compliance report
router.get('/nba-compliance', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).populate('faculty', 'name');
    
    const complianceData = await Promise.all(
      courses.map(async (course) => {
        const files = await CourseFile.find({ course: course._id });
        const requiredTypes = ['syllabus', 'lesson_plan', 'assignment', 'question_paper', 'answer_key'];
        
        const compliance = requiredTypes.map(type => ({
          type,
          present: files.some(file => file.fileType === type),
          count: files.filter(file => file.fileType === type).length
        }));

        const compliancePercentage = (compliance.filter(c => c.present).length / requiredTypes.length) * 100;

        return {
          course: {
            id: course._id,
            code: course.courseCode,
            name: course.courseName,
            faculty: course.faculty.name
          },
          compliance,
          compliancePercentage: Math.round(compliancePercentage),
          totalFiles: files.length
        };
      })
    );

    res.json(complianceData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;