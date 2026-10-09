# Documentation index

Reviewed and reorganized October 9, 2026. Start with [project status](PROJECT_STATUS.md) for the checked original vision, deviations, missing work, and limits of the evidence.

## Current guides

| Document | Owns |
| --- | --- |
| [Root README](../README.md) | Project introduction and entry points |
| [Project status](PROJECT_STATUS.md) | Vision completion and prioritized gaps |
| [Companion roadmap](../server/pairing-web/COMPANION_ROADMAP.md) | Completed product milestones and next work |
| [TV README](../HomeScreen/README.md) | TV setup, user workflows, and fixture commands |
| [Release guide](../HomeScreen/RELEASE.md) | Signing, APK/AAB builds, installation, and publication |
| [Functions README](../server/functions/README.md) | Backend setup and API overview |
| [Companion README](../server/pairing-web/README.md) | Browser setup, publishing, and account workflows |
| [Layout contract](../server/pairing-web/DASHBOARD_LAYOUT.md) | Published appearance, legacy grid, and instance compatibility |
| [Polls](../server/pairing-web/POLLS.md) | Voting, privacy, retention, API behavior, deployment |
| [People](../server/pairing-web/PEOPLE.md) | Activity invitations, consent, revocation, deployment |
| [Security setup](../server/SECURITY.md) | Authorization, rules, TTL, and operational requirements |

## Architecture and development

- [Component hierarchy](architecture/components.md): both clients' active composition.
- [TV data/rendering structure](architecture/tv-client.md): layout, providers, measurements, and fixtures.
- [TV component folder guide](../HomeScreen/src/components/README.md) and [companion source guide](../server/pairing-web/src/README.md): placement/import rules beside source.
- [TV settings regression guide](../HomeScreen/test/SETTINGS.md): fixture expectations beside tests.
- [Font provenance/license](../HomeScreen/assets/fonts/README.md): attribution beside assets.

## Design references

- [Widget design guide](design/widget-design-guide.md) and [content breakpoints](design/card-content-breakpoints.md).
- [Weather](design/weather-layout-design.md), [Schedule](design/schedule-layout-design.md), [Tasks](design/tasks-layout-design.md).
- [Meals/Media/Activity refinements](design/preview-widget-refinements.md) and [widget assessment](design/widget-layout-assessment.md).
- [Poll design proposal](design/polls-layout-design.md): retained proposal; the Polls implementation guide owns current scope.

## Vision and dated reviews

- [Historical README snapshot](vision/original-readme.md): pre-audit accumulated intent and notes.
- [TV design specification](vision/tv-ui-design.md): original design and checked MVP phases; proposed screens are not shipped behavior.
- [Code quality review](reviews/code-quality.md): maintainability findings and historical checks.
- [Companion UX review](../server/pairing-web/UX_REVIEW.md): dated assessments and settings coverage.
- [October 5 security review](../server/SECURITY_REVIEW.md) and its [evidence directory](../server/security-review/2026-10-05): dated findings; later release evidence is recorded separately.

## Maintenance rules

Keep operational READMEs and security/release instructions beside the component they configure. Put cross-project architecture in `docs/architecture`, widget design in `docs/design`, original intent in `docs/vision`, and general dated reviews in `docs/reviews`. Security evidence stays beside the server review. Agent instructions stay in their applicable source directories.

Use one authoritative guide per subject and link to it from summaries. After a feature lands, update project status and the roadmap together. Mark a checklist item complete only for the scope described; identify partial behavior and outstanding release/hardware checks. Date test results, deployment observations, and screenshots. Do not silently turn a historical review into a claim about today's production environment.

When moving a document, update inbound links and its relative source/image links. The October 9 move renamed the misspelled `HomeScreen/HOMESCEEN_STRUCTURE.md` to `docs/architecture/tv-client.md`; the old root architecture/quality documents and loose TV design documents now live under this index.
