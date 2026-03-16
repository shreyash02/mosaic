import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  UserWithAuthInfo,
  ProfileUpdateRequest,
  PasswordChangeRequest,
  PasswordSetRequest,
  EmailPreferences,

  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Conversation,
  ConversationCreate,
  ConversationListItem,
  CreateFollowUpRequest,
  ConversationLineage,
  ResponseSubmit,
  ResponseWithQuestion,
  ResponseStats,
  ResponseCheck,
  DraftSaveRequest,
  DraftSaveResponse,
  DraftLoadResponse,
  Analysis,
  AnalysisListResponse,
  PeriodicAnalysis,
  PeriodicAnalysisList,
  TriggerPeriodicAnalysisRequest,
  SuccessResponse,
  CodeValidation,
  InviteUsersResponse,
  InvitationListResponse,
  CSVUploadResult,
  ConversationInvitationWithConversation,
  AdminLoginRequest,
  AdminToken,
  AdminUserInfo,
  AdminConversationInfo,
  AdminResponseInfo,
  Organization,
  OrganizationCreate,
  OrganizationUpdate,
  OrganizationWithMembers,
  OrganizationMember,
  InviteToOrganizationRequest,
  InviteToOrganizationResponse,
  OrganizationInvitationListResponse,
  Workspace,
  WorkspaceCreate,
  Series,
  SeriesCreate,
  SeriesUpdate,
  SeriesWithConversations,
  CollectionAnalysis,
  SlackWorkspaceStatus,
  SlackInstallInitiate,
  UserSlackStatus,
  SlackChannelListResponse,
  BulkOperationRequest,
  BulkOperationResponse,
  Reminder,
  ReminderListResponse,
  NonRespondersCount,
  Announcement,
  AnnouncementListResponse,
  SearchRequest,
  SearchResponse,
  SearchSuggestionsResponse,
  QuestionSuggestionResponse,
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  SuggestedActionsResponse,
  SuggestedAction,
  UpdateActionStatusRequest,
  EditActionRequest,
  CreateActionRequest,
  InsightAnnotation,
  UpsertAnnotationRequest,
  AnnotationsListResponse,
  SharedAnalysis,
  ConversationSharingResponse,
  Journal,
  JournalListItem,
  JournalCreate,
  JournalUpdate,
  JournalEntry,
  JournalEntryList,
  JournalEntryCreate,
  JournalAnalysisStatus,
  JournalTemplate,
  JournalDraftData,
  JournalDraftSaveResponse,
  JournalDraftLoadResponse,
  JournalEntryDate,
  JournalAnalysisSummary,
  JournalShareCreate,
  JournalShare,
  JournalShareListResponse,
  SharedJournalListItem,
  SharedJournalDetail,
  ConversationPreset,
  PresetCreate,
  PresetUpdate,
  Space,
  SpaceListItem,
  SpaceCreate,
  SpaceUpdate,
  SpaceIdea,
  SpaceTheme,
  SpaceMember,
  SpaceInvitation,
  SpaceSharedViewer,
  SpaceActivityLogPage,
  WorkspaceActivityLogPage,
  GraphData,
  OrganizeRun,
  ImageExtractionResult,
  OnboardingProgressResponse,
} from '../types';

// Use relative URL when served from same origin, or env var for different origin
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

