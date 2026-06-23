import { getInput, setOutput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';

async function run() {
  try {
    // Get authenticated GitHub client (Octokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const token = process.env.GITHUB_TOKEN || '';
    const github = getOctokit(token);

    // Get owner and repo from context of payload that triggered the action
    const { owner, repo } = context.repo;

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const tagName = getInput('tag_name', { required: true });

    // This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
    const tag = tagName.replace('refs/tags/', '');
    const releaseName = getInput('release_name', {
      required: true,
    }).replace('refs/tags/', '');
    const body = getInput('body', { required: false });
    const draft = getInput('draft', { required: false }) === 'true';
    const prerelease =
      getInput('prerelease', { required: false }) === 'true';

    // Create a release
    // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-create-release
    const createReleaseResponse = await github.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: releaseName,
      body,
      draft,
      prerelease,
    });

    // Get the ID, html_url, and upload URL for the created Release from the response
    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl },
    } = createReleaseResponse;

    // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    setOutput('id', releaseId);
    setOutput('html_url', htmlUrl);
    setOutput('upload_url', uploadUrl);
    setOutput('tag_name,', tag);
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(String(error));
    }
  }
}

export default run;
