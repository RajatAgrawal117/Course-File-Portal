const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CourseFile = require('../models/CourseFile');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files are allowed'));
    }
  }
});

// Upload file
router.post('/upload', [auth, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { course, fileType, description, tags } = req.body;

    const courseFile = new CourseFile({
      course,
      fileName: req.file.originalname,
      fileType,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await courseFile.save();
    await courseFile.populate(['course', 'uploadedBy'], 'courseName name');

    res.status(201).json(courseFile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get files by course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const files = await CourseFile.find({ course: req.params.courseId })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Download file
router.get('/download/:id', auth, async (req, res) => {
  try {
    const file = await CourseFile.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(file.filePath, file.fileName);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;