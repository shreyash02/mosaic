// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
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

// Conversation types
export enum AnonymityLevel {
  FULLY_ANONYMOUS = 'fully_anonymous',
  PLATFORM_TRACKED = 'platform_tracked',
  REVEALABLE = 'revealable',
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
  created_at: string;
}

export interface QuestionCreate {
  question_text: string;
  question_type?: QuestionType;
  question_order: number;
  options?: QuestionOptions;
}

export interface ConversationSummary {
  id: string;
  title: string;
  state: ConversationState;
  created_at: string;
}

export interface Conversation {
  id: string;
  creator_id: string;
  organization_id?: string;
  parent_conversation_id?: string;
  title: string;
  description?: string;
  anonymity_level: AnonymityLevel;
  results_access: ResultsAccess;
  show_verbatim_responses: boolean;
  invite_only: boolean;
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
  // Recurring conversation fields
  series_id?: string;
  is_recurring_instance?: boolean;
  recurrence_pattern?: RecurrencePattern;
  next_instance_date?: string;
  recurrence_end_date?: string;
}

export interface ConversationCreate {
  title: string;
  description?: string;
  anonymity_level: AnonymityLevel;
  results_access: ResultsAccess;
  show_verbatim_responses?: boolean;
  invite_only?: boolean;
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
  series_id?: string;  // Set when creating an instance from a template
  recurrence_pattern?: RecurrencePattern;
  next_instance_date?: string;
  recurrence_end_date?: string;
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
  timezone?: string;
  organization_id?: string;
  is_follow_up?: boolean;
  parent_conversation_id?: string;
  series_id?: string;
  is_recurring_instance?: boolean;
  recurrence_pattern?: RecurrencePattern;
}

export interface CreateFollowUpRequest {
  copy_invitations: boolean;
  copy_settings: boolean;
  copy_questions: boolean;
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
  message?: string;
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
  response_count: number;
  themes?: Theme[];
  rating_stats?: RatingStatistics;
  poll_stats?: PollStatistics;
}

export interface Analysis {
  id: string;
  conversation_id: string;
  overall_summary: string;
  themes: Theme[];  // Deprecated
  question_analyses: QuestionAnalysis[];
  embedding_provider: string;
  embedding_model: string;
  clustering_algorithm: string;
  llm_provider: string;
  llm_model: string;
  total_responses_analyzed: number;
  num_clusters_found: number;
  analysis_duration_ms: number;
  created_at: string;
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
  session_token?: string;
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

// Organization types
export interface Organization {
  id: string;
  name: string;
  description?: string;
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
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
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
