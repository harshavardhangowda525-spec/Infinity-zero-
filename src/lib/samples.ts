import type { Analysis, Difficulty, FrictionPoint, Workflow, WorkflowStep } from "./types";

/**
 * Built-in SAMPLE scenarios. These are prewritten illustrations, not live AI
 * output and not real customer data. The UI always labels them "Sample Analysis".
 */

export interface SampleScenario {
  id: string;
  situation: "business" | "freelancer" | "student" | "employee";
  label: string;
  workflow: Omit<Workflow, "id" | "createdAt">;
  analysis: Omit<Analysis, "id" | "workflowId" | "createdAt" | "source">;
}

type StepDef = [name: string, description: string, minutes: number, frictionKey?: string];

function steps(prefix: string, defs: StepDef[]): WorkflowStep[] {
  return defs.map(([name, description, minutes, fk], i) => ({
    id: `${prefix}_s${i + 1}`,
    name,
    description,
    minutes,
    friction: Boolean(fk),
    frictionId: fk ? `${prefix}_${fk}` : undefined,
  }));
}

function fp(prefix: string, key: string, stepIdx: number, perWeek: number, f: Omit<FrictionPoint, "id" | "stepId" | "frequencyPerWeek">): FrictionPoint {
  return { ...f, id: `${prefix}_${key}`, stepId: `${prefix}_b${stepIdx}`, frequencyPerWeek: perWeek };
}

function build(
  id: string,
  situation: SampleScenario["situation"],
  label: string,
  workflow: SampleScenario["workflow"],
  before: StepDef[],
  after: StepDef[],
  frictions: (perWeek: number) => FrictionPoint[],
  rest: { summary: string; causes: string[]; difficulty: Difficulty; limitations: string[]; nextAction: string },
): SampleScenario {
  const beforeSteps = steps(`${id}`, before).map((s, i) => ({ ...s, id: `${id}_b${i + 1}` }));
  const afterSteps = steps(`${id}`, after).map((s, i) => ({ ...s, id: `${id}_a${i + 1}`, friction: false, frictionId: undefined }));
  const currentMinutes = beforeSteps.reduce((a, s) => a + s.minutes, 0);
  const improvedMinutes = afterSteps.reduce((a, s) => a + s.minutes, 0);
  return {
    id,
    situation,
    label,
    workflow: { ...workflow, avgMinutes: currentMinutes, sampleId: id },
    analysis: {
      ...rest,
      frictionPoints: frictions(workflow.perWeek),
      beforeSteps,
      afterSteps,
      currentMinutes,
      improvedMinutes,
      perWeek: workflow.perWeek,
      assumptions: [
        "Durations are illustrative values for this sample scenario, not measurements.",
        `Assumes the workflow runs about ${workflow.perWeek} times per week.`,
        "Improved durations assume the suggested templates/tools are set up and used consistently.",
      ],
    },
  };
}

