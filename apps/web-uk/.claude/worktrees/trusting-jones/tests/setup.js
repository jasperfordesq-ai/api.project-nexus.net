// Jest setup file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-secret-minimum-32-characters-long';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!!';
process.env.API_BASE_URL = 'http://localhost:5000';

// Suppress console output during tests
if (process.env.JEST_SILENT !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}
