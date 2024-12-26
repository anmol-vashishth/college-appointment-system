const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Availability = require("../models/Availability");
const Appointment = require("../models/Appointment");

router.get("/", auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "professor") {
      query.professorId = req.user.userId;
    } else if (req.user.role === "student") {
      query.studentId = req.user.userId;
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const appointments = await Appointment.find(query);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/availability", auth, async (req, res) => {
  try {
    if (req.user.role !== "professor") {
      return res
        .status(403)
        .json({ message: "Only professors can set availability" });
    }

    const { startTime, endTime } = req.body;
    const availability = new Availability({
      professorId: req.user.userId,
      startTime,
      endTime,
    });
    await availability.save();
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/availability/:professorId", auth, async (req, res) => {
  try {
    const availableSlots = await Availability.find({
      professorId: req.params.professorId,
      isBooked: false,
    });
    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/book", auth, async (req, res) => {
  try {
    const { availabilityId, professorId } = req.body;

    const availability = await Availability.findById(availabilityId);
    if (!availability || availability.isBooked) {
      return res.status(400).json({ message: "Slot not available" });
    }

    const appointment = new Appointment({
      studentId: req.user.userId,
      professorId,
      availabilityId,
    });

    availability.isBooked = true;
    await availability.save();
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/cancel/:appointmentId", auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (
      req.user.role === "professor" &&
      appointment.professorId.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    appointment.status = "cancelled";
    await appointment.save();

    const availability = await Availability.findById(
      appointment.availabilityId
    );
    availability.isBooked = false;
    await availability.save();

    res.json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