const gym = build(
  "gym",
  "business",
  "Gym owner — membership enquiries",
  {
    title: "Membership enquiry to sign-up",
    category: "Fitness & wellness",
    description:
      "When someone messages about membership, I reply manually on WhatsApp with prices, answer the same questions about timings and trainers, try to find a slot for a trial session by checking my diary, and remind them a few days later if they haven't joined.",
    perWeek: 25,
    avgMinutes: 0,
    steps: ["Reply to enquiry", "Answer common questions", "Book trial session", "Follow up"],
    notes: "",
  },
  [
    ["Customer enquiry", "Prospect messages on WhatsApp or Instagram", 1],
    ["Manual response", "Type out prices and plan details by hand", 6, "replies"],
    ["Repeat FAQs", "Answer the same timing / trainer questions", 5, "faq"],
    ["Book trial", "Check paper diary, propose times back and forth", 8, "sched"],
    ["Manual follow-up", "Remember and message non-converted leads", 5, "follow"],
    ["Conversion", "Prospect pays and joins", 3],
  ],
  [
    ["Customer enquiry", "Prospect messages on WhatsApp or Instagram", 1],
    ["Structured intake", "Quick-reply with plan card + FAQ link", 1.5],
    ["Self-serve booking", "Prospect picks a trial slot from a booking link", 1.5],
    ["Scheduled follow-up", "Reminder message queued automatically after 2 days", 1],
    ["Conversion", "Prospect pays and joins", 3],
  ],
  (w) => [
    fp("gym", "replies", 2, w, {
      name: "Typing the same price reply",
      description: "Plan prices and details are typed fresh for every enquiry.",
      category: "repeated_responses",
      severity: "high",
      minutesPerExecution: 6,
      improvedMinutes: 1,
      why: "Each enquiry restarts the same message from scratch, so time grows directly with lead volume.",
      improvement: "Save a WhatsApp Business quick reply containing plans, prices and a short FAQ link.",
      difficulty: "easy",
      confidence: "high",
      evidence: "'I reply manually on WhatsApp with prices'",
    }),
    fp("gym", "faq", 3, w, {
      name: "Answering repeat questions",
      description: "Timings, trainers and facilities are explained individually.",
      category: "repetitive_manual",
      severity: "medium",
      minutesPerExecution: 5,
      improvedMinutes: 0.5,
      why: "Questions with stable answers still need your attention every time.",
      improvement: "Publish a one-page FAQ / plan card and link it in the first reply.",
      difficulty: "easy",
      confidence: "high",
      evidence: "'answer the same questions about timings and trainers'",
    }),
    fp("gym", "sched", 4, w, {
      name: "Back-and-forth trial booking",
      description: "Trial slots are negotiated by message against a paper diary.",
      category: "manual_scheduling",
      severity: "high",
      minutesPerExecution: 8,
      improvedMinutes: 1.5,
      why: "Several messages are needed to agree a time, and the diary has to be checked each round.",
      improvement: "Share a free booking link (e.g. Google Calendar appointment slots) with trial times.",
      difficulty: "moderate",
      confidence: "medium",
      evidence: "'try to find a slot for a trial session by checking my diary'",
    }),
    fp("gym", "follow", 5, w, {
      name: "Remembering follow-ups",
      description: "Follow-ups depend on memory, so some leads are never contacted again.",
      category: "communication_delays",
      severity: "medium",
      minutesPerExecution: 5,
      improvedMinutes: 1,
      why: "Manual tracking costs time and lets warm leads go cold.",
      improvement: "Keep a simple lead list with a follow-up date, or use scheduled messages.",
      difficulty: "easy",
      confidence: "medium",
      evidence: "'remind them a few days later if they haven't joined'",
    }),
  ],
  {
    summary:
      "Most of the time in this enquiry flow goes into repeating the same information and coordinating trial times by hand. The actual sales conversation is a small part of each enquiry.",
    causes: [
      "No reusable reply templates for prices and FAQs",
      "Scheduling depends on a paper diary and manual back-and-forth",
      "Follow-ups are tracked from memory",
    ],
    difficulty: "easy",
    limitations: [
      "Templates can feel impersonal — keep a personal line at the top.",
      "Self-serve booking needs the diary kept up to date.",
      "Conversion impact is not estimated here; only time effort is.",
    ],
    nextAction: "Write one quick-reply template with plans and prices and use it for the next 10 enquiries.",
  },
);

