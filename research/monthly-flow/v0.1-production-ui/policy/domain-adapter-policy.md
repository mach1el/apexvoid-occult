# Monthly Flow domain-adapter policy

- Nam Phái: `selectResolver("nam-phai")` → natal-palace-name / nam-phai-natal-domain-anchor
- Trung Châu: `selectResolver("trung-chau")` → annual-palace-name / trung-chau-annual-palace-name
- Primary domain per palace: max weight; ties break by stable domain ID
- Fail closed on incomplete / duplicate / missing anchors
- Never consume Annual Axes or Major Fortune scores
