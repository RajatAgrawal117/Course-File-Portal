const mongoose = require('mongoose');

const courseFileSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['syllabus', 'lesson_plan', 'assignment', 'question_paper', 'answer_key', 'attendance', 'marks', 'other'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String
  },
  isNBACompliant: {
    type: Boolean,
    default: false
  },
  tags: [String],
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CourseFile', courseFileSchema);