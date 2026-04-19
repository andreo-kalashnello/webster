

import { MailService } from "./mail.service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
  }),
}));

import { createTransport } from "nodemailer";

const mockSendMail = (createTransport as jest.Mock)().sendMail as jest.Mock;

describe("MailService", () => {
  describe("with SMTP configured", () => {
    let service: MailService;

    beforeEach(() => {
      jest.clearAllMocks();
      const configGet = jest.fn((key: string, def?: any) => {
        const map: Record<string, any> = {
          SMTP_HOST: "smtp.test.com",
          SMTP_PORT: 587,
          SMTP_USER: "user",
          SMTP_PASS: "pass",
          SMTP_FROM: "Test <test@test.com>",
          FRONTEND_URL: "http://localhost:5173",
        };
        return map[key] ?? def;
      });

      service = new MailService({ get: configGet } as any);
    });

    it("should create transporter when SMTP_HOST is set", () => {
      expect(createTransport).toHaveBeenCalled();
    });

    it("should send email via transporter", async () => {
      await service.send("to@test.com", "Subject", "<p>Body</p>");
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "to@test.com",
          subject: "Subject",
          html: "<p>Body</p>",
        }),
      );
    });

    it("should send password reset email with correct link", async () => {
      await service.sendPasswordReset("user@test.com", "reset-token-123");
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: expect.stringContaining("Password Reset"),
          html: expect.stringContaining("reset-token-123"),
        }),
      );
    });

    it("should send email verification with correct link", async () => {
      await service.sendEmailVerification("user@test.com", "verify-token-456");
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: expect.stringContaining("Verify"),
          html: expect.stringContaining("verify-token-456"),
        }),
      );
    });

    it("should send magic link email with correct link", async () => {
      await service.sendMagicLink("user@test.com", "magic-token-789");
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: expect.stringContaining("Sign in"),
          html: expect.stringContaining("magic-token-789"),
        }),
      );
    });
  });

  describe("without SMTP configured", () => {
    let service: MailService;

    beforeEach(() => {
      jest.clearAllMocks();
      const configGet = jest.fn((_key: string, def?: any) => def);
      service = new MailService({ get: configGet } as any);
    });

    it("should log to console instead of sending", async () => {
      const debugSpy = jest.spyOn((service as any).logger, "debug").mockImplementation();
      await service.send("to@test.com", "Subject", "<p>Body</p>");
      expect(debugSpy).toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});
