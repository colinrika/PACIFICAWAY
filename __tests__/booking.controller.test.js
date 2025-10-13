jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

jest.mock("../src/utils/schema", () => ({
  ensureMarketplaceSchema: jest.fn().mockResolvedValue(),
}));

const pool = require("../src/config/db");
const { ensureMarketplaceSchema } = require("../src/utils/schema");
const bookingController = require("../src/controllers/booking.controller");
const { createMockResponse } = require("./helpers/http");

const customer = { id: "cust-1" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("booking.controller", () => {
  describe("create", () => {
    it("creates a booking for a service", async () => {
      const row = { id: "book-1", service_id: "svc-1", customer_id: customer.id };
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const req = {
        body: { service_id: "svc-1", date: "2025-01-01" },
        user: customer,
      };
      const res = createMockResponse();

      await bookingController.create(req, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO bookings"),
        ["svc-1", customer.id, "2025-01-01", null]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.booking).toEqual(row);
    });

    it("returns 400 when required fields missing", async () => {
      const req = { body: { date: "2025-01-01" }, user: customer };
      const res = createMockResponse();

      await bookingController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "service_id and date required" });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates booking status when valid", async () => {
      const row = { id: "book-1", status: "confirmed" };
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const req = { params: { id: "book-1" }, body: { status: "confirmed" } };
      const res = createMockResponse();

      await bookingController.updateStatus(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE bookings"),
        ["book-1", "confirmed"]
      );
      expect(res.body.booking).toEqual(row);
    });

    it("returns 400 for invalid status", async () => {
      const req = { params: { id: "book-1" }, body: { status: "bad" } };
      const res = createMockResponse();

      await bookingController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "Invalid status" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns 404 when booking missing", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = { params: { id: "book-1" }, body: { status: "confirmed" } };
      const res = createMockResponse();

      await bookingController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Not found" });
    });
  });

  describe("listMine", () => {
    it("lists bookings for the current customer", async () => {
      const rows = [
        { id: "book-1", service_id: "svc-1", customer_id: customer.id, service_name: "Tour" },
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const req = { user: customer };
      const res = createMockResponse();

      await bookingController.listMine(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM bookings"),
        [customer.id]
      );
      expect(res.body.bookings).toEqual(rows);
    });
  });
});
