# Nathan's Test Cases

Branch: `nathans-test-cases`. These changes are separate from `main`.

## What to review

- Unit tests: `apps/mobile/src/lib/__tests__/campus-proximity.test.ts`
- Implementation: `apps/mobile/src/lib/geo.ts` (`getCampusNodeProximity`)

The five tests verify the nearest node and distance, acceptance inside campus
within 100 meters, rejection beyond the limit, rejection outside campus even
with a nearby node, inclusion of the exact limit, and handling of an empty node
list. The accepted-location test also checks the existing walking estimator
(80 meters per minute) and displayed duration. Coordinates are fixed test
fixtures; no live GPS, phone, API keys, or network requests are needed.

This branch adds the proximity helper and its unit tests. It does not change
the directions screen. Walking time here is the existing straight-line
estimate, not a live Mapbox route duration.

## Run the tests

Use Node.js 22.13 or newer and npm. From a Git checkout:

```powershell
git switch nathans-test-cases
npm.cmd ci
npm.cmd run test --workspace=@ou-campus-map/mobile -- --runInBand campus-proximity --verbose
```

Run commands from the repository root (the folder containing `package.json`).
On macOS/Linux, use `npm` instead of `npm.cmd`.
The test runner prints `PASS` when all assertions succeed and `FAIL` if an
assertion fails; the process exits with code 0 for success.

### Nathan's current Windows workspace

This machine already has a local Node/npm installation in the downloaded
`OUCampusMap-main` folder. In a new PowerShell session:

```powershell
cd C:\Users\natha\OUCAMPUSMAP\Nathan-Test-Cases
$env:PATH = "C:\Users\natha\OUCAMPUSMAP\OUCampusMap-main\.local-tools\node-v24.21.0-win-x64;$env:PATH"
npm.cmd ci
npm.cmd run test --workspace=@ou-campus-map/mobile -- --runInBand campus-proximity --verbose
```

The PATH change lasts only for that terminal session. Other reviewers should
use their own Node installation and the general instructions above.

## Assignment submission

1. Run the test command yourself.
2. Confirm the output shows `PASS`, `Test Suites: 1 passed`, and `Tests: 5 passed`.
3. Take a screenshot showing the command and passing result.
4. Upload the screenshot to the group's Discord thread with the branch link.

Suggested caption: "Nathan's campus proximity unit tests: all five passed,
covering nearest-node distance, the 100-meter limit, and walking-time estimation."

Optional additional checks:

```powershell
npm.cmd run typecheck --workspace=@ou-campus-map/mobile
npm.cmd run lint --workspace=@ou-campus-map/mobile
```
