# Huyền Khí Expert Review Workbook V0.2

> Candidate evidence only. This workbook does not contain an approved doctrinal answer and does not authorize evaluation, scoring, or production use.

## Tử Vi candidate passage and fixture (`HK-BATCH-V02-A`)

- Topics: `major-star-tu-vi`, `brightness-states`
- Required roles: `source-reviewer`, `school-expert`
- Required school profile: `shared`

### Tử Vi Miếu/Vượng đi cùng hóa cát — candidate transcription

- Fixture: `HK-FIX-001-MAJOR-MIEU-SUPPORT`
- Category: `major-star-brightness`
- Maturity: `research-ready`
- Research question: Does the located Tử Vi passage support a conditional symbolic capacity-strengthening rule when brightness is Miếu/Vượng and the transformation context is auspicious?
- Candidate source: `HK-SRC-CLASSIC-TRANSCRIPTION-001`
- Candidate rule: `HK-RULE-V02-MAJOR-001` — **non-effective**

#### Canonical input facts

```json
{
  "majorStar": {
    "canonicalName": "Tử Vi",
    "brightnessState": "miếu-or-vượng"
  },
  "transformationContext": {
    "polarity": "auspicious"
  },
  "notes": "Synthetic canonical facts only; no personal birth data."
}
```

#### Candidate evidence

- Extraction: `HK-EXT-V02-MAJOR-TU-VI-001`
- Source: `HK-SRC-CLASSIC-TRANSCRIPTION-001`
- Locator: `卷一` · `諸星問答論 / 問紫微所主若何？`
- Verification: `candidate-located`
- Excerpt: `俱看在廟旺之鄉否，有何吉凶之守照。如廟旺化吉甚妙，陷又化凶甚凶。`
- Paraphrase: The passage treats Tử Vi according to brightness state together with auspicious or inauspicious transformation and surrounding context; it does not independently define an ApexVoid Huyền Khí dimension or magnitude.
- Boundary: searchable transcription only; physical-scan witness verification remains pending.

#### Review questions

1. Does the physical witness match the transcription exactly enough for doctrinal use?
2. Is the effect conditional on both Miếu/Vượng and hóa cát rather than brightness alone?
3. Is `capacity / strengthen / moderate` the correct symbolic candidate mapping, or should it be rejected?
4. Should the candidate remain shared or be split into school-specific interpretations?

#### Reviewer decision template

```yaml
reviewerId: ""
role: source-reviewer | school-expert | adjudicator
schoolProfile: shared
decision: reviewed | approved | disputed
rationale: ""
reviewedAt: YYYY-MM-DDTHH:mm:ssZ
sourceIds: []
claimIds: []
expectedEffectiveRuleIds: []
forbiddenRuleIds: []
```

Use the canonical `research:huyen-khi:review-fixture` CLI to append a validated review. Derived approval status must never be edited by hand.
