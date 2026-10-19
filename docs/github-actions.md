# Showing changes through GitHub Actions

The CI workflow in `.github/workflows/ci.yml` runs on every branch push, on pull
requests targeting `main` or `dev`, and manually from the Actions tab once the
workflow exists on the repository's default branch. A branch with an open PR
can have both a push run and a PR run, checking the branch and proposed merge.

## What it checks

Two jobs run in parallel:

- **Mobile, API & shared types:** install locked npm dependencies, regenerate
  campus seed files and check for drift, check formatting, lint, typecheck, test.
- **AI service:** install Python dependencies, run Ruff, Black, and pytest.

Tests use fakes for external services. No Expo login, phone, Supabase instance,
or OpenAI API key is required for these checks. A passing run does not establish
that live services or physical-device behavior work.

## Demonstrate the workflow

1. Commit the CI changes on `chore/github-actions` and push the branch to origin.
2. Open a PR into `dev` following the team's review process.
3. Open the repository's **Actions > CI** run for your commit. Expand each job
   and the test steps to show the results. PR checks also link to these logs.
4. After review and successful checks, merge. The merge triggers another run.
5. For future work, make a task branch, change a feature and its tests, then
   push and open a PR. Give your professor the PR and workflow-run links.

If a failing example is requested, push an intentionally incorrect test assertion
on a disposable task branch, show the red run, then fix it and push to show the
green run. Do not merge the intentionally broken change.

## Require checks before merging

Once the workflow has run, a repository administrator can configure branch
protection or rulesets for `dev` and `main`. Require pull requests, a review, and
these checks (select their actual names from GitHub):

- `Mobile, API & shared types`
- `AI service`

Without branch rules, failed checks do not themselves prevent merging. Rules
availability depends on the repository's visibility and GitHub plan. If Actions
are disabled, enable them under repository Settings > Actions > General.

## Where CD fits

This is continuous integration (CI); no deployment is configured. If the rubric
also requires continuous delivery/deployment (CD), choose a destination first.
For this mobile project, Expo EAS Update can publish tested JavaScript/assets to
a preview channel for compatible development builds. Native changes require a
new build. This differs from the local Expo Go QR-code workflow and does not
deploy the Node or Python services.

After configuring an Expo project, runtime/channel settings, a compatible
development build, and an `EXPO_TOKEN` GitHub secret, add a deployment job gated
by `needs: [node, python]`, restricted to pushes to `dev`. A GitHub preview
environment can control approvals. Keep PR checks independent of secrets.
Those prerequisites and deployment are not implemented by this CI change.

References:

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.expo.dev/eas-update/github-actions/
