// Tests for emailService

let mockSendMail: jest.Mock;
let mockCreateTransport: jest.Mock;

// Mock nodemailer to control transport and sendMail behavior
jest.mock('nodemailer', () => {
  mockSendMail = jest.fn();
  mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
  return {
    __esModule: true,
    default: {
      createTransport: mockCreateTransport,
    },
  };
});

// Mock config used by emailService
jest.mock('../../config/config', () => ({
  __esModule: true,
  default: {
    ses: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user@example.com',
      smtpPass: 'secret',
      smtpFrom: 'noreply@example.com',
    },
    security: {
      otpExpiresIn: 15,
    },
  },
}));

let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('auth-service: emailService', () => {
  test('sendMail sends via transporter and logs success', async () => {
    let emailService: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      emailService = require('../emailService').default;
    });

    mockSendMail.mockResolvedValueOnce({ messageId: 'mid-123' });

    await emailService.sendMail('to@example.com', 'Hello', '<p>Hi</p>');

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user@example.com', pass: 'secret' },
    });

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'to@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ Email sent successfully:'),
      'mid-123'
    );
  });

  test('sendMail logs error and throws friendly error on failure', async () => {
    let emailService: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      emailService = require('../emailService').default;
    });

    mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));

    await expect(
      emailService.sendMail('to@example.com', 'Hello', '<p>Hi</p>')
    ).rejects.toThrow('Failed to send email');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('❌ Email sending failed:'),
      expect.any(Error)
    );
  });

  test('sendOTPEmail composes subject/html and delegates to sendMail', async () => {
    let emailService: any;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      emailService = require('../emailService').default;
    });

  const spy = jest.spyOn(emailService, 'sendMail').mockResolvedValueOnce(undefined as unknown as void);

    const email = 'student@example.com';
    const otp = '123456';
    await emailService.sendOTPEmail(email, otp);

    expect(spy).toHaveBeenCalledTimes(1);
    const [to, subject, html] = spy.mock.calls[0];
    expect(to).toBe(email);
    expect(subject).toBe('Vidyalayaone - Email Verification');
    expect(html).toEqual(expect.stringContaining(otp));
    expect(html).toEqual(expect.stringContaining('15'));
  });
});
