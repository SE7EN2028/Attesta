import { PrismaClient } from "../lib/generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "m.leroy@leroy-consulting.example" },
    update: {},
    create: {
      email: "m.leroy@leroy-consulting.example",
      companyName: "Leroy & Associés",
    },
  });

  // --- Essential / Draft ---------------------------------------------
  // Still in step 2 of intake (describe the meeting) — no source
  // uploaded yet, so no SourceFile/Transcript/Report exist.
  await prisma.meetingRequest.create({
    data: {
      userId: user.id,
      company: "Meridian Foods SARL",
      region: "France",
      governingBody: "HR",
      meetingDate: new Date("2026-11-12"),
      title: "Quarterly HR briefing",
      outputLanguage: "English",
      tier: "ESSENTIAL",
      status: "DRAFT",
    },
  });

  // --- Scope / In review ----------------------------------------------
  // Source uploaded and transcribed; report drafted but a specialist
  // hasn't locked it yet, so no compliance findings exist.
  await prisma.meetingRequest.create({
    data: {
      userId: user.id,
      company: "Vireo Industrie SAS",
      region: "France",
      governingBody: "CSE",
      meetingDate: new Date("2026-10-02"),
      title: "CSE — extraordinary session: logistics reorganisation",
      outputLanguage: "English",
      tier: "SCOPE",
      status: "IN_REVIEW",
      notes:
        "Elected members raised concerns about timeline, team transfers and load on the remaining site.",
      sourceFiles: {
        create: {
          type: "AUDIO",
          fileName: "vireo_cse_02-10.mp3",
          storageUrl:
            "https://storage.attesta.example/sources/vireo_cse_02-10.mp3",
          transcript: {
            create: {
              rawText:
                "Management presents the plan to merge the two warehouses. Elected members raise three reservations: the timeline, team transfers, and load on the remaining site.",
              speakerLabels: [
                {
                  speakerId: "S1",
                  name: "R. Lambert (CGT)",
                  segments: [
                    {
                      start: 0,
                      end: 42,
                      text: "We need clarity on the timeline before we can support this.",
                    },
                  ],
                },
                {
                  speakerId: "S2",
                  name: "Management",
                  segments: [
                    {
                      start: 43,
                      end: 96,
                      text: "The merger would complete over two phases across Q1 and Q2.",
                    },
                  ],
                },
                {
                  speakerId: "S3",
                  name: "S. Nguyen (CFDT)",
                  segments: [
                    {
                      start: 97,
                      end: 130,
                      text: "What happens to staff at the remaining site during the transition?",
                    },
                  ],
                },
              ],
              source: "DEEPGRAM",
            },
          },
        },
      },
      report: {
        create: {
          tier: "SCOPE",
          outputLanguage: "English",
          content: {
            coverInfo: {
              companyName: "Vireo Industrie SAS",
              site: "Nantes",
              region: "France",
              governingBody: "CSE",
              language: "English",
              date: "2026-10-02",
            },
            executiveSummary:
              "Extraordinary CSE session on the proposed merger of two warehouse sites. Elected members raised reservations on timeline, staff transfers and remaining-site load; no vote taken at this session.",
            attendance: {
              titularPresent: 8,
              titularTotal: 10,
              alternates: 1,
              chair: "Management",
              secretary: "S. Nguyen (CFDT)",
              quorumMet: true,
            },
            agendaItems: [
              "Approval of the agenda",
              "Item 2 — Logistics reorganisation project",
              "Other business",
            ],
            discussionLog: [
              {
                time: "00:00:43",
                speaker: "Management",
                text: "The merger would complete over two phases across Q1 and Q2.",
              },
              {
                time: "00:01:37",
                speaker: "S. Nguyen (CFDT)",
                text: "What happens to staff at the remaining site during the transition?",
              },
            ],
            decisions: [],
            votes: [],
            proceduralNotes: [
              "No vote scheduled for this session — informational item only.",
            ],
            closingNotes:
              "Management to return with a detailed transfer plan before the next ordinary session.",
          },
          speakerAnalytics: [
            {
              speakerName: "R. Lambert (CGT)",
              talkTimeSeconds: 660,
              contributionCount: 9,
              onTopicScore: 91,
            },
            {
              speakerName: "Management",
              talkTimeSeconds: 540,
              contributionCount: 7,
              onTopicScore: 96,
            },
            {
              speakerName: "S. Nguyen (CFDT)",
              talkTimeSeconds: 360,
              contributionCount: 6,
              onTopicScore: 89,
            },
            {
              speakerName: "Other members",
              talkTimeSeconds: 180,
              contributionCount: 3,
              onTopicScore: 84,
            },
          ],
          numericalData: [
            {
              label: "Speaking time — item 2",
              value: "11 min",
              context: "R. Lambert (CGT)",
            },
            {
              label: "Speaking time — item 2",
              value: "9 min",
              context: "Management",
            },
          ],
          status: "DRAFT",
        },
      },
    },
  });

  // --- Premium / Locked ------------------------------------------------
  // Fully processed: transcript reviewed, report locked and signed,
  // compliance audit run with findings across every category.
  await prisma.meetingRequest.create({
    data: {
      userId: user.id,
      company: "Style IT",
      region: "France",
      governingBody: "CSE",
      meetingDate: new Date("2026-09-17"),
      title: "Social and Economic Committee (CSE) — ordinary session",
      outputLanguage: "English",
      tier: "PREMIUM",
      status: "LOCKED",
      notes: "Chair: A. Vasseur (management). Session secretary: C. Marchal.",
      sourceFiles: {
        create: {
          type: "AUDIO",
          fileName: "reunion_cse_17-09_FINAL(2).mp3",
          storageUrl:
            "https://storage.attesta.example/sources/reunion_cse_17-09.mp3",
          transcript: {
            create: {
              rawText:
                "A. Vasseur — I call the session to order. Quorum is met — nine titular members present. C. Marchal — The minutes of 18 June are submitted for approval. M. Duval — One remark on item 3 before we begin, about the training budget.",
              speakerLabels: [
                {
                  speakerId: "S1",
                  name: "A. Vasseur",
                  segments: [
                    {
                      start: 131,
                      end: 159,
                      text: "I call the session to order. Quorum is met — nine titular members present.",
                    },
                  ],
                },
                {
                  speakerId: "S2",
                  name: "M. Duval (CFDT)",
                  segments: [
                    {
                      start: 242,
                      end: 271,
                      text: "One remark on item 3 before we begin, about the training budget.",
                    },
                  ],
                },
                {
                  speakerId: "S3",
                  name: "C. Marchal",
                  segments: [
                    {
                      start: 159,
                      end: 179,
                      text: "The minutes of 18 June are submitted for approval…",
                    },
                  ],
                },
                {
                  speakerId: "S4",
                  name: "L. Petit",
                  segments: [],
                },
              ],
              source: "MANUAL",
            },
          },
        },
      },
      report: {
        create: {
          tier: "PREMIUM",
          outputLanguage: "English",
          content: {
            coverInfo: {
              companyName: "Style IT",
              site: "Lyon site",
              region: "France",
              governingBody: "CSE",
              language: "English",
              date: "2026-09-17",
            },
            executiveSummary:
              "Ordinary CSE session covering approval of prior minutes, H1 2026 economic situation, the 2027 training plan and a working-hours adjustment at the Vénissieux site. Quorum met; training plan approved by vote.",
            attendance: {
              titularPresent: 9,
              titularTotal: 11,
              alternates: 2,
              chair: "A. Vasseur (management)",
              secretary: "C. Marchal",
              quorumMet: true,
            },
            agendaItems: [
              "Approval of the minutes of 18 June",
              "Economic situation — H1 2026",
              "2027 training plan",
              "Working-hours adjustment — Vénissieux site",
              "Other business",
            ],
            discussionLog: [
              {
                time: "00:02:11",
                speaker: "A. Vasseur",
                text: "I call the session to order. Quorum is met — nine titular members present.",
              },
              {
                time: "00:02:39",
                speaker: "C. Marchal",
                text: "The minutes of 18 June are submitted for approval…",
              },
              {
                time: "00:04:02",
                speaker: "M. Duval",
                text: "One remark on item 3 before we begin, about the training budget.",
              },
            ],
            decisions: [
              { item: "2027 training plan", outcome: "Favourable opinion" },
            ],
            votes: [
              {
                item: "2027 training plan",
                for: 8,
                against: 1,
                abstain: 2,
                result: "Favourable opinion",
              },
            ],
            proceduralNotes: [
              "00:23:41 — inaudible passage flagged and annexed",
              "00:31:07 — speaker attribution corrected after review (S2/S4)",
            ],
            closingNotes:
              "Session closed after all agenda items were addressed.",
          },
          speakerAnalytics: [
            {
              speakerName: "A. Vasseur",
              talkTimeSeconds: 620,
              contributionCount: 14,
              onTopicScore: 92,
            },
            {
              speakerName: "M. Duval (CFDT)",
              talkTimeSeconds: 540,
              contributionCount: 11,
              onTopicScore: 88,
            },
            {
              speakerName: "C. Marchal",
              talkTimeSeconds: 410,
              contributionCount: 9,
              onTopicScore: 95,
            },
            {
              speakerName: "L. Petit",
              talkTimeSeconds: 260,
              contributionCount: 6,
              onTopicScore: 90,
            },
          ],
          numericalData: [
            {
              label: "Quorum",
              value: "9 of 11",
              context: "Titular members present",
            },
            {
              label: "Training plan vote",
              value: "8 for · 1 against · 2 abst.",
              context: "Favourable opinion",
            },
          ],
          status: "LOCKED",
          lockedAt: new Date("2026-09-17T18:03:00Z"),
          lockedBy: "m.leroy",
          complianceFindings: {
            create: [
              {
                category: "RISK",
                riskLevel: "CRITICAL",
                description:
                  "Vote on agenda item 4 recorded without a headcount",
                impactDescription:
                  "Deliberation could be challenged as invalid",
                confidence: 88,
              },
              {
                category: "RISK",
                riskLevel: "CRITICAL",
                description:
                  "BDESE consultation deadline not referenced in the record",
                ruleReference: "Art. L2312-16",
                impactDescription: "Procedural-challenge exposure",
                confidence: 92,
              },
              {
                category: "MISSING_DOCUMENT",
                riskLevel: "MEDIUM",
                description:
                  "Signed attendance sheet absent from source material",
                impactDescription: "Quorum evidenced in text only",
                confidence: 79,
              },
              {
                category: "RECOMMENDATION",
                riskLevel: "ADVISORY",
                description: "Attach the vote tally sheet as Annex B",
                impactDescription: "Strengthens the decision log",
                confidence: 90,
              },
              {
                category: "COMPLIANT",
                riskLevel: "COMPLIANT",
                description:
                  "Quorum met — 9 of 11 titular members present",
                ruleReference: "Art. L2314-1",
                impactDescription: "Meets the statutory threshold",
                confidence: 97,
              },
            ],
          },
        },
      },
    },
  });

  console.log("Seeded 1 user and 3 meeting requests (DRAFT, IN_REVIEW, LOCKED).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
