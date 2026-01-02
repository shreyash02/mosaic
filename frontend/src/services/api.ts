import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
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
  Analysis,
  SuccessResponse,
  CodeValidation,
  InviteUsersResponse,
  InvitationListResponse,
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
  Series,
  SeriesCreate,
  SeriesUpdate,
  SeriesWithConversations,
} from '../types';

// Use relative URL when served from same origin, or env var for different origin
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

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
              // Refresh failed, clear tokens and redirect to login
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token, redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
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

  getGoogleLoginUrl(redirect?: string): string {
    const baseUrl = API_BASE_URL.replace('/api', '');
    const url = `${baseUrl}/api/auth/google/login`;
    if (redirect) {
      return `${url}?redirect=${encodeURIComponent(redirect)}`;
    }
    return url;
  }

  // Conversation endpoints
  async createConversation(data: ConversationCreate): Promise<Conversation> {
    const response = await this.client.post<Conversation>('/conversations', data);
    return response.data;
  }

  async getConversations(): Promise<ConversationListItem[]> {
    const response = await this.client.get<ConversationListItem[]>('/conversations');
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
  async triggerAnalysis(conversationId: string): Promise<SuccessResponse> {
    const response = await this.client.post<SuccessResponse>(
      `/conversations/${conversationId}/analyze`,
      {}
    );
    return response.data;
  }

  async getAnalysis(conversationId: string): Promise<Analysis> {
    const response = await this.client.get<Analysis>(`/conversations/${conversationId}/analysis`);
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

  // Series endpoints
  async createSeries(data: SeriesCreate): Promise<Series> {
    const response = await this.client.post<Series>('/series', data);
    return response.data;
  }

  async listSeries(organizationId?: string): Promise<Series[]> {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    const response = await this.client.get<Series[]>(`/series${params}`);
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
}

export const api = new ApiService();
