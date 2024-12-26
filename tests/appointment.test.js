const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../src/models/User");
const Availability = require("../src/models/Availability");
const Appointment = require("../src/models/Appointment");

describe("Appointment System E2E Test", () => {
  let studentA1Token, studentA2Token, professorP1Token;
  let professorP1Id, availabilityId;

  beforeAll(async () => {
    // Connect to test database
    mongoose.set("strictQuery", false).connect(process.env.MONGODB_URI);

    // Clear all collections
    await User.deleteMany({});
    await Availability.deleteMany({});
    await Appointment.deleteMany({});
  });

 

  test("Complete appointment flow", async () => {
    // 1. Create test users

    await request(app).post("/auth/signup").send({
      email: "professor1@test.com",
      password: "password123",
      name: "Professor",
      role: "professor",
    });
    await request(app).post("/auth/signup").send({
      email: "student1@test.com",
      password: "password123",
      name: "Student 1",
      role: "student",
    });
    await request(app).post("/auth/signup").send({
      email: "student2@test.com",
      password: "password123",
      name: "Student 2",
      role: "student",
    });

    const professorP1 = await request(app).post("/auth/login").send({
      email: "professor1@test.com",
      password: "password123",
    });

    professorP1Token = professorP1.body.token;
    professorP1Id = professorP1.body.user.id;

    const studentA1 = await request(app).post("/auth/login").send({
      email: "student1@test.com",
      password: "password123",
    });
    studentA1Token = studentA1.body.token;

    const studentA2 = await request(app).post("/auth/login").send({
      email: "student2@test.com",
      password: "password123",
    });
    studentA2Token = studentA2.body.token;

    // 2. Professor sets availability
    const availability = await request(app)
      .post("/appointments/availability")
      .set("Authorization", `Bearer ${professorP1Token}`)
      .send({
        startTime: new Date("2024-03-20T10:00:00Z"),
        endTime: new Date("2024-03-20T11:00:00Z"),
      });

    expect(availability.status).toBe(200);
    availabilityId = availability.body._id;

    // 3. Student A1 views available slots
    const availableSlots = await request(app)
      .get(`/appointments/availability/${professorP1Id}`)
      .set("Authorization", `Bearer ${studentA1Token}`);

    expect(availableSlots.status).toBe(200);
    expect(availableSlots.body.length).toBe(1);

    // 4. Student A1 books appointment
    const booking1 = await request(app)
      .post("/appointments/book")
      .set("Authorization", `Bearer ${studentA1Token}`)
      .send({
        availabilityId,
        professorId: professorP1Id,
      });

    expect(booking1.status).toBe(200);

    // 5. Professor cancels appointment
    const cancelation = await request(app)
      .post(`/appointments/cancel/${booking1.body._id}`)
      .set("Authorization", `Bearer ${professorP1Token}`);

    expect(cancelation.status).toBe(200);

    // 6. Verify Student A1 has no active appointments
    const studentAppointments = await request(app)
      .get("/appointments")
      .set("Authorization", `Bearer ${studentA1Token}`);

    expect(studentAppointments.status).toBe(200);
    expect(
      studentAppointments.body.filter((apt) => apt.status === "scheduled")
        .length
    ).toBe(0);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  })
});
