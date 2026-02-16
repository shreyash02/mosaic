// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
  profile_image_url?: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Profile and settings types
export interface UserWithAuthInfo extends User {
  has_password: boolean;
  has_google: boolean;
  email_verified: boolean;
}

export interface ProfileUpdateRequest {
  full_name?: string;
  profile_image_url?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordSetRequest {
  new_password: string;
}

export interface EmailPreferences {
  conversation_invitations: boolean;
  organization_invitations: boolean;
  closing_reminders: boolean;
  announcements: boolean;
  conversation_closed: boolean;
  analysis_ready: boolean;
  periodic_analysis: boolean;
  recurring_instances: boolean;
}

export interface OnboardingProgress {
  steps: Record<string, boolean>;
  completed_at: Record<string, string>;
  dismissed: boolean;
  started_at?: string;
}

// Conversation types
export enum AnonymityLevel {
  OPEN = 'open',  // Anyone can respond, identity recorded if logged in
  FULLY_ANONYMOUS = 'fully_anonymous',  // No identity tracking, requires secret codes
  PLATFORM_TRACKED = 'platform_tracked',  // Login required, platform tracks
  REVEALABLE = 'revealable',  // Login required, can reveal identities
}

export enum ResultsAccess {
  CREATOR_ONLY = 'creator_only',
  PARTICIPANTS = 'participants',
  PUBLIC_LINK = 'public_link',
}

export enum ConversationState {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
  ANALYZING = 'analyzing',
  ANALYZED = 'analyzed',
  DELETED = 'deleted',
}

export enum RecurrencePattern {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

// Continuous conversation analysis interval
export type AnalysisInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type QuestionType = 'text' | 'rating' | 'single_choice' | 'multiple_choice';

export interface PollChoice {
  id: string;
  label: string;
  order: number;
}

export interface QuestionOptions {
  // For rating
  min?: number;
  max?: number;
  step?: number;
  min_label?: string;
  max_label?: string;
  // For poll
  mode?: 'single' | 'multiple';
  max_selections?: number;
  choices?: PollChoice[];
}

export interface Question {
  id: string;
  conversation_id: string;
  question_text: string;
  question_type: QuestionType;
  question_order: number;
  options?: QuestionOptions;
  is_required?: boolean;
  question_image_url?: string;
  created_at: string;
}

export interface QuestionCreate {
  question_text: string;
  question_type?: QuestionType;
  question_order: number;
  options?: QuestionOptions;
  is_required?: boolean;
  question_image_url?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  state: ConversationState;
  created_at: string;
  is_template?: boolean;
}

export interface Conversation {
  id: string;
  creator_id: string;
  organization_id?: string;
  parent_conversation_id?: string;
  title: string;
  participant_title?: string;
  description?: string;
  header_image_url?: string;
  anonymity_level: AnonymityLevel;
  results_access: ResultsAccess;
  show_verbatim_responses: boolean;
  invite_only: boolean;
  allow_response_editing: boolean;
  access_code: string;
  state: ConversationState;
  auto_analyze: boolean;
  max_response_length: number;
  duration_minutes?: number;
  scheduled_activate_at?: string;
  auto_close_at?: string;
  manual_close_enabled: boolean;
  time_extension_enabled: boolean;
  timezone?: string;
  activated_at?: string;
  closed_at?: string;
  analyzed_at?: string;
  created_at: string;
  updated_at: string;
  questions?: Question[];
  // Follow-up conversation fields
  parent_conversation?: ConversationSummary;
  follow_up_conversations?: ConversationSummary[];
  is_follow_up?: boolean;
  // Template fields
  is_template?: boolean;
  template_series_id?: string;
  // Series relationship
  series_id?: string;
  // Recurring conversation fields
  is_recurring_instance?: boolean;
  recurrence_pattern?: RecurrencePattern;
  next_instance_date?: string;
  recurrence_end_date?: string;
  recurrence_paused?: boolean;
  // Continuous conversation fields
  is_continuous?: boolean;
  analysis_interval?: AnalysisInterval;
  next_analysis_at?: string;
  analysis_timezone?: string;
  // Context for AI analysis
  context_notes?: string;
  context_notes_updated_at?: string;
  // Branding (overrides organization branding)
  brand_logo_url?: string;
  brand_name?: string;
  // Archiving
  is_archived?: boolean;
  archived_at?: string;
  // Slack channel notifications
  slack_channel_id?: string;
  slack_channel_name?: string;
  slack_notify_on_activate?: boolean;
  slack_notify_on_close?: boolean;
  slack_notify_on_analysis?: boolean;
}

export interface ConversationCreate {
  title: string;
  participant_title?: string;
  description?: string;
  header_image_url?: string;
  anonymity_level: AnonymityLevel;
  results_access: ResultsAccess;
  show_verbatim_responses?: boolean;
  invite_only?: boolean;
  allow_response_editing?: boolean;
  questions: QuestionCreate[];
  auto_analyze?: boolean;
  max_response_length?: number;
  duration_minutes?: number;
  scheduled_activate_at?: string;
  auto_close_at?: string;
  manual_close_enabled?: boolean;
  time_extension_enabled?: boolean;
  timezone?: string;
  organization_id?: string;
  parent_conversation_id?: string;
  // Template fields
  is_template?: boolean;
  template_series_id?: string;
  // Series relationship
  series_id?: string;
  recurrence_pattern?: RecurrencePattern;
  next_instance_date?: string;
  recurrence_end_date?: string;
  recurrence_paused?: boolean;
  // Continuous conversation fields
  is_continuous?: boolean;
  analysis_interval?: AnalysisInterval;
  analysis_timezone?: string;
  // Context for AI analysis
  context_notes?: string;
  // Branding (overrides organization branding)
  brand_logo_url?: string;
  brand_name?: string;
  // Slack channel notifications
  slack_channel_id?: string;
  slack_channel_name?: string;
  slack_notify_on_activate?: boolean;
  slack_notify_on_close?: boolean;
  slack_notify_on_analysis?: boolean;
}

export interface ConversationListItem {
  id: string;
  title: string;
  state: ConversationState;
  anonymity_level: AnonymityLevel;
  access_code: string;
  created_at: string;
  activated_at?: string;
  closed_at?: string;
  response_count?: number;
  unique_participants?: number;
  timezone?: string;
  organization_id?: string;
  is_follow_up?: boolean;
  parent_conversation_id?: string;
  is_template?: boolean;
  template_series_id?: string;
  series_id?: string;
  is_recurring_instance?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_paused?: boolean;
  // Continuous conversation fields
  is_continuous?: boolean;
  analysis_interval?: AnalysisInterval;
  next_analysis_at?: string;
  // Archiving
  is_archived?: boolean;
}

export interface CreateFollowUpRequest {
  copy_invitations: boolean;
  copy_settings: boolean;
  copy_questions: boolean;
  add_to_series?: boolean;  // If True, add follow-up to parent's series (or create new series)
}

export interface ConversationLineage {
  current: Conversation;
  ancestors: ConversationSummary[];
  descendants: ConversationSummary[];
}

// Response types
export interface ResponseItem {
  question_id: string;
  response_text?: string;
  response_data?: any;
}

export interface ResponseSubmit {
  responses: ResponseItem[];
  reveal_consent?: boolean;
  participant_code?: string;
}

export interface Response {
  id: string;
  conversation_id: string;
  question_id: string;
  response_text?: string;
  response_data?: any;
  anonymity_level: string;
  reveal_consent: boolean;
  submitted_at: string;
  edited_at?: string;
  is_edited?: boolean;
  participant_id?: string;
  participant_code_used?: string;
}

export interface ResponseWithQuestion extends Response {
  question_text: string;
}

export interface ResponseStats {
  total_responses: number;
  unique_participants: number;
  responses_by_question: Record<string, number>;
  response_rate?: number;
}

export interface ResponseCheck {
  has_submitted: boolean;
  can_edit?: boolean;
  message?: string;
  existing_responses?: ResponseItem[];
}

// Draft types
export interface DraftSaveRequest {
  responses: ResponseItem[];
  participant_code?: string;
  reveal_consent?: boolean;
}

export interface DraftSaveResponse {
  success: boolean;
  last_saved_at: string;
  message: string;
}

export interface DraftLoadResponse {
  has_draft: boolean;
  last_saved_at?: string;
  responses: ResponseItem[];
  reveal_consent: boolean;
}

export interface LocalStorageDraft {
  accessCode: string;
  participantCode?: string;
  responses: ResponseItem[];
  revealConsent: boolean;
  lastSavedAt: string;
  version: number;
}

// Analysis types
export interface Perspective {
  name: string;
  summary: string;
  count: number;
}

export interface Theme {
  theme: string;
  summary: string;
  frequency: number;
  perspectives: Perspective[];
  key_points?: string[];
}

export interface RatingStatistics {
  average: number;
  min_value: number;
  max_value: number;
  scale_min?: number;
  scale_max?: number;
  distribution: Record<string, number>;
  total_responses: number;
}

export interface PollChoiceResult {
  choice_id: string;
  label: string;
  count: number;
  percentage: number;
}

export interface PollStatistics {
  total_responses: number;
  choices: PollChoiceResult[];
}

export interface QuestionAnalysis {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  question_image_url?: string;  // Image attached to the question
  response_count: number;
  themes?: Theme[];
  summary?: string;  // Summary when themes aren't available or as additional context
  rating_stats?: RatingStatistics;
  poll_stats?: PollStatistics;
}

export interface SurprisingInsight {
  title: string;
  description: string;
}

// Suggested actions from AI analysis
export type ActionType = 'investigate' | 'communicate' | 'change' | 'celebrate' | 'monitor';
export type ActionPriority = 'high' | 'medium' | 'low';
export type ActionSentiment = 'positive' | 'negative' | 'neutral' | 'mixed';
export type ActionSource = 'user_requested' | 'auto_generated';
export type ActionStatus = 'suggested' | 'accepted' | 'dismissed' | 'completed' | 'converted_to_goal';

export interface SuggestedAction {
  id: string;
  analysis_id: string;
  conversation_id: string;
  title: string;
  description: string;
  action_type: ActionType;
  priority: ActionPriority;
  sentiment: ActionSentiment;
  related_cluster_ids: string[];
  response_percentage: number | null;
  source: ActionSource;
  status: ActionStatus;
  dismissed_reason?: string;
  created_at: string;
}

export interface SuggestedActionsResponse {
  analysis_id: string;
  conversation_id: string;
  actions: SuggestedAction[];
  total: number;
}

export interface Analysis {
  id: string;
  conversation_id: string;
  overall_summary: string;
  themes: Theme[];  // Deprecated
  question_analyses: QuestionAnalysis[];
  surprising_insights?: SurprisingInsight[];  // AI-generated "What Surprised Us" section
  context_notes_snapshot?: string;  // Creator context used for this analysis
  embedding_provider: string;
  embedding_model: string;
  clustering_algorithm: string;
  llm_provider: string;
  llm_model: string;
  total_responses_analyzed: number;
  num_clusters_found: number;
  analysis_duration_ms: number;
  created_at: string;
  // Conversation metadata (for participant access)
  conversation_title?: string;
  conversation_timezone?: string;
  show_verbatim_responses?: boolean;
  organization_id?: string;
  // Additional metadata for PDF export
  unique_participants?: number;
  conversation_activated_at?: string;
  conversation_closed_at?: string;
}

// Lightweight analysis summary for list views
export interface AnalysisSummary {
  id: string;
  conversation_id: string;
  created_at: string;
  total_responses_analyzed?: number;
  context_notes_snapshot?: string;
  llm_model?: string;
  analysis_duration_ms?: number;
}

export interface AnalysisListResponse {
  conversation_id: string;
  total: number;
  analyses: AnalysisSummary[];
}

// Periodic analysis for continuous conversations
export type PeriodicAnalysisTriggerType = 'scheduled' | 'manual';

export interface PeriodicAnalysis {
  id: string;
  conversation_id: string;
  period_label: string;
  period_type: AnalysisInterval;
  period_start: string;
  period_end: string;
  trigger_type: PeriodicAnalysisTriggerType;
  overall_summary?: string;
  themes?: Theme[];
  surprising_insights?: SurprisingInsight[];
  question_analyses?: QuestionAnalysis[];
  total_responses_analyzed?: number;
  created_at: string;
}

export interface PeriodicAnalysisList {
  conversation_id: string;
  total_periods: number;
  analyses: PeriodicAnalysis[];
}

export interface TriggerPeriodicAnalysisRequest {
  period_start?: string;
  period_end?: string;
  force_replace?: boolean;
  incremental?: boolean;
}

// API Response types
export interface SuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface CodeValidation {
  valid: boolean;
  conversation_id?: string;
  message: string;
  requires_participant_code?: boolean;
  requires_login?: boolean;
  session_token?: string;
  has_submitted?: boolean;
  conversation_state?: string;
}

// Invitation types
export interface ConversationInvitation {
  id: string;
  conversation_id: string;
  email: string;
  invited_by_id?: string;
  invited_user_id?: string;
  invitation_token?: string;
  is_accepted: boolean;
  accepted_at?: string;
  created_at: string;
  expires_at?: string;
  invited_user?: User;
  has_submitted_response?: boolean;
}

export interface InviteUsersRequest {
  emails: string[];
}

export interface InviteUsersResponse {
  conversation_id: string;
  invitations_created: number;
  invitations: ConversationInvitation[];
}

export interface InvitationListResponse {
  conversation_id: string;
  total_invitations: number;
  accepted_invitations: number;
  pending_invitations: number;
  invitations: ConversationInvitation[];
}

export interface CSVUploadResult {
  conversation_id: string;
  total_rows: number;
  invitations_created: number;
  skipped_existing: number;
  skipped_invalid: number;
  invalid_emails: string[];
  invitations: ConversationInvitation[];
}

export interface ConversationInvitationWithConversation extends ConversationInvitation {
  conversation: ConversationListItem;
}

// Admin types
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminToken {
  access_token: string;
  token_type: string;
}

export interface AdminUserInfo {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminConversationInfo {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  state: string;
  access_code: string;
  created_at: string;
  updated_at: string;
  // Configuration fields for editing
  show_verbatim_responses?: boolean | null;
  results_access?: string | null;
  anonymity_level?: string | null;
  invite_only?: boolean | null;
  auto_analyze?: boolean | null;
  max_response_length?: number | null;
  duration_minutes?: number | null;
}

export interface AdminResponseInfo {
  id: string;
  conversation_id: string;
  question_id: string;
  participant_id: string | null;
  response_text: string | null;
  anonymity_level: string;
  submitted_at: string;
}

export interface AdminAnalysisInfo {
  id: string;
  conversation_id: string;
  conversation_title: string;
  summary: string;
  created_at: string;
}

export interface AdminOrganizationInfo {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  member_count: number;
  created_at: string;
}

export interface GenerateTestDataRequest {
  conversation_id: string;
  num_respondents: number;
  start_time: string;
  end_time: string;
}

export interface GenerateTestDataResponse {
  success: boolean;
  message: string;
  responses_created: number;
  respondents_created: number;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  description?: string;
  brand_logo_url?: string;
  brand_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: User;
}

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMember[];
}

export interface OrganizationCreate {
  name: string;
  description?: string;
  brand_logo_url?: string;
  brand_name?: string;
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
  brand_logo_url?: string;
  brand_name?: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  invited_by_id?: string;
  invited_user_id?: string;
  invitation_token: string;
  role: 'admin' | 'member';
  is_accepted: boolean;
  accepted_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface InviteToOrganizationRequest {
  emails: string[];
  role: 'admin' | 'member';
}

export interface InviteToOrganizationResponse {
  organization_id: string;
  invitations_created: number;
  invitations: OrganizationInvitation[];
}

export interface OrganizationInvitationListResponse {
  organization_id: string;
  total_invitations: number;
  accepted_invitations: number;
  pending_invitations: number;
  invitations: OrganizationInvitation[];
}

// Series types
export interface Series {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SeriesWithConversations extends Series {
  conversations: ConversationListItem[];
}

export interface SeriesCreate {
  name: string;
  description?: string;
  organization_id?: string;
}

export interface SeriesUpdate {
  name?: string;
  description?: string;
}

// Collection Analysis types
export interface ThemeDataPoint {
  period: string;
  period_start: string;
  period_end: string;
  normalized_score: number;
  frequency: number;
  conversation_count: number;
}

export interface ThemeTrend {
  theme_id: string;
  theme_name: string;
  question_text: string;
  data_points: ThemeDataPoint[];
}

export interface TrendsData {
  period: string;  // 'daily', 'weekly', 'monthly'
  themes: ThemeTrend[];
}

export interface QuestionInsight {
  question_text: string;
  question_type: string;
  total_responses: number;
  conversation_count: number;
  themes?: Array<{
    theme: string;
    frequency: number;
    conversation_count: number;
  }>;
  rating_stats?: {
    average: number;
    min_value: number;
    max_value: number;
    total_responses: number;
  };
  poll_stats?: {
    total_responses: number;
    choices: Array<{
      label: string;
      count: number;
      percentage: number;
    }>;
  };
}

export interface CollectionAnalysis {
  id: string;
  series_id: string;
  overall_summary?: string;
  surprising_insights?: SurprisingInsight[];
  question_insights?: QuestionInsight[];
  trends?: TrendsData;
  total_conversations: number;
  total_responses: number;
  conversations_analyzed: number;
  conversation_ids: string[];
  computed_at: string;
  computation_duration_ms?: number;
}

// Slack integration types
export interface SlackWorkspaceStatus {
  connected: boolean;
  slack_team_id?: string;
  slack_team_name?: string;
  installed_at?: string;
  installed_by_name?: string;
}

export interface UserSlackStatus {
  linked: boolean;
  slack_user_id?: string;
  slack_team_id?: string;
  slack_display_name?: string;
  connected_at?: string;
}

export interface SlackInstallInitiate {
  redirect_url: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export interface SlackChannelListResponse {
  channels: SlackChannel[];
}

// Bulk operation types
export type BulkOperationType = 'close' | 'delete' | 'archive' | 'unarchive';

export interface BulkOperationRequest {
  conversation_ids: string[];
  operation: BulkOperationType;
}

export interface BulkOperationResultItem {
  conversation_id: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResponse {
  operation: BulkOperationType;
  total_requested: number;
  succeeded: number;
  failed: number;
  results: BulkOperationResultItem[];
}

// Reminder types
export type ReminderType = 'manual' | 'scheduled';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export interface Reminder {
  id: string;
  conversation_id: string;
  reminder_type: ReminderType;
  scheduled_at?: string;
  status: ReminderStatus;
  sent_at?: string;
  recipients_count: number;
  created_at: string;
}

export interface ReminderListResponse {
  reminders: Reminder[];
}

export interface NonRespondersCount {
  conversation_id: string;
  total_invitations: number;
  responded: number;
  non_responders: number;
}

// Announcement types
export interface Announcement {
  id: string;
  conversation_id: string;
  message: string;
  sent_at?: string;
  recipients_count: number;
  created_at: string;
}

export interface AnnouncementListResponse {
  announcements: Announcement[];
}

// Scheduler types (Admin)
export type SchedulerJobStatus = 'started' | 'completed' | 'failed';
export type SchedulerHealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

export interface SchedulerJobLogInfo {
  id: string;
  job_name: string;
  status: SchedulerJobStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  items_processed?: number;
  items_failed?: number;
  error_message?: string;
  details?: Record<string, unknown>;
}

export interface SchedulerJobSummary {
  job_name: string;
  display_name: string;
  interval_minutes: number;
  last_run_at?: string;
  last_status?: string;
  last_duration_ms?: number;
  next_run_at?: string;
  recent_success_count: number;
  recent_failure_count: number;
  avg_duration_ms?: number;
  health_status: SchedulerHealthStatus;
}

export interface SchedulerStatusResponse {
  scheduler_running: boolean;
  jobs: SchedulerJobSummary[];
  last_checked_at: string;
}

export interface SchedulerLogsResponse {
  logs: SchedulerJobLogInfo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Search types
export type SearchEntityType = 'conversation' | 'series' | 'analysis';

export interface SearchRequest {
  query: string;
  entity_types?: SearchEntityType[];
  page?: number;
  page_size?: number;
  organization_id?: string;
  include_archived?: boolean;
}

export interface SearchResultBase {
  id: string;
  entity_type: SearchEntityType;
  rank: number;
  headline?: string;
}

export interface ConversationSearchResult extends SearchResultBase {
  entity_type: 'conversation';
  title: string;
  description?: string;
  state: string;
  access_code: string;
  created_at: string;
  is_archived: boolean;
  organization_id?: string;
}

export interface SeriesSearchResult extends SearchResultBase {
  entity_type: 'series';
  name: string;
  description?: string;
  created_at: string;
  conversation_count: number;
  organization_id?: string;
}

export interface AnalysisSearchResult extends SearchResultBase {
  entity_type: 'analysis';
  conversation_id: string;
  conversation_title: string;
  overall_summary?: string;
  created_at: string;
  total_responses_analyzed?: number;
  organization_id?: string;
}

export type SearchResult = ConversationSearchResult | SeriesSearchResult | AnalysisSearchResult;

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  entity_counts: Record<string, number>;
}

export interface SearchSuggestionsResponse {
  suggestions: string[];
}

// Question Suggestions (AI-powered)
export interface QuestionSuggestionRequest {
  title: string;
  description: string;
  existing_questions: string[];
  count?: number;
}

export interface QuestionSuggestionItem {
  text: string;
  question_type: 'text' | 'rating' | 'single_choice' | 'multiple_choice';
  rationale: string;
  options?: {
    scale_min?: number;
    scale_max?: number;
    scale_min_label?: string;
    scale_max_label?: string;
    choices?: string[];
  };
}

export interface QuestionSuggestionResponse {
  suggestions: QuestionSuggestionItem[];
  needs_more_context: boolean;
  context_hint?: string;
}

// Feature Flag types
export interface FeatureFlag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagCreate {
  name: string;
  description?: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface FeatureFlagUpdate {
  name?: string;
  description?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface FeatureFlagOverride {
  id: string;
  flag_id: string;
  organization_id?: string;
  user_id?: string;
  enabled?: boolean;
  config_override?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EffectiveFeatureFlag {
  name: string;
  slug: string;
  enabled: boolean;
  config: Record<string, unknown>;
  resolution_chain?: string[];
}

export interface FeatureFlagList {
  flags: FeatureFlag[];
}

// Notification types
export type NotificationType =
  | 'response_submitted'
  | 'analysis_ready'
  | 'announcement'
  | 'closing_soon'
  | 'invitation';

export interface Notification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  data?: {
    action_url?: string;
    conversation_id?: string;
    [key: string]: unknown;
  };
  read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  has_more: boolean;
}

export interface UnreadCountResponse {
  count: number;
}
