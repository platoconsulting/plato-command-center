// Plato Consulting LLC - Agent Command Center
// All demo content lives here: agents, deliverable types, log lines, sample clients.
window.PLATO = {
  AGENTS: [
    { name: 'HERMES', role: 'Intake Coordinator', room: 0, skill: 93 },
    { name: 'ATHENA', role: 'Lead Researcher', room: 1, skill: 96 },
    { name: 'SOCRATES', role: 'Research Analyst', room: 1, skill: 91 },
    { name: 'EUCLID', role: 'Data Analyst', room: 2, skill: 94 },
    { name: 'ARCHIMEDES', role: 'Strategy Analyst', room: 2, skill: 90 },
    { name: 'HOMER', role: 'Senior Writer', room: 3, skill: 95 },
    { name: 'SAPPHO', role: 'Editor', room: 3, skill: 92 },
    { name: 'ARISTOTLE', role: 'QA Lead', room: 4, skill: 97 },
    { name: 'THEMIS', role: 'Compliance Reviewer', room: 4, skill: 89 },
    { name: 'IRIS', role: 'Client Delivery', room: 5, skill: 93 },
  ],

  DELIVERABLES: {
    research: {
      label: 'Market Research Brief', color: '#7cffb2', hours: 6,
      topics: [
        'demand for mobile IV therapy in Austin',
        'pricing for boutique fitness memberships',
        'growth in pet wellness subscriptions',
        'small-business demand for bookkeeping automation',
        'the short-term rental market in Hill Country towns',
      ],
      sections: [
        ['Executive summary', 'The short answer for {client} on {topic}: how big it is, where it is heading, and what to do next.'],
        ['Market definition and size', 'Who the buyers are, how the market is bounded, and a sized estimate with every assumption shown.'],
        ['Customer segments', 'The three or four segments that matter most, what each one wants, and how they buy.'],
        ['Trends and drivers', 'What is pushing demand up or down over the next 12 to 24 months.'],
        ['Risks and unknowns', 'Where the data is thin and what would change the recommendation.'],
        ['Recommendations', 'Concrete next steps for {client}, ranked by impact and effort.'],
        ['Sources and method', 'Where every number came from and how it was checked.'],
      ],
    },
    proposal: {
      label: 'Client Proposal', color: '#3be8ff', hours: 8,
      topics: [
        'a 90-day operations overhaul',
        'a customer onboarding redesign',
        'a sales process audit',
        'a hiring and org design plan',
        'a CRM cleanup and rollout',
      ],
      sections: [
        ['Our understanding', 'What {client} told us, in our own words, so both sides agree on the problem: {topic}.'],
        ['Objectives', 'The measurable outcomes this engagement is meant to deliver.'],
        ['Approach', 'A phased plan: discovery, design, rollout, and handoff.'],
        ['Deliverables and timeline', 'What {client} receives at each phase, and when.'],
        ['Team', 'Who at Plato Consulting LLC does the work and who owns each phase.'],
        ['Investment', 'Fees and payment schedule. Priced after the discovery call.'],
        ['Next steps', 'What happens after {client} signs, starting in week one.'],
      ],
    },
    competitive: {
      label: 'Competitive Analysis', color: '#ffa23b', hours: 7,
      topics: [
        'the top five local competitors',
        'national chains entering the market',
        'pricing and offer positioning',
        'online reviews and reputation',
        'service area overlap',
      ],
      sections: [
        ['Landscape overview', 'The field around {client}: who competes for the same customers and how crowded it is.'],
        ['Competitor profiles', 'One page per competitor: offer, positioning, strengths, and weak spots.'],
        ['Side by side comparison', 'How the offers stack up on the factors customers actually choose on.'],
        ['Positioning and pricing', 'Where each player sits on price and promise, described in plain terms.'],
        ['SWOT for {client}', 'Strengths, weaknesses, opportunities, and threats, focused on {topic}.'],
        ['White space', 'Gaps nobody is serving well that {client} could own.'],
        ['Recommendations', 'The moves to make in the next 90 days.'],
      ],
    },
    sop: {
      label: 'Process SOP', color: '#ff7ae0', hours: 4,
      topics: [
        'new client onboarding',
        'weekly reporting',
        'invoice follow-up',
        'lead intake and qualification',
        'project closeout',
      ],
      sections: [
        ['Purpose and scope', 'Why this procedure exists and where it starts and stops: {topic}.'],
        ['Roles', 'Who does each step and who signs off.'],
        ['Inputs and tools', 'What you need before starting, and which systems are used.'],
        ['Procedure', 'Numbered steps, written so a new hire can follow them on day one.'],
        ['Quality checks', 'How to confirm each step was done right.'],
        ['Exceptions', 'What to do when something does not fit the normal path.'],
        ['Revision log', 'Who changed this SOP, when, and why.'],
      ],
    },
    memo: {
      label: 'Strategy Memo', color: '#ffe14f', hours: 3,
      topics: [
        'whether to open a second location',
        'in-house vs. outsourced marketing',
        'raising prices 8% in Q1',
        'which software stack to standardize on',
        'adding a new service line',
      ],
      sections: [
        ['Bottom line', 'The recommendation for {client} on {topic}, in two sentences.'],
        ['Context', 'What prompted the question and what we know so far.'],
        ['Options considered', 'Each realistic option with its upside, cost, and risk.'],
        ['Recommendation', 'The option we would choose and why.'],
        ['Risks and mitigations', 'What could go wrong and how to limit it.'],
        ['Decision needed', 'Who needs to decide what, and by when.'],
      ],
    },
  },

  // One entry per station, in line order. {agent} {client} {type} {topic} {id} {n} {m} {q} {words} {sec}
  STAGE_LOGS: [
    {
      start: ['{agent} opened job {id}: {type} for {client}.', '{agent} is reading the brief from {client}.'],
      done: ['Scope locked: {topic}.', 'Brief parsed. {n} requirements tagged, {m} open questions flagged.'],
    },
    {
      start: ['{agent} is pulling sources on {topic}.', '{agent} is reviewing public data and industry reports.'],
      done: ['{n} sources gathered, {m} kept after vetting.', 'Research pack ready: {n} sources, {m} key data points.'],
    },
    {
      start: ['{agent} is building the analysis framework.', '{agent} is running the numbers on {topic}.'],
      done: ['{n} insights ranked by impact.', 'Model built. {n} scenarios tested, {m} hold up.'],
    },
    {
      start: ['{agent} is drafting {sec} sections.', '{agent} is turning the analysis into a story.'],
      done: ['Draft v1 complete: {words} words.', 'Draft done, {words} words, edited for plain language.'],
    },
    {
      start: ['{agent} is fact-checking every claim.', '{agent} is checking the draft against the brief.'],
      done: ['QA score {q}/100. Passed.', 'QA passed at {q}/100 with {m} fixes applied.'],
    },
    {
      start: ['{agent} is packaging the deliverable.', '{agent} is formatting it for {client}.'],
      done: ['Packaged and signed off.', 'Final file built and ready to send.'],
    },
  ],

  CLIENTS: [
    'Northwind Logistics', 'Cedar & Pine Dental', 'Brightline Fitness', 'Harbor Street Bakery',
    'Summit Roofing Co.', 'Oakridge Property Group', 'Lumen Analytics', 'Blue Mesa Clinics',
    'Copperleaf Landscaping', 'Riverbend Vet Care',
  ],
};