const freelancer = build(
  "freelancer",
  "freelancer",
  "Freelancer — quotes, approvals and invoices",
  {
    title: "Quotation to invoice",
    category: "Freelance & consulting",
    description:
      "For every new project I write a quotation from scratch in a Word document, email it as a PDF, wait for the client to approve it over email, chase them if they don't respond, then copy the same details into a separate invoice template and send it after delivery.",
    perWeek: 4,
    avgMinutes: 0,
    steps: ["Write quotation", "Email PDF", "Wait for approval", "Chase client", "Create invoice"],
    notes: "",
  },
  [
    ["Project request", "Client describes the work", 5],
    ["Quote from scratch", "Write scope and pricing in a blank document", 35, "quote"],
    ["Email PDF", "Export, attach and email", 5, "tools"],
    ["Approval wait", "Chase unanswered approval emails", 15, "approve"],
    ["Re-type invoice", "Copy quote details into invoice template", 15, "dup"],
    ["Send invoice", "Email invoice after delivery", 5],
  ],
  [
    ["Project request", "Client describes the work", 5],
    ["Quotation template", "Fill a reusable quote with saved line items", 12],
    ["Online approval", "Client approves via a single link with a set reminder", 4],
    ["Quote → invoice", "Convert approved quote to invoice in one step", 3],
    ["Send invoice", "Email invoice after delivery", 3],
  ],
  (w) => [
    fp("freelancer", "quote", 2, w, {
      name: "Writing quotes from a blank page",
      description: "Scope, terms and pricing are rewritten for each project.",
      category: "repetitive_manual",
      severity: "high",
      minutesPerExecution: 35,
      improvedMinutes: 12,
      why: "Most quotes share the same structure and terms, but each one starts empty.",
      improvement: "Create a quote template with saved services, rates and standard terms.",
      difficulty: "easy",
      confidence: "high",
      evidence: "'I write a quotation from scratch in a Word document'",
    }),
    fp("freelancer", "approve", 4, w, {
      name: "Chasing approvals by email",
      description: "Approval sits in an inbox with no reminder or clear call to action.",
      category: "unnecessary_approvals",
      severity: "medium",
      minutesPerExecution: 15,
      improvedMinutes: 4,
      why: "Waiting and chasing delays the project start and adds context switching.",
      improvement: "Send a one-click approval link (e-sign or invoicing tool) with an automatic reminder.",
      difficulty: "moderate",
      confidence: "medium",
      evidence: "'wait for the client to approve it over email, chase them'",
    }),
    fp("freelancer", "dup", 5, w, {
      name: "Copying quote into invoice",
      description: "The same client and line-item details are typed twice.",
      category: "duplicate_entry",
      severity: "medium",
      minutesPerExecution: 15,
      improvedMinutes: 3,
      why: "Duplicate entry wastes time and introduces mismatched amounts.",
      improvement: "Use a tool that converts an approved quote directly into an invoice.",
      difficulty: "easy",
      confidence: "high",
      evidence: "'copy the same details into a separate invoice template'",
    }),
    fp("freelancer", "tools", 3, w, {
      name: "Disconnected documents and email",
      description: "Word, PDF export and email are separate manual steps.",
      category: "disconnected_tools",
      severity: "low",
      minutesPerExecution: 5,
      improvedMinutes: 2,
      why: "Moving files between tools adds small but repeated steps.",
      improvement: "Send quotes directly from the quoting tool instead of exporting files.",
      difficulty: "easy",
      confidence: "medium",
      evidence: "'email it as a PDF'",
    }),
  ],
  {
    summary:
      "The paperwork around each project — quoting, approval and invoicing — repeats the same information several times. Templates and a quote-to-invoice tool would remove most of the duplicate effort.",
    causes: ["No reusable quotation template", "Approval has no deadline or reminder", "Quote and invoice live in separate documents"],
    difficulty: "easy",
    limitations: [
      "Highly custom projects still need manual scoping.",
      "Some clients may prefer email approval.",
      "Tool subscriptions may have a cost.",
    ],
    nextAction: "Turn your last quotation into a reusable template with your standard services and terms.",
  },
);

const student = build(
  "student",
  "student",
  "Student — notes, assignments and revision",
  {
    title: "Weekly study organisation",
    category: "Education & study",
    description:
      "Every week I search through WhatsApp groups, my gallery and Google Drive to find lecture notes, write assignment deadlines in a notebook, and before exams I spend a long time rebuilding revision material because I can't find what I saved.",
    perWeek: 5,
    avgMinutes: 0,
    steps: ["Find notes", "Track deadlines", "Rebuild revision material"],
    notes: "",
  },
  [
    ["Search for notes", "Look through chats, gallery and Drive", 20, "search"],
    ["Copy deadlines", "Write deadlines into a notebook", 8, "dup"],
    ["Rebuild revision", "Recreate summaries already made before", 25, "rebuild"],
    ["Study", "Actual revision", 30],
  ],
  [
    ["One notes folder", "Save every note to one subject-tagged folder", 4],
    ["Calendar deadlines", "Add deadline once with a reminder", 2],
    ["Reuse summaries", "Open existing summary and update it", 8],
    ["Study", "Actual revision", 30],
  ],
  (w) => [
    fp("student", "search", 1, w, {
      name: "Hunting for notes across apps",
      description: "Notes are scattered across chats, the gallery and Drive.",
      category: "info_searching",
      severity: "high",
      minutesPerExecution: 20,
      improvedMinutes: 4,
      why: "Without one home for notes, each search covers several apps.",
      improvement: "Create one Drive folder per subject and save notes there the moment you receive them.",
      difficulty: "easy",
      confidence: "high",
      evidence: "'I search through WhatsApp groups, my gallery and Google Drive'",
    }),
    fp("student", "dup", 2, w, {
      name: "Copying deadlines by hand",
      description: "Deadlines live in a notebook without reminders.",
      category: "manual_scheduling",
      severity: "low",
      minutesPerExecution: 8,
      improvedMinutes: 2,
      why: "Manual lists need re-checking and can't remind you.",
      improvement: "Add each deadline to a calendar once, with a reminder 2 days before.",
      difficulty: "easy",
      confidence: "medium",
      evidence: "'write assignment deadlines in a notebook'",
    }),
    fp("student", "rebuild", 3, w, {
      name: "Rebuilding revision material",
      description: "Summaries are recreated because earlier versions can't be found.",
      category: "repetitive_manual",
      severity: "high",
      minutesPerExecution: 25,
      improvedMinutes: 8,
      why: "Work already done is repeated, which takes time from actual study.",
      improvement: "Keep one running summary document per subject and update it weekly.",
      difficulty: "easy",
      confidence: "medium",
      evidence: "'spend a long time rebuilding revision material'",
    }),
  ],
  {
    summary:
      "Much of the weekly study time goes into finding and recreating material rather than studying it. A single organised home for notes would remove most of that overhead.",
    causes: ["Notes stored in many places", "Deadlines tracked without reminders", "No single running summary per subject"],
    difficulty: "easy",
    limitations: ["Requires a consistent saving habit.", "Group-shared notes may still arrive in chats first."],
    nextAction: "Create one folder per subject today and move this week's notes into it.",
  },
);

