/**
 * Static scenario data for the /explore feature.
 * All data is hardcoded — no backend calls needed.
 */

import type { QuestionType, ActionType, ActionPriority } from '../types';

export interface DemoPerspective {
  name: string;
  summary: string;
  count: number;
}

export interface DemoTheme {
  theme: string;
  summary: string;
  frequency: number;
  perspectives: DemoPerspective[];
  key_points?: string[];
}

export interface DemoRatingStats {
  average: number;
  min_value: number;
  max_value: number;
  scale_min: number;
  scale_max: number;
  distribution: Record<string, number>;
  total_responses: number;
}

export interface DemoPollChoice {
  choice_id: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DemoPollStats {
  total_responses: number;
  choices: DemoPollChoice[];
}

export interface DemoQuestionAnalysis {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  response_count: number;
  themes?: DemoTheme[];
  summary?: string;
  rating_stats?: DemoRatingStats;
  poll_stats?: DemoPollStats;
}

export interface DemoSurprisingInsight {
  title: string;
  description: string;
}

export interface DemoAnalysis {
  overall_summary: string;
  question_analyses: DemoQuestionAnalysis[];
  surprising_insights: DemoSurprisingInsight[];
  total_responses_analyzed: number;
  num_clusters_found: number;
}

export interface DemoSuggestedAction {
  title: string;
  description: string;
  action_type: ActionType;
  priority: ActionPriority;
}

// ─── Journal-specific types ──────────────────────────────────────────────────

export interface DemoThemeTimeline {
  theme: string;
  entry_count: number;
  trajectory: 'growing' | 'stable' | 'declining' | 'resolved';
  summary: string;
}

export interface DemoMoodDataPoint {
  date: string;
  sentiment_score: number;
  dominant_mood: string;
}

export interface DemoMoodTrajectory {
  data_points: DemoMoodDataPoint[];
  overall_trend: 'improving' | 'stable' | 'declining';
  summary: string;
}

export interface DemoPatternInsight {
  pattern_type: 'recurring_concern' | 'positive_shift' | 'correlation' | 'cyclical';
  title: string;
  description: string;
}

export interface DemoJournalAnalysis {
  overall_summary: string;
  theme_timeline: DemoThemeTimeline[];
  mood_trajectory: DemoMoodTrajectory;
  patterns: DemoPatternInsight[];
  total_entries_analyzed: number;
  date_range_start: string;
  date_range_end: string;
}

// ─── Scenario types (discriminated union) ────────────────────────────────────

interface BaseScenario {
  id: string;
  title: string;
  description: string;
  category: 'Workplace' | 'Events' | 'Education' | 'Social' | 'Personal';
  roleContext: {
    role: string;
    situation: string;
    detail: string;
  };
}

export interface ConversationScenario extends BaseScenario {
  type: 'conversation';
  conversation: {
    title: string;
    responseCount: number;
    questionCount: number;
  };
  analysis: DemoAnalysis;
  suggestedActions: DemoSuggestedAction[];
}

export interface JournalScenario extends BaseScenario {
  type: 'journal';
  journal: {
    title: string;
    entryCount: number;
    duration: string;
  };
  journalAnalysis: DemoJournalAnalysis;
}

export type ExploreScenario = ConversationScenario | JournalScenario;

export const EXPLORE_SCENARIOS: ExploreScenario[] = [
  // ─── 1. Team Sprint Retrospective ─────────────────────────────────────
  {
    type: 'conversation',
    id: 'team-retro',
    title: 'Team Sprint Retrospective',
    description: 'See how AI surfaces themes from anonymous team feedback after a sprint.',
    category: 'Workplace',
    roleContext: {
      role: 'a team lead',
      situation: 'Your 8-person engineering team just finished a demanding 2-week sprint. You want honest feedback on what worked, what didn\'t, and how to improve.',
      detail: 'Everyone responded anonymously. Here\'s what the AI found.',
    },
    conversation: {
      title: 'Sprint 14 Retrospective',
      responseCount: 8,
      questionCount: 3,
    },
    analysis: {
      overall_summary: 'The team is generally positive about sprint outcomes but frustrated by mid-sprint scope changes and inconsistent communication. Technical debt from the auth migration remains a top concern — 6 of 8 respondents mentioned it directly. Despite challenges, the team feels the new deployment process was a significant improvement.',
      total_responses_analyzed: 8,
      num_clusters_found: 5,
      surprising_insights: [
        {
          title: 'Deployment improvement went unnoticed by leadership',
          description: 'Multiple team members noted that the new CI/CD pipeline cut deploy times by 60%, but this win was never shared beyond the team. There\'s a sense that impactful infrastructure work goes unrecognized.',
        },
        {
          title: 'Mid-sprint scope changes are more damaging than the team lets on',
          description: 'While scope changes are acknowledged as normal, several responses reveal they cause cascading context-switching costs that persist for days, not hours. The team absorbs this silently.',
        },
        {
          title: 'Pair programming was the most valued practice this sprint',
          description: 'Despite not being formally scheduled, ad-hoc pair programming sessions were mentioned by 5 respondents as the most helpful practice for knowledge sharing and unblocking.',
        },
      ],
      question_analyses: [
        {
          question_id: 'q1',
          question_text: 'What went well this sprint?',
          question_type: 'text',
          response_count: 8,
          themes: [
            {
              theme: 'Improved deployment pipeline',
              summary: 'The new CI/CD pipeline significantly reduced deployment friction. Team members felt more confident shipping changes frequently.',
              frequency: 6,
              perspectives: [
                { name: 'Positive impact', summary: 'Deploy times dropped from 20 minutes to under 8, enabling multiple deploys per day.', count: 4 },
                { name: 'Confidence boost', summary: 'Automated rollback capability makes the team less anxious about deploying on Fridays.', count: 2 },
              ],
              key_points: [
                'CI/CD pipeline deploy time reduced by ~60%',
                'Automated rollback increased confidence',
                'Multiple daily deploys now possible',
              ],
            },
            {
              theme: 'Effective collaboration',
              summary: 'Ad-hoc pair programming and quick sync calls helped the team navigate complex tasks and share knowledge effectively.',
              frequency: 5,
              perspectives: [
                { name: 'Knowledge transfer', summary: 'Pairing helped newer members ramp up on the auth codebase faster.', count: 3 },
                { name: 'Unblocking', summary: 'Quick 15-minute calls prevented day-long blocks on tricky problems.', count: 2 },
              ],
              key_points: [
                'Pair programming was the most valued practice',
                'Short sync calls prevented prolonged blocks',
                'Newer team members benefited most',
              ],
            },
          ],
        },
        {
          question_id: 'q2',
          question_text: 'What could be improved?',
          question_type: 'text',
          response_count: 8,
          themes: [
            {
              theme: 'Scope changes mid-sprint',
              summary: 'Mid-sprint priority shifts disrupted planned work and caused cascading delays. The team feels the cost of context-switching is underestimated.',
              frequency: 6,
              perspectives: [
                { name: 'Disruption cost', summary: 'Scope changes require re-planning, new code reviews, and abandoned work. The real cost is 2-3x the new task estimate.', count: 4 },
                { name: 'Communication gap', summary: 'Changes arrive as Slack messages without context on urgency or trade-offs.', count: 2 },
              ],
              key_points: [
                'At least 3 mid-sprint scope changes occurred',
                'Context-switching costs persist for days',
                'Changes lack clear urgency justification',
              ],
            },
            {
              theme: 'Technical debt from auth migration',
              summary: 'Unfinished migration work is creating daily friction — duplicated logic, inconsistent error handling, and fragile session management.',
              frequency: 6,
              perspectives: [
                { name: 'Daily friction', summary: 'Developers encounter auth-related workarounds almost daily, slowing feature work.', count: 4 },
                { name: 'Risk accumulation', summary: 'Each sprint without cleanup increases the risk of auth-related incidents.', count: 2 },
              ],
              key_points: [
                'Auth migration is ~70% complete, remaining 30% causes most issues',
                'Duplicated auth logic across old and new systems',
                'Team spends ~20% of time on workarounds',
              ],
            },
          ],
        },
        {
          question_id: 'q3',
          question_text: 'How would you rate this sprint overall?',
          question_type: 'rating',
          response_count: 8,
          rating_stats: {
            average: 3.5,
            min_value: 2,
            max_value: 5,
            scale_min: 1,
            scale_max: 5,
            distribution: { '1': 0, '2': 1, '3': 3, '4': 3, '5': 1 },
            total_responses: 8,
          },
        },
      ],
    },
    suggestedActions: [
      {
        title: 'Establish a scope-change protocol for mid-sprint requests',
        description: 'Create a lightweight process: new requests go through a quick impact assessment before entering the sprint. Include estimated context-switching cost.',
        action_type: 'change',
        priority: 'high',
      },
      {
        title: 'Dedicate 2 days next sprint to auth migration cleanup',
        description: 'Ring-fence time for completing the remaining 30% of the auth migration. The team estimates this would eliminate ~20% of daily friction.',
        action_type: 'investigate',
        priority: 'high',
      },
      {
        title: 'Share the deployment pipeline win with leadership',
        description: 'Present the 60% deploy time reduction to the broader org. This builds visibility for infrastructure investments and team morale.',
        action_type: 'communicate',
        priority: 'medium',
      },
      {
        title: 'Formalize optional pair programming sessions',
        description: 'Schedule 2-3 optional pairing slots per week. The team organically found this valuable — light structure would make it more accessible.',
        action_type: 'change',
        priority: 'medium',
      },
    ],
  },

  // ─── 2. Workshop Feedback ─────────────────────────────────────────────
  {
    type: 'conversation',
    id: 'workshop-feedback',
    title: 'Workshop Feedback',
    description: 'Explore how ratings, polls, and open text combine for rich event insights.',
    category: 'Events',
    roleContext: {
      role: 'a workshop facilitator',
      situation: 'You just ran a 3-hour "Intro to Data Visualization" workshop for 18 attendees. You want to know what landed, what confused people, and whether they\'d attend a follow-up.',
      detail: 'All 18 attendees responded anonymously. Here\'s the analysis.',
    },
    conversation: {
      title: 'Intro to Data Visualization — Workshop Feedback',
      responseCount: 18,
      questionCount: 4,
    },
    analysis: {
      overall_summary: 'The workshop received strong overall ratings (avg 4.2/5) with particular praise for the hands-on exercises and clear explanations. The main criticism is pacing — attendees with no coding background felt the second half moved too fast, while experienced participants wanted deeper content. There\'s strong interest in a follow-up session, with 72% saying "Definitely" or "Probably."',
      total_responses_analyzed: 18,
      num_clusters_found: 4,
      surprising_insights: [
        {
          title: 'The "bad" chart examples were the most memorable moment',
          description: 'Multiple attendees independently cited the segment where you showed deliberately misleading charts as the highlight. This interactive critique exercise created more engagement than the tool demonstrations.',
        },
        {
          title: 'Beginners and advanced attendees agree on one thing',
          description: 'Despite different pacing preferences, both groups said the real-world dataset exercise was the most valuable part. Working with messy data resonated more than polished examples.',
        },
      ],
      question_analyses: [
        {
          question_id: 'q1',
          question_text: 'How would you rate the workshop overall?',
          question_type: 'rating',
          response_count: 18,
          rating_stats: {
            average: 4.2,
            min_value: 3,
            max_value: 5,
            scale_min: 1,
            scale_max: 5,
            distribution: { '1': 0, '2': 0, '3': 3, '4': 8, '5': 7 },
            total_responses: 18,
          },
        },
        {
          question_id: 'q2',
          question_text: 'What did you find most valuable, and what would you change?',
          question_type: 'text',
          response_count: 18,
          themes: [
            {
              theme: 'Hands-on exercises were the highlight',
              summary: 'Attendees overwhelmingly valued the interactive exercises over lecture segments. The real-world dataset exercise was mentioned most frequently as the peak learning moment.',
              frequency: 14,
              perspectives: [
                { name: 'Learning by doing', summary: 'Practicing with actual tools and data made concepts stick better than slides.', count: 9 },
                { name: 'Real-world relevance', summary: 'Using a messy, real dataset felt more applicable to daily work than polished examples.', count: 5 },
              ],
              key_points: [
                'Hands-on exercises mentioned by 14 of 18 attendees',
                'Real-world dataset exercise was the most cited highlight',
                'Interactive chart critique was surprisingly engaging',
              ],
            },
            {
              theme: 'Pacing didn\'t suit all skill levels',
              summary: 'The second half of the workshop moved too quickly for beginners while not being deep enough for experienced attendees. A skill-level assessment beforehand could help.',
              frequency: 8,
              perspectives: [
                { name: 'Too fast for beginners', summary: 'Attendees without coding background struggled to keep up during the coding-heavy second half.', count: 5 },
                { name: 'Too shallow for experts', summary: 'Experienced participants wanted more advanced customization techniques and performance optimization.', count: 3 },
              ],
              key_points: [
                'Skill level split visible in the second half',
                'Beginners needed more time on fundamentals',
                'Advanced users wanted deeper technical content',
              ],
            },
            {
              theme: 'Clear and approachable explanations',
              summary: 'The facilitator\'s explanations were praised for being jargon-free and relatable. Analogies and visual comparisons made complex concepts accessible.',
              frequency: 10,
              perspectives: [
                { name: 'Accessible language', summary: 'Technical concepts were explained without assuming prior knowledge.', count: 6 },
                { name: 'Good analogies', summary: 'Comparisons to everyday situations helped cement understanding.', count: 4 },
              ],
              key_points: [
                'Jargon-free delivery praised by majority',
                'Visual analogies were particularly effective',
                'Good balance of theory and practice in first half',
              ],
            },
          ],
        },
        {
          question_id: 'q3',
          question_text: 'Would you attend a follow-up workshop?',
          question_type: 'single_choice',
          response_count: 18,
          poll_stats: {
            total_responses: 18,
            choices: [
              { choice_id: 'c1', label: 'Definitely', count: 8, percentage: 44.4 },
              { choice_id: 'c2', label: 'Probably', count: 5, percentage: 27.8 },
              { choice_id: 'c3', label: 'Maybe', count: 4, percentage: 22.2 },
              { choice_id: 'c4', label: 'No', count: 1, percentage: 5.6 },
            ],
          },
        },
        {
          question_id: 'q4',
          question_text: 'How clear were the explanations?',
          question_type: 'rating',
          response_count: 18,
          rating_stats: {
            average: 4.4,
            min_value: 3,
            max_value: 5,
            scale_min: 1,
            scale_max: 5,
            distribution: { '1': 0, '2': 0, '3': 2, '4': 7, '5': 9 },
            total_responses: 18,
          },
        },
      ],
    },
    suggestedActions: [
      {
        title: 'Offer beginner and intermediate tracks for the follow-up',
        description: 'Split the follow-up into two levels based on a quick pre-assessment. This addresses the main pacing criticism while serving both audiences.',
        action_type: 'change',
        priority: 'high',
      },
      {
        title: 'Expand the real-world dataset exercise',
        description: 'Given its popularity, consider making it the centerpiece of the follow-up workshop. Include data cleaning, visualization selection, and storytelling.',
        action_type: 'investigate',
        priority: 'medium',
      },
      {
        title: 'Keep the misleading charts segment',
        description: 'The interactive chart critique was unexpectedly popular. Keep it as a signature element and consider expanding it with audience-submitted examples.',
        action_type: 'celebrate',
        priority: 'medium',
      },
    ],
  },

  // ─── 3. End-of-Course Feedback ────────────────────────────────────────
  {
    type: 'conversation',
    id: 'course-feedback',
    title: 'End-of-Course Feedback',
    description: 'See how analysis handles large response sets with mixed question types.',
    category: 'Education',
    roleContext: {
      role: 'an instructor',
      situation: 'Your 12-week "Introduction to Web Development" course just ended. 26 of 30 students submitted anonymous feedback covering the curriculum, teaching style, and projects.',
      detail: 'Here\'s what the AI uncovered from all 26 responses.',
    },
    conversation: {
      title: 'Web Dev 101 — End of Course Feedback',
      responseCount: 26,
      questionCount: 4,
    },
    analysis: {
      overall_summary: 'Students gave the course strong ratings for content quality (avg 4.1/5) and instructor effectiveness (avg 4.3/5). The hands-on projects were the clear highlight, with students valuing the portfolio-building approach. The main areas for improvement are pacing in the CSS/layout section and the desire for more real-world deployment experience. Several students noted that the course exceeded their expectations.',
      total_responses_analyzed: 26,
      num_clusters_found: 6,
      surprising_insights: [
        {
          title: 'Students value the struggle',
          description: 'Rather than wanting easier projects, multiple students explicitly said that getting stuck and debugging was the most valuable learning experience. They want challenge, not hand-holding — but better debugging resources.',
        },
        {
          title: 'Peer code review was transformative for some students',
          description: 'The peer code review exercise in week 8 was mentioned by 10 students as a turning point. Several said seeing how others approached the same problem was more instructive than any lecture.',
        },
        {
          title: 'Career confidence increased significantly',
          description: 'Unprompted, 8 students mentioned feeling more confident about pursuing web development as a career. This suggests the course has impact beyond technical skills.',
        },
      ],
      question_analyses: [
        {
          question_id: 'q1',
          question_text: 'How would you rate the course content?',
          question_type: 'rating',
          response_count: 26,
          rating_stats: {
            average: 4.1,
            min_value: 2,
            max_value: 5,
            scale_min: 1,
            scale_max: 5,
            distribution: { '1': 0, '2': 2, '3': 3, '4': 11, '5': 10 },
            total_responses: 26,
          },
        },
        {
          question_id: 'q2',
          question_text: 'How would you rate the instructor\'s teaching effectiveness?',
          question_type: 'rating',
          response_count: 26,
          rating_stats: {
            average: 4.3,
            min_value: 3,
            max_value: 5,
            scale_min: 1,
            scale_max: 5,
            distribution: { '1': 0, '2': 0, '3': 4, '4': 10, '5': 12 },
            total_responses: 26,
          },
        },
        {
          question_id: 'q3',
          question_text: 'What aspects of the course were most and least valuable?',
          question_type: 'text',
          response_count: 26,
          themes: [
            {
              theme: 'Portfolio projects drove real learning',
              summary: 'Building portfolio-ready projects was cited as the most valuable aspect. Students appreciated that they finished the course with tangible work to show.',
              frequency: 19,
              perspectives: [
                { name: 'Practical output', summary: 'Having a deployed portfolio at the end felt like a real accomplishment, not just a certificate.', count: 12 },
                { name: 'Learning through building', summary: 'Project-based learning was more effective than textbook exercises.', count: 7 },
              ],
              key_points: [
                'Portfolio projects mentioned by 19 of 26 students',
                'Students left with deployable work',
                'Project-based > exercise-based learning',
              ],
            },
            {
              theme: 'CSS/layout section felt rushed',
              summary: 'Weeks 3-4 covering CSS layouts (flexbox, grid) moved too quickly for most students. This created a knowledge gap that persisted into later weeks.',
              frequency: 14,
              perspectives: [
                { name: 'Too fast', summary: 'Concepts like flexbox and grid were introduced and applied in the same session, without enough practice time.', count: 9 },
                { name: 'Cascading confusion', summary: 'Weak CSS foundations made responsive design in week 6 harder than it needed to be.', count: 5 },
              ],
              key_points: [
                'CSS layout section needs 1-2 additional weeks',
                'Flexbox and grid need separate dedicated sessions',
                'Weak CSS foundations cascade into later topics',
              ],
            },
            {
              theme: 'Peer code review was a standout exercise',
              summary: 'The week 8 peer review exercise was unexpectedly impactful. Students gained perspective by reading others\' code and receiving constructive feedback.',
              frequency: 10,
              perspectives: [
                { name: 'Learning from peers', summary: 'Seeing different approaches to the same problem was eye-opening.', count: 7 },
                { name: 'Feedback skills', summary: 'Learning to give and receive code feedback felt like a professional skill.', count: 3 },
              ],
              key_points: [
                'Peer review in week 8 cited as a turning point',
                'Multiple approaches to same problem were instructive',
                'Students want more peer interaction opportunities',
              ],
            },
            {
              theme: 'Want more deployment and DevOps exposure',
              summary: 'Students want to learn how to deploy and maintain their projects beyond local development. The gap between "it works on my machine" and "it\'s live" feels daunting.',
              frequency: 8,
              perspectives: [
                { name: 'Deployment anxiety', summary: 'Students can build features but feel unsure about making their work accessible online.', count: 5 },
                { name: 'Real-world skills gap', summary: 'Version control, hosting, and CI/CD are expected in job postings but barely covered.', count: 3 },
              ],
              key_points: [
                'Deployment covered in 1 session — students want 2-3',
                'Git workflow needs more practice time',
                'Hosting and domain setup are practical knowledge gaps',
              ],
            },
          ],
        },
        {
          question_id: 'q4',
          question_text: 'Any other comments or suggestions?',
          question_type: 'text',
          response_count: 20,
          summary: 'Additional comments were overwhelmingly positive, with many students expressing gratitude and increased career confidence. Specific suggestions include office hours, a course Discord for alumni, and optional advanced modules for students who want to go deeper.',
          themes: [
            {
              theme: 'Desire for ongoing community',
              summary: 'Students want a way to stay connected after the course ends — through a Discord server, alumni network, or optional meetups.',
              frequency: 8,
              perspectives: [
                { name: 'Continued learning', summary: 'Students want to keep learning and sharing after the course.', count: 5 },
                { name: 'Networking', summary: 'Building connections with peers who share their learning journey.', count: 3 },
              ],
              key_points: [
                'Course Discord or alumni channel requested by multiple students',
                'Students value the peer network they built',
                'Optional post-course meetups suggested',
              ],
            },
          ],
        },
      ],
    },
    suggestedActions: [
      {
        title: 'Extend CSS/layout section by 1-2 weeks',
        description: 'Add dedicated sessions for flexbox and grid with more practice time. This addresses the most common criticism and prevents cascading confusion in later weeks.',
        action_type: 'change',
        priority: 'high',
      },
      {
        title: 'Add a second peer code review session',
        description: 'Given the strong impact of the week 8 peer review, add another session around week 5. Earlier exposure to different approaches accelerates learning.',
        action_type: 'change',
        priority: 'medium',
      },
      {
        title: 'Expand deployment content to 2-3 sessions',
        description: 'Cover Git workflow, hosting setup, and basic CI/CD across multiple sessions. Students need more hands-on deployment practice to feel job-ready.',
        action_type: 'change',
        priority: 'high',
      },
      {
        title: 'Create a post-course alumni channel',
        description: 'Set up a Discord or Slack for course alumni. Low effort, high impact for retention and community building.',
        action_type: 'communicate',
        priority: 'medium',
      },
    ],
  },

  // ─── 4. Friend Group Trip Planning ────────────────────────────────────
  {
    type: 'conversation',
    id: 'trip-planning',
    title: 'Friend Group Trip Planning',
    description: 'See polls, ratings, and text combined for group decision-making.',
    category: 'Social',
    roleContext: {
      role: 'the trip organizer',
      situation: 'You\'re planning a long weekend trip with 5 friends. Everyone has different preferences and budgets, so you used Mosaic to collect honest input without anyone feeling pressured.',
      detail: 'All 6 people (including you) responded anonymously. Here\'s the breakdown.',
    },
    conversation: {
      title: 'Summer Trip Planning',
      responseCount: 6,
      questionCount: 5,
    },
    analysis: {
      overall_summary: 'The group has strong consensus on timing (late July) and moderate agreement on destination (beach over mountains, 4-2). Budget is the most sensitive topic — there\'s a meaningful gap between what different members can spend, ranging from $300 to $800. The group wants a relaxed, activity-flexible trip rather than a packed itinerary.',
      total_responses_analyzed: 6,
      num_clusters_found: 3,
      surprising_insights: [
        {
          title: 'Budget range is wider than expected',
          description: 'The gap between the lowest and highest comfortable budget is nearly 3x ($300 vs $800). Anonymous responses revealed constraints that might not surface in a group chat.',
        },
        {
          title: 'Everyone wants downtime built into the schedule',
          description: 'Despite different activity preferences, all 6 respondents mentioned wanting unstructured free time. No one wants a minute-by-minute itinerary.',
        },
      ],
      question_analyses: [
        {
          question_id: 'q1',
          question_text: 'Where should we go?',
          question_type: 'single_choice',
          response_count: 6,
          poll_stats: {
            total_responses: 6,
            choices: [
              { choice_id: 'c1', label: 'Beach (Outer Banks)', count: 4, percentage: 66.7 },
              { choice_id: 'c2', label: 'Mountains (Asheville)', count: 2, percentage: 33.3 },
              { choice_id: 'c3', label: 'City trip (Nashville)', count: 0, percentage: 0 },
              { choice_id: 'c4', label: 'Lake house (Lake Anna)', count: 0, percentage: 0 },
            ],
          },
        },
        {
          question_id: 'q2',
          question_text: 'Which weekend works best?',
          question_type: 'single_choice',
          response_count: 6,
          poll_stats: {
            total_responses: 6,
            choices: [
              { choice_id: 'c1', label: 'July 18-21', count: 1, percentage: 16.7 },
              { choice_id: 'c2', label: 'July 25-28', count: 4, percentage: 66.7 },
              { choice_id: 'c3', label: 'Aug 1-4', count: 1, percentage: 16.7 },
              { choice_id: 'c4', label: 'Aug 8-11', count: 0, percentage: 0 },
            ],
          },
        },
        {
          question_id: 'q3',
          question_text: 'What\'s your comfortable budget for the trip (per person)?',
          question_type: 'single_choice',
          response_count: 6,
          poll_stats: {
            total_responses: 6,
            choices: [
              { choice_id: 'b1', label: 'Under $300', count: 0, percentage: 0 },
              { choice_id: 'b2', label: '$300 - $400', count: 2, percentage: 33.3 },
              { choice_id: 'b3', label: '$400 - $600', count: 3, percentage: 50.0 },
              { choice_id: 'b4', label: '$600 - $800', count: 1, percentage: 16.7 },
              { choice_id: 'b5', label: '$800+', count: 0, percentage: 0 },
            ],
          },
          summary: 'Most of the group is comfortable in the $300-$600 range. The median sits around $400-$500, which better represents the group\'s center than the average.',
        },
        {
          question_id: 'q4',
          question_text: 'What activities are you most interested in?',
          question_type: 'multiple_choice',
          response_count: 6,
          poll_stats: {
            total_responses: 6,
            choices: [
              { choice_id: 'c1', label: 'Beach/swimming', count: 5, percentage: 83.3 },
              { choice_id: 'c2', label: 'Restaurants/food', count: 5, percentage: 83.3 },
              { choice_id: 'c3', label: 'Board games/hangout', count: 4, percentage: 66.7 },
              { choice_id: 'c4', label: 'Hiking', count: 3, percentage: 50.0 },
              { choice_id: 'c5', label: 'Water sports', count: 2, percentage: 33.3 },
              { choice_id: 'c6', label: 'Nightlife/bars', count: 2, percentage: 33.3 },
            ],
          },
        },
        {
          question_id: 'q5',
          question_text: 'Anything else we should consider for the trip?',
          question_type: 'text',
          response_count: 6,
          themes: [
            {
              theme: 'Flexible schedule over packed itinerary',
              summary: 'Everyone wants a mix of group activities and free time. No one wants every hour planned.',
              frequency: 6,
              perspectives: [
                { name: 'Downtime matters', summary: 'Free time to nap, read, or wander is just as important as group activities.', count: 4 },
                { name: 'Optional activities', summary: 'Plan a few things but make attendance optional so nobody feels obligated.', count: 2 },
              ],
              key_points: [
                'Build in unstructured free time each day',
                'Make group activities optional, not mandatory',
                'Mornings flexible, one group activity per afternoon',
              ],
            },
            {
              theme: 'Budget-conscious accommodation',
              summary: 'Several people prefer splitting a rental house over individual hotel rooms — it\'s cheaper and more social.',
              frequency: 4,
              perspectives: [
                { name: 'Cost sharing', summary: 'A shared rental splits costs more evenly and keeps the trip affordable for everyone.', count: 3 },
                { name: 'Social aspect', summary: 'Being under one roof is part of the fun and makes hangout time natural.', count: 1 },
              ],
              key_points: [
                'Shared house/Airbnb preferred over hotel',
                'Cost splitting makes the trip more inclusive',
                'Cooking some meals at the house saves money',
              ],
            },
          ],
        },
      ],
    },
    suggestedActions: [
      {
        title: 'Book Outer Banks for July 25-28',
        description: 'The group\'s top choices are clear: beach destination, late July weekend. Start looking at shared rental houses for 6 people.',
        action_type: 'change',
        priority: 'high',
      },
      {
        title: 'Set a shared budget target around $400-450/person',
        description: 'Use the median rather than average to be inclusive of tighter budgets. A shared rental with some home-cooked meals can keep costs in this range.',
        action_type: 'communicate',
        priority: 'high',
      },
      {
        title: 'Create a loose daily structure',
        description: 'Plan one optional group activity per afternoon (beach, restaurant, hike) but keep mornings and evenings unstructured.',
        action_type: 'change',
        priority: 'medium',
      },
    ],
  },

  // ─── 5. Personal Reflection Journal ───────────────────────────────────
  {
    type: 'journal',
    id: 'gratitude-journal',
    title: 'Personal Reflection Journal',
    description: 'See how journaling over time reveals mood trends, recurring themes, and personal patterns.',
    category: 'Personal',
    roleContext: {
      role: 'someone building a daily reflection habit',
      situation: 'You\'ve been using Mosaic\'s journal feature to write short daily reflections for the past 4 weeks. Each entry captures what happened, how you felt, and what you\'re grateful for.',
      detail: 'After 24 entries, the AI analyzed your writing for themes, mood trajectory, and patterns. Here\'s what it found.',
    },
    journal: {
      title: 'Daily Reflections',
      entryCount: 24,
      duration: '4 weeks',
    },
    journalAnalysis: {
      overall_summary: 'Over the past 4 weeks, your entries show a clear upward trend in mood and energy. Early entries reflect stress around a work deadline, but this resolved around week 2. A recurring theme is the positive impact of morning walks — entries written after walks consistently have higher sentiment. Social interactions are your strongest mood booster, while screen-heavy evenings correlate with lower next-day energy.',
      total_entries_analyzed: 24,
      date_range_start: '2026-01-20',
      date_range_end: '2026-02-16',
      theme_timeline: [
        {
          theme: 'Work deadline stress',
          entry_count: 8,
          trajectory: 'resolved',
          summary: 'The first two weeks were dominated by anxiety around a project deadline. Once the project shipped, stress levels dropped significantly and entries shifted to relief and momentum.',
        },
        {
          theme: 'Morning walks and outdoor time',
          entry_count: 14,
          trajectory: 'growing',
          summary: 'References to morning walks increased from occasional to nearly daily. Entries written after walks are noticeably more positive and focused. This is becoming a core part of your routine.',
        },
        {
          theme: 'Social connection and energy',
          entry_count: 10,
          trajectory: 'stable',
          summary: 'Entries after social time — dinners with friends, phone calls, weekend hangouts — consistently express higher energy and optimism. Social connection is a reliable mood booster.',
        },
        {
          theme: 'Screen fatigue and evening habits',
          entry_count: 6,
          trajectory: 'declining',
          summary: 'Several entries note feeling drained after long screen-heavy evenings. This pattern has been decreasing as you\'ve started replacing some screen time with reading.',
        },
        {
          theme: 'Gratitude for small things',
          entry_count: 16,
          trajectory: 'growing',
          summary: 'Gratitude mentions have expanded from generic ("grateful for my health") to specific, detailed observations ("the way the light hit the trees on my walk today"). The practice is deepening.',
        },
      ],
      mood_trajectory: {
        overall_trend: 'improving',
        summary: 'Your mood has trended upward over the 4-week period. The first 10 days show more negative sentiment tied to work stress, followed by a sharp improvement after the deadline. The final two weeks are consistently positive, with minor dips on screen-heavy days.',
        data_points: [
          { date: '2026-01-20', sentiment_score: -0.2, dominant_mood: 'anxious' },
          { date: '2026-01-22', sentiment_score: -0.3, dominant_mood: 'stressed' },
          { date: '2026-01-24', sentiment_score: -0.1, dominant_mood: 'tired' },
          { date: '2026-01-26', sentiment_score: 0.1, dominant_mood: 'hopeful' },
          { date: '2026-01-28', sentiment_score: -0.2, dominant_mood: 'anxious' },
          { date: '2026-01-30', sentiment_score: 0.3, dominant_mood: 'relieved' },
          { date: '2026-02-01', sentiment_score: 0.5, dominant_mood: 'energized' },
          { date: '2026-02-03', sentiment_score: 0.4, dominant_mood: 'content' },
          { date: '2026-02-05', sentiment_score: 0.6, dominant_mood: 'grateful' },
          { date: '2026-02-07', sentiment_score: 0.3, dominant_mood: 'tired' },
          { date: '2026-02-09', sentiment_score: 0.7, dominant_mood: 'joyful' },
          { date: '2026-02-11', sentiment_score: 0.5, dominant_mood: 'content' },
          { date: '2026-02-13', sentiment_score: 0.6, dominant_mood: 'grateful' },
          { date: '2026-02-15', sentiment_score: 0.8, dominant_mood: 'energized' },
          { date: '2026-02-16', sentiment_score: 0.7, dominant_mood: 'content' },
        ],
      },
      patterns: [
        {
          pattern_type: 'correlation',
          title: 'Morning walks predict better days',
          description: 'Entries that mention a morning walk have an average sentiment score 0.4 points higher than those that don\'t. The effect is consistent across all 4 weeks, suggesting outdoor movement in the morning is a reliable mood anchor.',
        },
        {
          pattern_type: 'recurring_concern',
          title: 'Screen-heavy evenings precede low-energy mornings',
          description: 'On 5 of 6 occasions where you mentioned spending the evening on screens, the following day\'s entry reported lower energy or difficulty focusing. The pattern is strong enough to be worth addressing.',
        },
        {
          pattern_type: 'positive_shift',
          title: 'Gratitude practice is deepening',
          description: 'Your gratitude entries have evolved from general statements to vivid, specific observations. This shift — from "I\'m grateful for friends" to "I loved how my friend remembered my favorite coffee order" — correlates with higher overall sentiment scores.',
        },
        {
          pattern_type: 'cyclical',
          title: 'Weekend energy boost',
          description: 'Entries written on weekends or after social events consistently show higher energy and more positive language. Mid-week entries tend to be more neutral or task-focused.',
        },
      ],
    },
  },
];
