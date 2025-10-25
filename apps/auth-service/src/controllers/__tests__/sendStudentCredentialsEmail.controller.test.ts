import { sendStudentCredentialsEmailController } from '../sendStudentCredentialsEmail';

jest.mock('../../services/studentCredentialsEmail', () => ({
  sendStudentCredentialsEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockedService = require('../../services/studentCredentialsEmail');

// Silence console.error in tests while still allowing assertions if needed
let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('auth-service: sendStudentCredentialsEmailController', () => {
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('rejects non-internal requests (403)', async () => {
    const req: any = { headers: {}, body: {} };
    const res = makeRes();

    await sendStudentCredentialsEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: expect.stringContaining('Forbidden') }) })
    );
    expect(mockedService.sendStudentCredentialsEmail).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid body', async () => {
    const req: any = { headers: { 'x-internal-request': 'true' }, body: { email: 'not-an-email', username: 'a', password: '123' } };
    const res = makeRes();

    await sendStudentCredentialsEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: 'Invalid request' }) })
    );
  });

  it('calls service and returns 200 on success', async () => {
    const req: any = {
      headers: { 'x-internal-request': 'true' },
      body: { email: 'student@example.com', username: 'student123', password: 'P@ssw0rd!' },
    };
    const res = makeRes();

    await sendStudentCredentialsEmailController(req, res);

    expect(mockedService.sendStudentCredentialsEmail).toHaveBeenCalledWith(
      'student@example.com',
      'student123',
      'P@ssw0rd!'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns 500 on unexpected errors without leaking credentials', async () => {
    mockedService.sendStudentCredentialsEmail.mockRejectedValueOnce(new Error('SMTP broken'));

    const req: any = {
      headers: { 'x-internal-request': 'true' },
      body: { email: 'student@example.com', username: 'student123', password: 'secret' },
    };
    const res = makeRes();

    await sendStudentCredentialsEmailController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg).toEqual(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: 'Internal server error' }) })
    );
    // ensure password not present anywhere in response
    const jsonStr = JSON.stringify(jsonArg);
    expect(jsonStr).not.toContain('secret');
    expect(jsonStr).not.toContain('student123');
  });
});
