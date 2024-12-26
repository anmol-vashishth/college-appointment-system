const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  availabilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', required: true },
  status: { type: String, enum: ['scheduled', 'cancelled'], default: 'scheduled' }
});

module.exports = mongoose.model('Appointment', appointmentSchema); 