const employee = build(
  "employee",
  "employee",
  "Employee — weekly status report",
  {
    title: "Weekly status report",
    category: "Corporate / employee",
    description:
      "Every Friday I collect updates from teammates over chat, copy numbers from two spreadsheets into a slide deck, send it to my manager for review, fix comments, and then email it to the wider team.",
    perWeek: 1,
    avgMinutes: 0,
    steps: ["Collect updates", "Copy numbers", "Manager review", "Email team"],
    notes: "",
  },
  [
    ["Collect updates", "Message each teammate and wait for replies", 40, "comm"],
    ["Copy numbers", "Copy figures from two spreadsheets into slides", 35, "dup"],
    ["Manager review", "Wait for review and apply comments", 30, "approve"],
    ["Email team", "Export and send the report", 10],
  ],
  [
    ["Shared update form", "Teammates fill a short form by Thursday", 10],
    ["Linked figures", "Slides pull numbers from one source sheet", 8],
    ["Light review", "Manager reviews only flagged changes", 12],
    ["Email team", "Export and send the report", 10],
  ],
  (w) => [
    fp("employee", "comm", 1, w, {
      name: "Chasing updates over chat",
      description: "Updates arrive at different times in different formats.",
      category: "communication_delays",
      severity: "high",
      minutesPerExecution: 40,
      improvedMinutes: 10,
      why: "Waiting on individual replies stretches the task across the day.",
      improvement: "Use a shared form or doc with a fixed Thursday deadline.",
      difficulty: "easy",
      confidence: "medium",
      evidence: "'collect updates from teammates over chat'",
    }),
    fp("employee", "dup", 2, w, {
      name: "Copying figures into slides",
      description: "Numbers are re-typed from two spreadsheets every week.",
      category: "duplicate_entry",
      severity: "high",
      minutesPerExecution: 35,
      improvedMinutes: 8,
      why: "Manual copying is slow and risks errors.",
      improvement: "Link charts to one source sheet so the deck refreshes automatically.",
      difficulty: "moderate",
      confidence: "medium",
      evidence: "'copy numbers from two spreadsheets into a slide deck'",
    }),
    fp("employee", "approve", 3, w, {
      name: "Full review every week",
      description: "The whole deck is reviewed even when little has changed.",
      category: "unnecessary_approvals",
      severity: "medium",
      minutesPerExecution: 30,
      improvedMinutes: 12,
      why: "Repeated full reviews add waiting time.",
      improvement: "Agree a template so only flagged changes need review.",
      difficulty: "moderate",
      confidence: "low",
      evidence: "'send it to my manager for review, fix comments'",
    }),
  ],
  {
    summary: "The report itself is short; collecting inputs and re-typing numbers takes most of the time.",
    causes: ["Unstructured update collection", "Figures copied manually between tools", "Full review cycle each week"],
    difficulty: "moderate",
    limitations: ["Depends on teammates adopting the form.", "Review changes need manager agreement."],
    nextAction: "Share a 3-question update form with your team before next Thursday.",
  },
);

export const SAMPLE_SCENARIOS: SampleScenario[] = [gym, freelancer, student, employee];

export function getSample(id: string): SampleScenario | undefined {
  return SAMPLE_SCENARIOS.find((s) => s.id === id);
}

/** The diagram shown on the overview before the user has analysed anything. */
export const OVERVIEW_SAMPLE_ID = "gym";