// Event target for network-level errors that should show as toasts, not inline errors.
// NotificationContext listens for these and shows auto-dismissing toasts.
export const apiEvents = new EventTarget();

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling and automatic token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Don't intercept 401s from login endpoints — let the caller handle them
          const requestUrl = originalRequest.url || '';
          if (requestUrl.endsWith('/auth/login') || requestUrl.endsWith('/admin/login')) {
            return Promise.reject(error);
          }

          // Don't intercept 401s from shared analysis — let the page handle auth redirect
          if (requestUrl.includes('/analysis/shared/')) {
            return Promise.reject(error);
          }

          // Skip redirect for admin pages — they manage their own auth
          const isAdminPage = window.location.pathname.startsWith('/adminportal');

          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              // Try to refresh the token
              const response = await axios.post<AuthResponse>(
                `${API_BASE_URL}/auth/refresh`,
                { refresh_token: refreshToken }
              );

              // Update tokens
              localStorage.setItem('access_token', response.data.access_token);
              localStorage.setItem('refresh_token', response.data.refresh_token);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              // Refresh failed, clear tokens
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              if (!isAdminPage) {
                window.location.href = '/login';
              }
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            if (!isAdminPage) {
              window.location.href = '/login';
            }
          }
        }
        // Network errors (no response) — show as toast, not inline
        if (!error.response) {
          apiEvents.dispatchEvent(new CustomEvent('network-error', {
            detail: { message: 'Unable to connect. Please check your connection and try again.' },
          }));
          return Promise.reject(new Error('__network_error__'));
        }

        // Replace axios message with backend detail so err.message is human-readable.
        // Keeps err.response intact for callers that access err.response.data.detail.
        const detail = (error.response?.data as Record<string, unknown>)?.detail;
        if (typeof detail === 'string') {
          error.message = detail;
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<User> {
    const response = await this.client.post<User>('/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  }

  getGoogleLoginUrl(redirect?: string, inviteCode?: string): string {
    const baseUrl = API_BASE_URL.replace('/api', '');
    const url = `${baseUrl}/api/auth/google/login`;
    const params = new URLSearchParams();
    if (redirect) params.set('redirect', redirect);
    if (inviteCode) params.set('invite_code', inviteCode);
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  // Email verification endpoints
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>('/auth/verify-email', { token });
    return response.data;
  }

  async resendVerificationEmail(email: string): Promise<void> {
    await this.client.post('/auth/resend-verification', { email });
  }

  // Profile endpoints
  async getUserProfile(): Promise<UserWithAuthInfo> {
    const response = await this.client.get<UserWithAuthInfo>('/auth/me/profile');
    return response.data;
  }

  async updateProfile(data: ProfileUpdateRequest): Promise<User> {
    const response = await this.client.patch<User>('/auth/me/profile', data);
    return response.data;
  }

  async changePassword(data: PasswordChangeRequest): Promise<void> {
    await this.client.post('/auth/password/change', data);
  }

  async setPassword(data: PasswordSetRequest): Promise<void> {
    await this.client.post('/auth/password/set', data);
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/auth/password/forgot', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/password/reset', { token, new_password: newPassword });
  }

  // Email preferences endpoints
  async getEmailPreferences(): Promise<EmailPreferences> {
    const response = await this.client.get<EmailPreferences>('/auth/email-preferences');
    return response.data;
  }

  async updateEmailPreferences(data: EmailPreferences): Promise<EmailPreferences> {
    const response = await this.client.put<EmailPreferences>('/auth/email-preferences', data);
    return response.data;
  }

  // Checklist / onboarding endpoints
  async getOnboardingProgress(): Promise<OnboardingProgressResponse> {
    const response = await this.client.get<OnboardingProgressResponse>('/auth/onboarding');
    return response.data;
  }

  async updateOnboardingProgress(data: OnboardingProgressResponse): Promise<OnboardingProgressResponse> {
    const response = await this.client.put<OnboardingProgressResponse>('/auth/onboarding', data);
    return response.data;
  }

  // Conversation endpoints
  async createConversation(data: ConversationCreate): Promise<Conversation> {
    const response = await this.client.post<Conversation>('/conversations', data);
    return response.data;
  }

  async getConversations(options?: { includeArchived?: boolean; archivedOnly?: boolean; mode?: 'group' | 'individual' | 'all' }): Promise<ConversationListItem[]> {
    const params = new URLSearchParams();
    if (options?.includeArchived) params.append('include_archived', 'true');
    if (options?.archivedOnly) params.append('archived_only', 'true');
    if (options?.mode) params.append('mode', options.mode);
    const queryString = params.toString();
    const url = queryString ? `/conversations?${queryString}` : '/conversations';
    const response = await this.client.get<ConversationListItem[]>(url);
    return response.data;
  }

  async getParticipatedConversations(): Promise<ConversationListItem[]> {
    const response = await this.client.get<ConversationListItem[]>('/conversations/participated');
    return response.data;
  }

  async getConversation(id: string): Promise<Conversation> {
    const response = await this.client.get<Conversation>(`/conversations/${id}`);
    return response.data;
  }

  async updateConversation(id: string, data: Partial<ConversationCreate>): Promise<Conversation> {
    const response = await this.client.patch<Conversation>(`/conversations/${id}`, data);
    return response.data;
  }

  async deleteConversation(id: string): Promise<SuccessResponse> {
    const response = await this.client.delete<SuccessResponse>(`/conversations/${id}`);
    return response.data;
  }

  async archiveConversation(id: string): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/archive`);
    return response.data;
  }

  async unarchiveConversation(id: string): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/unarchive`);
    return response.data;
  }

  async bulkConversationOperation(request: BulkOperationRequest): Promise<BulkOperationResponse> {
    const response = await this.client.post<BulkOperationResponse>('/conversations/bulk', request);
    return response.data;
  }

  async duplicateConversation(id: string): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/duplicate`);
    return response.data;
  }

  async activateConversation(id: string, autoCloseAt?: string, scheduledActivateAt?: string): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/activate`, {
      auto_close_at: autoCloseAt,
      scheduled_activate_at: scheduledActivateAt,
    });
    return response.data;
  }

  async closeConversation(id: string): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/close`, {});
    return response.data;
  }

  async extendConversation(id: string, additionalHours: number): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/extend`, {
      additional_hours: additionalHours,
    });
    return response.data;
  }

  async generateParticipantCodes(id: string, count: number): Promise<{ conversation_id: string; codes_generated: number; codes: string[] }> {
    const response = await this.client.post<{ conversation_id: string; codes_generated: number; codes: string[] }>(
      `/conversations/${id}/participant-codes`,
      { count }
    );
    return response.data;
  }

  async listParticipantCodes(id: string): Promise<{ conversation_id: string; total_codes: number; used_codes: number; unused_codes: number; codes: Array<{ id: string; participant_code: string; is_used: boolean; used_at?: string; created_at: string }> }> {
    const response = await this.client.get<{ conversation_id: string; total_codes: number; used_codes: number; unused_codes: number; codes: Array<{ id: string; participant_code: string; is_used: boolean; used_at?: string; created_at: string }> }>(
      `/conversations/${id}/participant-codes`
    );
    return response.data;
  }

  async createFollowUp(id: string, request: CreateFollowUpRequest): Promise<Conversation> {
    const response = await this.client.post<Conversation>(
      `/conversations/${id}/create-follow-up`,
      request
    );
    return response.data;
  }

  async getConversationLineage(id: string): Promise<ConversationLineage> {
    const response = await this.client.get<ConversationLineage>(
      `/conversations/${id}/lineage`
    );
    return response.data;
  }

  // Response endpoints
  async validateCode(accessCode: string): Promise<CodeValidation> {
    const response = await this.client.post<CodeValidation>(
      `/conversations/${accessCode}/validate`
    );
    return response.data;
  }

  async validateParticipantCode(accessCode: string, participantCode: string): Promise<CodeValidation> {
    const response = await this.client.post<CodeValidation>(
      `/conversations/${accessCode}/validate-participant?participant_code=${encodeURIComponent(participantCode)}`
    );
    return response.data;
  }

  async getConversationByCode(accessCode: string, sessionToken?: string): Promise<Conversation> {
    const config: any = {};
    if (sessionToken) {
      config.headers = { Authorization: `Bearer ${sessionToken}` };
    }
    const response = await this.client.get<Conversation>(
      `/conversations/by-code/${accessCode}`,
      config
    );
    return response.data;
  }

  async getConversationPreview(accessCode: string): Promise<Conversation> {
    const response = await this.client.get<Conversation>(
      `/conversations/preview/${accessCode}`
    );
    return response.data;
  }

  async checkUserResponse(accessCode: string): Promise<ResponseCheck> {
    const response = await this.client.get<ResponseCheck>(
      `/conversations/${accessCode}/responses/check`
    );
    return response.data;
  }

  async submitResponse(accessCode: string, data: ResponseSubmit): Promise<SuccessResponse> {
    const response = await this.client.post<SuccessResponse>(
      `/conversations/${accessCode}/responses`,
      data
    );
    return response.data;
  }

  async updateResponse(accessCode: string, data: ResponseSubmit): Promise<SuccessResponse> {
    const response = await this.client.put<SuccessResponse>(
      `/conversations/${accessCode}/responses`,
      data
    );
    return response.data;
  }

  async saveDraft(accessCode: string, data: DraftSaveRequest, sessionToken?: string): Promise<DraftSaveResponse> {
    const config: any = {};
    if (sessionToken) {
      config.headers = { Authorization: `Bearer ${sessionToken}` };
    }
    const response = await this.client.post<DraftSaveResponse>(
      `/conversations/${accessCode}/responses/draft`,
      data,
      config
    );
    return response.data;
  }

  async loadDraft(accessCode: string, participantCode?: string, sessionToken?: string): Promise<DraftLoadResponse> {
    const config: any = {};
    if (sessionToken) {
      config.headers = { Authorization: `Bearer ${sessionToken}` };
    }
    const params = participantCode ? `?participant_code=${encodeURIComponent(participantCode)}` : '';
    const response = await this.client.get<DraftLoadResponse>(
      `/conversations/${accessCode}/responses/draft${params}`,
      config
    );
    return response.data;
  }

  async deleteDraft(accessCode: string, participantCode?: string, sessionToken?: string): Promise<SuccessResponse> {
    const config: any = {};
    if (sessionToken) {
      config.headers = { Authorization: `Bearer ${sessionToken}` };
    }
    const params = participantCode ? `?participant_code=${encodeURIComponent(participantCode)}` : '';
    const response = await this.client.delete<SuccessResponse>(
      `/conversations/${accessCode}/responses/draft${params}`,
      config
    );
    return response.data;
  }

  async getResponses(conversationId: string): Promise<{ responses: ResponseWithQuestion[] }> {
    const response = await this.client.get<{ responses: ResponseWithQuestion[] }>(
      `/conversations/${conversationId}/responses`
    );
    return response.data;
  }

  async getResponseStats(conversationId: string): Promise<ResponseStats> {
    const response = await this.client.get<ResponseStats>(
      `/conversations/${conversationId}/responses/stats`
    );
    return response.data;
  }

  // Analysis endpoints
  async triggerAnalysis(conversationId: string, options?: { override_threshold?: boolean }): Promise<SuccessResponse> {
    const response = await this.client.post<SuccessResponse>(
      `/conversations/${conversationId}/analyze`,
      options || {}
    );
    return response.data;
  }

  async getAnalysis(conversationId: string): Promise<Analysis> {
    const response = await this.client.get<Analysis>(`/conversations/${conversationId}/analysis`);
    return response.data;
  }

  async listAnalyses(conversationId: string): Promise<AnalysisListResponse> {
    const response = await this.client.get<AnalysisListResponse>(`/conversations/${conversationId}/analyses`);
    return response.data;
  }

  async getAnalysisById(conversationId: string, analysisId: string): Promise<Analysis> {
    const response = await this.client.get<Analysis>(`/conversations/${conversationId}/analyses/${analysisId}`);
    return response.data;
  }

  async toggleAnalysisSharing(conversationId: string): Promise<ConversationSharingResponse> {
    const response = await this.client.patch<ConversationSharingResponse>(
      `/conversations/${conversationId}/sharing`
    );
    return response.data;
  }

  async getSharedAnalysis(shareToken: string): Promise<SharedAnalysis> {
    const response = await this.client.get<SharedAnalysis>(`/analysis/shared/${shareToken}`);
    return response.data;
  }

  // AI-suggested actions
  async generateSuggestedActions(
    conversationId: string,
    analysisId: string,
    regenerate: boolean = false,
  ): Promise<SuggestedActionsResponse> {
    const response = await this.client.post<SuggestedActionsResponse>(
      `/conversations/${conversationId}/analyses/${analysisId}/suggested-actions`,
      { regenerate },
    );
    return response.data;
  }

  async getSuggestedActions(
    conversationId: string,
    analysisId: string,
  ): Promise<SuggestedActionsResponse> {
    const response = await this.client.get<SuggestedActionsResponse>(
      `/conversations/${conversationId}/analyses/${analysisId}/suggested-actions`,
    );
    return response.data;
  }

  async updateActionStatus(
    conversationId: string,
    analysisId: string,
    actionId: string,
    body: UpdateActionStatusRequest,
  ): Promise<SuggestedAction> {
    const response = await this.client.patch<SuggestedAction>(
      `/conversations/${conversationId}/analyses/${analysisId}/suggested-actions/${actionId}/status`,
      body,
    );
    return response.data;
  }

  async editAction(
    conversationId: string,
    analysisId: string,
    actionId: string,
    body: EditActionRequest,
  ): Promise<SuggestedAction> {
    const response = await this.client.patch<SuggestedAction>(
      `/conversations/${conversationId}/analyses/${analysisId}/suggested-actions/${actionId}`,
      body,
    );
    return response.data;
  }

  async createManualAction(
    conversationId: string,
    analysisId: string,
    body: CreateActionRequest,
  ): Promise<SuggestedAction> {
    const response = await this.client.post<SuggestedAction>(
      `/conversations/${conversationId}/analyses/${analysisId}/suggested-actions/manual`,
      body,
    );
    return response.data;
  }

  // Insight annotations
  async getAnnotations(
    conversationId: string,
    analysisId: string,
  ): Promise<AnnotationsListResponse> {
    const response = await this.client.get<AnnotationsListResponse>(
      `/conversations/${conversationId}/analyses/${analysisId}/annotations`,
    );
    return response.data;
  }

  async upsertAnnotation(
    conversationId: string,
    analysisId: string,
    body: UpsertAnnotationRequest,
  ): Promise<InsightAnnotation> {
    const response = await this.client.put<InsightAnnotation>(
      `/conversations/${conversationId}/analyses/${analysisId}/annotations`,
      body,
    );
    return response.data;
  }

  async deleteAnnotation(
    conversationId: string,
    analysisId: string,
    annotationId: string,
  ): Promise<void> {
    await this.client.delete(
      `/conversations/${conversationId}/analyses/${analysisId}/annotations/${annotationId}`,
    );
  }

  // AI-powered question suggestions
  async suggestQuestions(
    title: string,
    description: string,
    existingQuestions: string[] = [],
    rejectedQuestions: string[] = [],
    count: number = 5
  ): Promise<QuestionSuggestionResponse> {
    const response = await this.client.post<QuestionSuggestionResponse>(
      '/conversations/suggest-questions',
      {
        title,
        description,
        existing_questions: existingQuestions,
        rejected_questions: rejectedQuestions,
        count,
      }
    );
    return response.data;
  }

  // Periodic analysis endpoints (for continuous conversations)
  async listPeriodicAnalyses(conversationId: string): Promise<PeriodicAnalysisList> {
    const response = await this.client.get<PeriodicAnalysisList>(
      `/conversations/${conversationId}/periodic-analyses`
    );
    return response.data;
  }

  async getPeriodicAnalysis(conversationId: string, periodLabel: string): Promise<PeriodicAnalysis> {
    const response = await this.client.get<PeriodicAnalysis>(
      `/conversations/${conversationId}/periodic-analyses/${encodeURIComponent(periodLabel)}`
    );
    return response.data;
  }

  async triggerPeriodicAnalysis(
    conversationId: string,
    request?: TriggerPeriodicAnalysisRequest
  ): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(
      `/conversations/${conversationId}/periodic-analyses/trigger`,
      request || {}
    );
    return response.data;
  }

  // Invitation endpoints
  async inviteUsers(conversationId: string, emails: string[]): Promise<InviteUsersResponse> {
    const response = await this.client.post<InviteUsersResponse>(
      `/conversations/${conversationId}/invitations`,
      { emails }
    );
    return response.data;
  }

  async listInvitations(conversationId: string): Promise<InvitationListResponse> {
    const response = await this.client.get<InvitationListResponse>(
      `/conversations/${conversationId}/invitations`
    );
    return response.data;
  }

  async getMyInvitations(): Promise<ConversationInvitationWithConversation[]> {
    const response = await this.client.get<ConversationInvitationWithConversation[]>(
      '/conversations/invitations'
    );
    return response.data;
  }

  async deleteInvitation(conversationId: string, invitationId: string): Promise<SuccessResponse> {
    const response = await this.client.delete<SuccessResponse>(
      `/conversations/${conversationId}/invitations/${invitationId}`
    );
    return response.data;
  }

  async uploadInvitationsCSV(conversationId: string, file: File): Promise<CSVUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post<CSVUploadResult>(
      `${this.client.defaults.baseURL}/conversations/${conversationId}/invitations/upload-csv`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    );
    return response.data;
  }

  // Admin endpoints
  async adminLogin(data: AdminLoginRequest): Promise<AdminToken> {
    const response = await this.client.post<AdminToken>('/admin/login', data);
    return response.data;
  }

  async adminListUsers(email?: string, first_name?: string): Promise<AdminUserInfo[]> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (first_name) params.append('first_name', first_name);
    const query = params.toString();
    const response = await this.client.get<AdminUserInfo[]>(
      `/admin/users${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  async adminListConversations(creator_id?: string): Promise<AdminConversationInfo[]> {
    const params = new URLSearchParams();
    if (creator_id) params.append('creator_id', creator_id);
    const query = params.toString();
    const response = await this.client.get<AdminConversationInfo[]>(
      `/admin/conversations${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  async adminListResponses(user_id?: string, conversation_id?: string): Promise<AdminResponseInfo[]> {
    const params = new URLSearchParams();
    if (user_id) params.append('user_id', user_id);
    if (conversation_id) params.append('conversation_id', conversation_id);
    const query = params.toString();
    const response = await this.client.get<AdminResponseInfo[]>(
      `/admin/responses${query ? `?${query}` : ''}`
    );
    return response.data;
  }

  async adminUpdateConversation(id: string, data: Partial<ConversationCreate>): Promise<AdminConversationInfo> {
    // Use admin token for this request
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      throw new Error('Admin token not found');
    }
    
    const axios = (await import('axios')).default;
    const API_BASE_URL = import.meta.env.VITE_API_URL ||
      (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');
    
    const response = await axios.patch<AdminConversationInfo>(
      `${API_BASE_URL}/admin/conversations/${id}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      }
    );
    return response.data;
  }

  // Organization endpoints
  async createOrganization(data: OrganizationCreate): Promise<OrganizationWithMembers> {
    const response = await this.client.post<OrganizationWithMembers>('/organizations', data);
    return response.data;
  }

  async listOrganizations(): Promise<Organization[]> {
    const response = await this.client.get<Organization[]>('/organizations');
    return response.data;
  }

  async getOrganization(id: string): Promise<OrganizationWithMembers> {
    const response = await this.client.get<OrganizationWithMembers>(`/organizations/${id}`);
    return response.data;
  }

  async updateOrganization(id: string, data: OrganizationUpdate): Promise<Organization> {
    const response = await this.client.patch<Organization>(`/organizations/${id}`, data);
    return response.data;
  }

  async deleteOrganization(id: string): Promise<SuccessResponse> {
    const response = await this.client.delete<SuccessResponse>(`/organizations/${id}`);
    return response.data;
  }

  async addOrganizationMember(orgId: string, userId: string, role: 'admin' | 'member'): Promise<OrganizationMember> {
    const response = await this.client.post<OrganizationMember>(
      `/organizations/${orgId}/members`,
      { user_id: userId, role }
    );
    return response.data;
  }

  async removeOrganizationMember(orgId: string, userId: string): Promise<SuccessResponse> {
    const response = await this.client.delete<SuccessResponse>(
      `/organizations/${orgId}/members/${userId}`
    );
    return response.data;
  }

  async updateOrganizationMemberRole(orgId: string, userId: string, role: 'admin' | 'member'): Promise<OrganizationMember> {
    const response = await this.client.patch<OrganizationMember>(
      `/organizations/${orgId}/members/${userId}`,
      { role }
    );
    return response.data;
  }

  async listOrganizationConversations(orgId: string): Promise<ConversationListItem[]> {
    const response = await this.client.get<ConversationListItem[]>(
      `/organizations/${orgId}/conversations`
    );
    return response.data;
  }

  async inviteToOrganization(orgId: string, request: InviteToOrganizationRequest): Promise<InviteToOrganizationResponse> {
    const response = await this.client.post<InviteToOrganizationResponse>(
      `/organizations/${orgId}/invitations`,
      request
    );
    return response.data;
  }

  async listOrganizationInvitations(orgId: string): Promise<OrganizationInvitationListResponse> {
    const response = await this.client.get<OrganizationInvitationListResponse>(
      `/organizations/${orgId}/invitations`
    );
    return response.data;
  }

  async acceptOrganizationInvitation(token: string): Promise<OrganizationMember> {
    const response = await this.client.post<OrganizationMember>(
      `/organizations/accept-invite/${token}`,
      {}
    );
    return response.data;
  }

  // Workspace endpoints
  async getMyWorkspaces(): Promise<Workspace[]> {
    const response = await this.client.get<Workspace[]>('/workspaces/me');
    return response.data;
  }

  async getOrgWorkspaces(orgId: string): Promise<Workspace[]> {
    const response = await this.client.get<Workspace[]>(`/workspaces/org/${orgId}`);
    return response.data;
  }

  async createWorkspace(data: WorkspaceCreate): Promise<Workspace> {
    const response = await this.client.post<Workspace>('/workspaces', data);
    return response.data;
  }

  async updateWorkspace(id: string, data: Partial<WorkspaceCreate>): Promise<Workspace> {
    const response = await this.client.patch<Workspace>(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.client.delete(`/workspaces/${id}`);
  }

  async addWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await this.client.post(`/workspaces/${workspaceId}/members?user_id=${userId}`);
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
    await this.client.delete(`/workspaces/${workspaceId}/members/${userId}`);
  }

  // Series endpoints
  async createSeries(data: SeriesCreate): Promise<Series> {
    const response = await this.client.post<Series>('/series', data);
    return response.data;
  }

  async listSeries(organizationId?: string, workspaceId?: string): Promise<Series[]> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    else if (organizationId) params.append('organization_id', organizationId);
    const qs = params.toString();
    const response = await this.client.get<Series[]>(`/series${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async getSeries(id: string): Promise<SeriesWithConversations> {
    const response = await this.client.get<SeriesWithConversations>(`/series/${id}`);
    return response.data;
  }

  async updateSeries(id: string, data: SeriesUpdate): Promise<Series> {
    const response = await this.client.patch<Series>(`/series/${id}`, data);
    return response.data;
  }

  async deleteSeries(id: string): Promise<void> {
    await this.client.delete(`/series/${id}`);
  }

  // Collection analysis endpoints
  async getCollectionAnalysis(id: string): Promise<CollectionAnalysis | null> {
    const response = await this.client.get<CollectionAnalysis | null>(`/series/${id}/analysis`);
    return response.data;
  }

  async computeCollectionAnalysis(id: string, force: boolean = false): Promise<CollectionAnalysis> {
    const params = new URLSearchParams();
    params.append('force', force.toString());
    const response = await this.client.post<CollectionAnalysis>(
      `/series/${id}/analyze?${params.toString()}`
    );
    return response.data;
  }

  // Upload endpoints
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    // Use a separate axios instance for file uploads to avoid Content-Type header issues
    const response = await axios.post<{ url: string }>(
      `${this.client.defaults.baseURL}/upload-image`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          // Don't set Content-Type - browser will set it automatically with boundary
        },
      }
    );
    return response.data;
  }

  // Slack integration endpoints
  async getSlackStatus(orgId: string): Promise<SlackWorkspaceStatus> {
    const response = await this.client.get<SlackWorkspaceStatus>(
      `/organizations/${orgId}/slack/status`
    );
    return response.data;
  }

  async initiateSlackInstall(orgId: string): Promise<SlackInstallInitiate> {
    const response = await this.client.get<SlackInstallInitiate>(
      `/organizations/${orgId}/slack/install`
    );
    return response.data;
  }

  async disconnectSlack(orgId: string): Promise<void> {
    await this.client.delete(`/organizations/${orgId}/slack`);
  }

  async listSlackChannels(orgId: string): Promise<SlackChannelListResponse> {
    const response = await this.client.get<SlackChannelListResponse>(
      `/organizations/${orgId}/slack/channels`
    );
    return response.data;
  }

  async getUserSlackStatus(): Promise<UserSlackStatus> {
    const response = await this.client.get<UserSlackStatus>('/user/slack/status');
    return response.data;
  }

  async initiateUserSlackLink(): Promise<SlackInstallInitiate> {
    const response = await this.client.get<SlackInstallInitiate>('/user/slack/link');
    return response.data;
  }

  async unlinkUserSlack(): Promise<void> {
    await this.client.delete('/user/slack');
  }

  // Reminder methods
  async getNonRespondersCount(conversationId: string): Promise<NonRespondersCount> {
    const response = await this.client.get<NonRespondersCount>(
      `/conversations/${conversationId}/non-responders`
    );
    return response.data;
  }

  async createReminder(conversationId: string, scheduledAt?: string): Promise<Reminder> {
    const response = await this.client.post<Reminder>(
      `/conversations/${conversationId}/reminders`,
      { scheduled_at: scheduledAt }
    );
    return response.data;
  }

  async listReminders(conversationId: string): Promise<ReminderListResponse> {
    const response = await this.client.get<ReminderListResponse>(
      `/conversations/${conversationId}/reminders`
    );
    return response.data;
  }

  async cancelReminder(conversationId: string, reminderId: string): Promise<void> {
    await this.client.delete(`/conversations/${conversationId}/reminders/${reminderId}`);
  }

  // Announcement methods
  async createAnnouncement(conversationId: string, message: string): Promise<Announcement> {
    const response = await this.client.post<Announcement>(
      `/conversations/${conversationId}/announcements`,
      { message }
    );
    return response.data;
  }

  async listAnnouncements(conversationId: string): Promise<AnnouncementListResponse> {
    const response = await this.client.get<AnnouncementListResponse>(
      `/conversations/${conversationId}/announcements`
    );
    return response.data;
  }

  async getPublicAnnouncements(conversationId: string, accessCode: string): Promise<AnnouncementListResponse> {
    const response = await this.client.get<AnnouncementListResponse>(
      `/conversations/${conversationId}/announcements/public`,
      { params: { access_code: accessCode } }
    );
    return response.data;
  }

  // Search methods
  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/search', request);
    return response.data;
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<SearchSuggestionsResponse> {
    const response = await this.client.get<SearchSuggestionsResponse>('/search/suggestions', {
      params: { q: query, limit }
    });
    return response.data;
  }

  // Feature flags
  async getUserFeatures(orgId?: string): Promise<{
    features: Record<string, { enabled: boolean; config: Record<string, unknown>; usage: Record<string, number> }>;
    tier: string;
  }> {
    const params = orgId ? `?org_id=${orgId}` : '';
    const response = await this.client.get<{
      features: Record<string, { enabled: boolean; config: Record<string, unknown>; usage: Record<string, number> }>;
      tier: string;
    }>(`/auth/me/features${params}`);
    return response.data;
  }

  // Notifications
  async getNotifications(
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<NotificationListResponse> {
    const response = await this.client.get<NotificationListResponse>('/notifications', {
      params: { limit, offset, unread_only: unreadOnly }
    });
    return response.data;
  }

  async getUnreadNotificationCount(): Promise<UnreadCountResponse> {
    const response = await this.client.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const response = await this.client.post<Notification>(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<{ updated_count: number }> {
    const response = await this.client.post<{ updated_count: number }>('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.client.delete(`/notifications/${notificationId}`);
  }

  // Journal endpoints (individual mode)

  // --- Journal templates (public) ---

  async getJournalTemplates(): Promise<JournalTemplate[]> {
    const response = await this.client.get<JournalTemplate[]>('/journals/templates');
    return response.data;
  }

  // --- Journal CRUD ---

  async createJournal(data: JournalCreate): Promise<Journal> {
    const response = await this.client.post<Journal>('/journals', data);
    return response.data;
  }

  async getJournals(options?: { skip?: number; limit?: number; orgId?: string | null; workspaceId?: string | null }): Promise<JournalListItem[]> {
    const params = new URLSearchParams();
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.limit !== undefined) params.append('limit', String(options.limit));
    if (options?.workspaceId) {
      params.append('workspace_id', options.workspaceId);
    } else if (options?.orgId) {
      params.append('org_id', options.orgId);
    } else {
      params.append('personal', 'true');
    }
    const queryString = params.toString();
    const url = `/journals${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<JournalListItem[]>(url);
    return response.data;
  }

  async getJournal(journalId: string): Promise<Journal> {
    const response = await this.client.get<Journal>(`/journals/${journalId}`);
    return response.data;
  }

  async updateJournal(journalId: string, data: JournalUpdate): Promise<Journal> {
    const response = await this.client.patch<Journal>(`/journals/${journalId}`, data);
    return response.data;
  }

  async deleteJournal(journalId: string): Promise<void> {
    await this.client.delete(`/journals/${journalId}`);
  }

  // --- Journal entries ---

  async getJournalEntries(
    journalId: string,
    options?: { skip?: number; limit?: number }
  ): Promise<JournalEntryList> {
    const params = new URLSearchParams();
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.limit !== undefined) params.append('limit', String(options.limit));
    const queryString = params.toString();
    const url = `/journals/${journalId}/entries${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<JournalEntryList>(url);
    return response.data;
  }

  async createJournalEntry(journalId: string, data: JournalEntryCreate): Promise<JournalEntry> {
    const response = await this.client.post<JournalEntry>(`/journals/${journalId}/entries`, data);
    return response.data;
  }

  async getJournalEntry(journalId: string, entryId: string): Promise<JournalEntry> {
    const response = await this.client.get<JournalEntry>(`/journals/${journalId}/entries/${entryId}`);
    return response.data;
  }

  async updateJournalEntry(journalId: string, entryId: string, data: JournalEntryCreate): Promise<JournalEntry> {
    const response = await this.client.patch<JournalEntry>(`/journals/${journalId}/entries/${entryId}`, data);
    return response.data;
  }

  async deleteJournalEntry(journalId: string, entryId: string): Promise<void> {
    await this.client.delete(`/journals/${journalId}/entries/${entryId}`);
  }

  // --- Journal drafts ---

  async saveJournalDraft(journalId: string, data: JournalDraftData): Promise<JournalDraftSaveResponse> {
    const response = await this.client.post<JournalDraftSaveResponse>(`/journals/${journalId}/draft`, data);
    return response.data;
  }

  async loadJournalDraft(journalId: string): Promise<JournalDraftLoadResponse> {
    const response = await this.client.get<JournalDraftLoadResponse>(`/journals/${journalId}/draft`);
    return response.data;
  }

  async deleteJournalDraft(journalId: string): Promise<void> {
    await this.client.delete(`/journals/${journalId}/draft`);
  }

  // --- Journal analysis ---

  async getJournalAnalysis(journalId: string): Promise<JournalAnalysisStatus> {
    const response = await this.client.get<JournalAnalysisStatus>(`/journals/${journalId}/analysis`);
    return response.data;
  }

  async triggerJournalAnalysis(journalId: string): Promise<{ status: string; message: string; total_entries: number }> {
    const response = await this.client.post<{ status: string; message: string; total_entries: number }>(`/journals/${journalId}/analyze`, {});
    return response.data;
  }

  async getJournalEntryDates(journalId: string): Promise<JournalEntryDate[]> {
    const response = await this.client.get<JournalEntryDate[]>(`/journals/${journalId}/entry-dates`);
    return response.data;
  }

  async listJournalAnalyses(journalId: string): Promise<JournalAnalysisSummary[]> {
    const response = await this.client.get<JournalAnalysisSummary[]>(`/journals/${journalId}/analyses`);
    return response.data;
  }

  // --- Journal sharing ---

  async createJournalShare(journalId: string, data: JournalShareCreate): Promise<JournalShare> {
    const response = await this.client.post<JournalShare>(`/journals/${journalId}/shares`, data);
    return response.data;
  }

  async listJournalShares(journalId: string): Promise<JournalShareListResponse> {
    const response = await this.client.get<JournalShareListResponse>(`/journals/${journalId}/shares`);
    return response.data;
  }

  async revokeJournalShare(journalId: string, shareId: string): Promise<void> {
    await this.client.delete(`/journals/${journalId}/shares/${shareId}`);
  }

  async acceptJournalShare(token: string): Promise<{ status: string; journal_id: string; share_type: string }> {
    const response = await this.client.post<{ status: string; journal_id: string; share_type: string }>(
      `/journals/accept-share/${token}`,
      {}
    );
    return response.data;
  }

  async getSharedJournals(): Promise<SharedJournalListItem[]> {
    const response = await this.client.get<SharedJournalListItem[]>('/journals/shared-with-me');
    return response.data;
  }

  async getSharedJournal(journalId: string): Promise<SharedJournalDetail> {
    const response = await this.client.get<SharedJournalDetail>(`/journals/shared/${journalId}`);
    return response.data;
  }

  async getSharedJournalEntries(
    journalId: string,
    options?: { skip?: number; limit?: number }
  ): Promise<JournalEntryList> {
    const params = new URLSearchParams();
    if (options?.skip !== undefined) params.append('skip', String(options.skip));
    if (options?.limit !== undefined) params.append('limit', String(options.limit));
    const queryString = params.toString();
    const url = `/journals/shared/${journalId}/entries${queryString ? `?${queryString}` : ''}`;
    const response = await this.client.get<JournalEntryList>(url);
    return response.data;
  }

  async getSharedJournalAnalysis(journalId: string): Promise<JournalAnalysisStatus> {
    const response = await this.client.get<JournalAnalysisStatus>(`/journals/shared/${journalId}/analysis`);
    return response.data;
  }

  // Conversation preset endpoints
  async listPresets(options?: { organizationId?: string; workspaceId?: string; includePersonal?: boolean }): Promise<ConversationPreset[]> {
    const params = new URLSearchParams();
    if (options?.workspaceId) params.append('workspace_id', options.workspaceId);
    else if (options?.organizationId) params.append('organization_id', options.organizationId);
    if (options?.includePersonal !== undefined) params.append('include_personal', String(options.includePersonal));
    const queryString = params.toString();
    const url = queryString ? `/presets?${queryString}` : '/presets';
    const response = await this.client.get<ConversationPreset[]>(url);
    return response.data;
  }

  async getPreset(id: string): Promise<ConversationPreset> {
    const response = await this.client.get<ConversationPreset>(`/presets/${id}`);
    return response.data;
  }

  async createPreset(data: PresetCreate): Promise<ConversationPreset> {
    const response = await this.client.post<ConversationPreset>('/presets', data);
    return response.data;
  }

  async updatePreset(id: string, data: PresetUpdate): Promise<ConversationPreset> {
    const response = await this.client.put<ConversationPreset>(`/presets/${id}`, data);
    return response.data;
  }

  async deletePreset(id: string): Promise<void> {
    await this.client.delete(`/presets/${id}`);
  }

  // Invite code endpoints
  async checkInviteCodeRequired(): Promise<{ required: boolean }> {
    const response = await this.client.get<{ required: boolean }>('/invite-codes/check-required');
    return response.data;
  }

  async validateInviteCode(code: string): Promise<{ valid: boolean; message: string }> {
    const response = await this.client.post<{ valid: boolean; message: string }>('/invite-codes/validate', { code });
    return response.data;
  }

  async submitWaitlistRequest(data: { email: string; full_name?: string; message?: string }): Promise<any> {
    const response = await this.client.post('/waitlist/request', data);
    return response.data;
  }

  async generateReferralCode(): Promise<any> {
    const response = await this.client.post('/invite-codes/referral');
    return response.data;
  }

  async getMyReferralCodes(): Promise<any[]> {
    const response = await this.client.get('/invite-codes/my-referrals');
    return response.data;
  }

  // Admin invite code endpoints
  async adminGetInviteCodeStats(): Promise<any> {
    const response = await this.client.get('/admin/invite-codes/stats');
    return response.data;
  }

  async adminGenerateInviteCodes(data: { count: number; label?: string; expires_in_days?: number }): Promise<any[]> {
    const response = await this.client.post('/admin/invite-codes/generate', data);
    return response.data;
  }

  async adminListInviteCodes(params?: { status?: string; code_type?: string; search?: string; limit?: number; offset?: number }): Promise<any[]> {
    const response = await this.client.get('/admin/invite-codes', { params });
    return response.data;
  }

  async adminRevokeInviteCode(id: string): Promise<void> {
    await this.client.delete(`/admin/invite-codes/${id}`);
  }

  async adminListWaitlist(params?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<any[]> {
    const response = await this.client.get('/admin/waitlist', { params });
    return response.data;
  }

  async adminApproveWaitlist(id: string, note?: string): Promise<any> {
    const response = await this.client.post(`/admin/waitlist/${id}/approve`, { note });
    return response.data;
  }

  async adminRejectWaitlist(id: string, note?: string): Promise<any> {
    const response = await this.client.post(`/admin/waitlist/${id}/reject`, { note });
    return response.data;
  }

  async adminGetPlatformSettings(): Promise<any[]> {
    const response = await this.client.get('/admin/platform-settings');
    return response.data;
  }

  async adminUpdatePlatformSetting(key: string, data: { value: string; description?: string }): Promise<any> {
    const response = await this.client.put(`/admin/platform-settings/${key}`, data);
    return response.data;
  }

  // Spaces endpoints

  async getSpaces(options?: { orgId?: string | null; workspaceId?: string | null }): Promise<SpaceListItem[]> {
    const params = new URLSearchParams();
    if (options?.workspaceId) {
      params.append('workspace_id', options.workspaceId);
    } else if (options?.orgId) {
      params.append('org_id', options.orgId);
    } else {
      params.append('personal', 'true');
    }
    const queryString = params.toString();
    const response = await this.client.get<SpaceListItem[]>(`/spaces${queryString ? `?${queryString}` : ''}`);
    return response.data;
  }

  async getSpace(spaceId: string): Promise<Space> {
    const response = await this.client.get<Space>(`/spaces/${spaceId}`);
    return response.data;
  }

  async createSpace(data: SpaceCreate): Promise<Space> {
    const response = await this.client.post<Space>('/spaces', data);
    return response.data;
  }

  async updateSpace(spaceId: string, data: SpaceUpdate): Promise<Space> {
    const response = await this.client.patch<Space>(`/spaces/${spaceId}`, data);
    return response.data;
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}`);
  }

  async getIdeas(spaceId: string, themeId?: string, unthemed?: boolean, since?: string): Promise<SpaceIdea[]> {
    const params = new URLSearchParams();
    if (unthemed) params.set('unthemed', 'true');
    else if (themeId) params.set('theme_id', themeId);
    if (since) params.set('since', since);
    const qs = params.toString();
    const response = await this.client.get<SpaceIdea[]>(`/spaces/${spaceId}/ideas${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async createIdea(spaceId: string, text: string, imageUrl?: string): Promise<SpaceIdea> {
    const body: { text: string; image_url?: string } = { text };
    if (imageUrl) body.image_url = imageUrl;
    const response = await this.client.post<SpaceIdea>(`/spaces/${spaceId}/ideas`, body);
    return response.data;
  }

  async updateIdea(spaceId: string, ideaId: string, text: string): Promise<SpaceIdea> {
    const response = await this.client.patch<SpaceIdea>(`/spaces/${spaceId}/ideas/${ideaId}`, { text });
    return response.data;
  }

  async deleteIdea(spaceId: string, ideaId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/ideas/${ideaId}`);
  }

  async getThemes(spaceId: string): Promise<SpaceTheme[]> {
    const response = await this.client.get<SpaceTheme[]>(`/spaces/${spaceId}/themes`);
    return response.data;
  }

  async updateTheme(spaceId: string, themeId: string, data: { name?: string; color?: string }): Promise<SpaceTheme> {
    const response = await this.client.patch<SpaceTheme>(`/spaces/${spaceId}/themes/${themeId}`, data);
    return response.data;
  }

  async mergeThemes(spaceId: string, sourceThemeId: string, targetThemeId: string): Promise<SpaceTheme> {
    const response = await this.client.post<SpaceTheme>(`/spaces/${spaceId}/themes/merge`, {
      source_theme_id: sourceThemeId,
      target_theme_id: targetThemeId,
    });
    return response.data;
  }

  async deleteTheme(spaceId: string, themeId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/themes/${themeId}`);
  }

  async organizeSpace(spaceId: string): Promise<{ message: string; idea_count: number }> {
    const response = await this.client.post<{ message: string; idea_count: number }>(`/spaces/${spaceId}/organize`);
    return response.data;
  }

  async resynthesizeSpace(spaceId: string, purpose: string): Promise<{ message: string; purpose: string }> {
    const response = await this.client.post<{ message: string; purpose: string }>(`/spaces/${spaceId}/resynthesize`, { purpose });
    return response.data;
  }

  async expandSynthesis(spaceId: string): Promise<{ status: string; expanded_summary?: string; expanded_theme_notes?: Record<string, any>; message?: string }> {
    const response = await this.client.post<{ status: string; expanded_summary?: string; expanded_theme_notes?: Record<string, any>; message?: string }>(`/spaces/${spaceId}/expand-synthesis`);
    return response.data;
  }

  async generateArtifact(spaceId: string, artifactType: string, userContext?: string): Promise<{ id: string; artifact_type: string; status: string; message: string }> {
    const response = await this.client.post<{ id: string; artifact_type: string; status: string; message: string }>(`/spaces/${spaceId}/artifacts`, { artifact_type: artifactType, user_context: userContext });
    return response.data;
  }

  async listArtifacts(spaceId: string): Promise<any[]> {
    const response = await this.client.get<any[]>(`/spaces/${spaceId}/artifacts`);
    return response.data;
  }

  async getArtifact(spaceId: string, artifactId: string): Promise<any> {
    const response = await this.client.get<any>(`/spaces/${spaceId}/artifacts/${artifactId}`);
    return response.data;
  }

  async deleteArtifact(spaceId: string, artifactId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/artifacts/${artifactId}`);
  }

  async getArtifactTypes(spaceId: string): Promise<{ types: Array<{ key: string; label: string; description: string }> }> {
    const response = await this.client.get<{ types: Array<{ key: string; label: string; description: string }> }>(`/spaces/${spaceId}/artifact-types`);
    return response.data;
  }

  async getGraphData(spaceId: string): Promise<GraphData> {
    const response = await this.client.get<GraphData>(`/spaces/${spaceId}/graph`);
    return response.data;
  }

  async updateSynthesisNoteState(
    spaceId: string,
    themeId: string,
    noteIndex: number,
    state: 'accepted' | 'completed' | 'dismissed' | null,
    reason?: string,
    outcome?: string,
    outcomeImageUrl?: string,
  ): Promise<any> {
    const response = await this.client.patch(`/spaces/${spaceId}/synthesis/note-state`, {
      theme_id: themeId,
      note_index: noteIndex,
      state,
      reason: reason || undefined,
      outcome: outcome || undefined,
      outcome_image_url: outcomeImageUrl || undefined,
    });
    return response.data;
  }

  async interpretActionOutcomeImage(
    spaceId: string,
    imageUrl: string,
    actionText: string,
    description?: string,
  ): Promise<{ outcome_text: string }> {
    const response = await this.client.post<{ outcome_text: string }>(
      `/spaces/${spaceId}/actions/interpret-outcome-image`,
      {
        image_url: imageUrl,
        action_text: actionText,
        description: description || undefined,
      },
    );
    return response.data;
  }

  async getEvolution(spaceId: string, limit?: number, since?: string): Promise<OrganizeRun[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (since) params.set('since', since);
    const qs = params.toString();
    const response = await this.client.get<OrganizeRun[]>(`/spaces/${spaceId}/evolution${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  // Space members & invitations

  async getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
    const response = await this.client.get<SpaceMember[]>(`/spaces/${spaceId}/members`);
    return response.data;
  }

  async removeSpaceMember(spaceId: string, userId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/members/${userId}`);
  }

  async inviteToSpace(spaceId: string, emails: string[], role?: 'editor' | 'suggester' | 'viewer'): Promise<{ invitations_created: number; space_id: string }> {
    const response = await this.client.post<{ invitations_created: number; space_id: string }>(
      `/spaces/${spaceId}/invitations`,
      { emails, role: role || 'editor' },
    );
    return response.data;
  }

  async updateSpaceMemberRole(spaceId: string, userId: string, role: 'editor' | 'suggester' | 'viewer'): Promise<SpaceMember> {
    const response = await this.client.patch<SpaceMember>(
      `/spaces/${spaceId}/members/${userId}`,
      { role },
    );
    return response.data;
  }

  async getSpaceInvitations(spaceId: string): Promise<SpaceInvitation[]> {
    const response = await this.client.get<SpaceInvitation[]>(`/spaces/${spaceId}/invitations`);
    return response.data;
  }

  async deleteSpaceInvitation(spaceId: string, invitationId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/invitations/${invitationId}`);
  }

  async acceptSpaceInvitation(token: string): Promise<{ space_id: string }> {
    const response = await this.client.post<{ space_id: string }>(`/spaces/accept-invite/${token}`);
    return response.data;
  }

  async getSuggestions(spaceId: string): Promise<SpaceIdea[]> {
    const response = await this.client.get<SpaceIdea[]>(`/spaces/${spaceId}/suggestions`);
    return response.data;
  }

  async approveSuggestion(spaceId: string, ideaId: string): Promise<SpaceIdea> {
    const response = await this.client.post<SpaceIdea>(`/spaces/${spaceId}/suggestions/${ideaId}/approve`);
    return response.data;
  }

  async rejectSuggestion(spaceId: string, ideaId: string): Promise<void> {
    await this.client.post(`/spaces/${spaceId}/suggestions/${ideaId}/reject`);
  }

  async extractIdeasFromImage(
    spaceId: string,
    imageUrl: string,
    description?: string,
  ): Promise<ImageExtractionResult> {
    const response = await this.client.post<ImageExtractionResult>(
      `/spaces/${spaceId}/ideas/extract-from-image`,
      { image_url: imageUrl, description: description || undefined },
    );
    return response.data;
  }

  async clarifyImageExtraction(
    spaceId: string,
    imageUrl: string,
    description: string | undefined,
    questions: string[],
    answers: string[],
  ): Promise<ImageExtractionResult> {
    const response = await this.client.post<ImageExtractionResult>(
      `/spaces/${spaceId}/ideas/extract-from-image/clarify`,
      {
        image_url: imageUrl,
        description: description || undefined,
        questions,
        answers,
      },
    );
    return response.data;
  }

  async createIdeasBatch(
    spaceId: string,
    ideas: Array<{ text: string; image_url?: string }>,
  ): Promise<SpaceIdea[]> {
    const response = await this.client.post<SpaceIdea[]>(
      `/spaces/${spaceId}/ideas/batch`,
      { ideas },
    );
    return response.data;
  }

  async getStarterPrompts(spaceId: string): Promise<string[] | null> {
    try {
      const response = await this.client.get<{ prompts: string[] | null }>(`/spaces/${spaceId}/starter-prompts`);
      return response.data.prompts;
    } catch {
      return null;
    }
  }

  // Space sharing & snapshots

  async updateSpaceSharing(spaceId: string, shareAccess: string | null): Promise<Space> {
    const response = await this.client.patch<Space>(`/spaces/${spaceId}/sharing`, { share_access: shareAccess });
    return response.data;
  }

  async getSpaceSnapshots(spaceId: string): Promise<Array<{ id: string; space_id: string; created_by_id?: string; title?: string; created_at: string }>> {
    const response = await this.client.get(`/spaces/${spaceId}/snapshots`);
    return response.data;
  }

  async createSpaceSnapshot(spaceId: string, title?: string): Promise<{ id: string; space_id: string; title?: string; created_at: string }> {
    const response = await this.client.post(`/spaces/${spaceId}/snapshots`, { title: title || undefined });
    return response.data;
  }

  async getSpaceSnapshot(spaceId: string, snapshotId: string): Promise<any> {
    const response = await this.client.get(`/spaces/${spaceId}/snapshots/${snapshotId}`);
    return response.data;
  }

  async updateSpaceSnapshot(spaceId: string, snapshotId: string, title: string | null): Promise<any> {
    const response = await this.client.patch(`/spaces/${spaceId}/snapshots/${snapshotId}`, { title });
    return response.data;
  }

  async deleteSpaceSnapshot(spaceId: string, snapshotId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/snapshots/${snapshotId}`);
  }

  // Space shared viewers

  async addSpaceSharedViewer(spaceId: string, email: string, accessLevel: 'space' | 'snapshots' = 'snapshots', canExport: boolean = false): Promise<SpaceSharedViewer> {
    const response = await this.client.post<SpaceSharedViewer>(`/spaces/${spaceId}/shared-viewers`, {
      email,
      access_level: accessLevel,
      can_export: canExport,
    });
    return response.data;
  }

  async listSpaceSharedViewers(spaceId: string): Promise<SpaceSharedViewer[]> {
    const response = await this.client.get<SpaceSharedViewer[]>(`/spaces/${spaceId}/shared-viewers`);
    return response.data;
  }

  async updateSpaceSharedViewer(spaceId: string, viewerId: string, updates: { access_level?: 'space' | 'snapshots'; can_export?: boolean }): Promise<SpaceSharedViewer> {
    const response = await this.client.patch<SpaceSharedViewer>(`/spaces/${spaceId}/shared-viewers/${viewerId}`, updates);
    return response.data;
  }

  async removeSpaceSharedViewer(spaceId: string, viewerId: string): Promise<void> {
    await this.client.delete(`/spaces/${spaceId}/shared-viewers/${viewerId}`);
  }

  async getSpaceActivity(spaceId: string, skip: number = 0, limit: number = 30, since?: string): Promise<SpaceActivityLogPage> {
    const params: Record<string, string | number> = { skip, limit };
    if (since) params.since = since;
    const response = await this.client.get<SpaceActivityLogPage>(`/spaces/${spaceId}/activity`, {
      params,
    });
    return response.data;
  }
  async getWorkspaceActivity(workspaceId: string, skip: number = 0, limit: number = 30): Promise<WorkspaceActivityLogPage> {
    const response = await this.client.get<WorkspaceActivityLogPage>(`/workspaces/${workspaceId}/activity`, {
      params: { skip, limit },
    });
    return response.data;
  }
}

export const api = new ApiService();
