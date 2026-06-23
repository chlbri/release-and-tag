import { vi, Mock } from 'vitest';
import { getInput, setOutput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';
import run from '../create-release';

vi.mock('@actions/core', () => {
  return {
    getInput: vi.fn(),
    setOutput: vi.fn(),
    setFailed: vi.fn(),
  };
});

vi.mock('@actions/github', () => {
  return {
    getOctokit: vi.fn(),
    context: {
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
    },
  };
});

describe('Create Release', () => {
  let createRelease: Mock;
  let originalToken: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;

    createRelease = vi.fn().mockReturnValue({
      data: {
        id: 'releaseId',
        html_url: 'htmlUrl',
        upload_url: 'uploadUrl',
      },
    });

    (getOctokit as Mock).mockReturnValue({
      rest: {
        repos: {
          createRelease,
        },
      },
    });

    // Mock Context.repo getters/setters if read-only, otherwise direct assignment
    Object.defineProperty(context, 'repo', {
      value: {
        owner: 'owner',
        repo: 'repo',
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    process.env.GITHUB_TOKEN = originalToken;
  });

  test('Create release endpoint is called', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
    });
  });

  test('Draft release is created', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: true,
      prerelease: false,
    });
  });

  test('Pre-release release is created', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: true,
    });
  });

  test('Release with empty body is created', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // <-- The default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(createRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
    });
  });

  test('Outputs are set', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(setOutput).toHaveBeenNthCalledWith(1, 'id', 'releaseId');
    expect(setOutput).toHaveBeenNthCalledWith(2, 'html_url', 'htmlUrl');
    expect(setOutput).toHaveBeenNthCalledWith(
      3,
      'upload_url',
      'uploadUrl',
    );
  });

  test('Action fails elegantly', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    createRelease.mockImplementation(() => {
      throw new Error('Error creating release');
    });

    await run();

    expect(createRelease).toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledWith('Error creating release');
    expect(setOutput).toHaveBeenCalledTimes(0);
  });

  test('Action fails elegantly with a string error', async () => {
    (getInput as Mock)
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    createRelease.mockImplementation(() => {
      throw 'Error creating release';
    });

    await run();

    expect(createRelease).toHaveBeenCalled();
    expect(setFailed).toHaveBeenCalledWith('Error creating release');
    expect(setOutput).toHaveBeenCalledTimes(0);
  });

  test('Uses GITHUB_TOKEN when provided', async () => {
    const originalToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'secret-token';
    try {
      (getInput as Mock)
        .mockReturnValueOnce('refs/tags/v1.0.0')
        .mockReturnValueOnce('myRelease')
        .mockReturnValueOnce('myBody')
        .mockReturnValueOnce('false')
        .mockReturnValueOnce('false');

      await run();

      expect(getOctokit).toHaveBeenCalledWith('secret-token');
    } finally {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });
});
