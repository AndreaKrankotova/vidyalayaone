// Mock axios with a default export containing a post function.
// We'll access the same mocked instance the SUT uses via jest.requireMock inside isolateModules.
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));

// We set env vars before importing the module under test so the config picks them up
const AUTH_URL = 'http://auth-service.local:3001';
const AUTH_TIMEOUT = '1234';

describe('profile-service: sendStudentCredentialsEmail', () => {
  const email = 'student@example.com';
  const username = 'student123';
  const password = 'P@ssw0rd!';

  beforeEach(() => {
    process.env.AUTH_SERVICE_URL = AUTH_URL;
    process.env.AUTH_SERVICE_TIMEOUT = AUTH_TIMEOUT;
    const axiosMock: any = (jest.requireMock('axios') as any).default;
    axiosMock.post.mockReset();
  });

  it('posts to auth-service internal endpoint with correct headers and timeout', async () => {
    let postMock: jest.Mock;
    let sendStudentCredentialsEmail: any;
    jest.isolateModules(() => {
      const axiosMock: any = (jest.requireMock('axios') as any).default;
      postMock = axiosMock.post as jest.Mock;
      postMock.mockResolvedValueOnce({ status: 200, data: { success: true } });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sendStudentCredentialsEmail = require('../studentCredentialsEmail').sendStudentCredentialsEmail;
    });

    await sendStudentCredentialsEmail(email, username, password);

    expect(postMock!).toHaveBeenCalledTimes(1);
    const [url, body, options] = (postMock! as jest.Mock).mock.calls[0];

    expect(url).toBe(`${AUTH_URL}/api/v1/internal/send-student-credentials-email`);
    expect(body).toEqual({ email, username, password });

    expect(options).toBeDefined();
    expect(options?.timeout).toBe(Number(AUTH_TIMEOUT));
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Internal-Request': 'true',
    });
  });

  it('propagates axios errors', async () => {
    let postMock: jest.Mock;
    let sendStudentCredentialsEmail: any;
    jest.isolateModules(() => {
      const axiosMock: any = (jest.requireMock('axios') as any).default;
      postMock = axiosMock.post as jest.Mock;
      postMock.mockRejectedValueOnce(new Error('network error'));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      sendStudentCredentialsEmail = require('../studentCredentialsEmail').sendStudentCredentialsEmail;
    });

    await expect(sendStudentCredentialsEmail(email, username, password)).rejects.toThrow('network error');
  });
});
