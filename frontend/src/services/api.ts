import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Conversation,
  ConversationCreate,
  ConversationListItem,
  ResponseSubmit,
  ResponseWithQuestion,
  ResponseStats,
  Analysis,
  SuccessResponse,
  InviteCodeValidation,
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

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear local storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
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

  getGoogleLoginUrl(): string {
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}/api/auth/google/login`;
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

  async getConversation(id: string): Promise<Conversation> {
    const response = await this.client.get<Conversation>(`/conversations/${id}`);
    return response.data;
  }

  async updateConversation(id: string, data: Partial<ConversationCreate>): Promise<Conversation> {
    const response = await this.client.put<Conversation>(`/conversations/${id}`, data);
    return response.data;
  }

  async deleteConversation(id: string): Promise<SuccessResponse> {
    const response = await this.client.delete<SuccessResponse>(`/conversations/${id}`);
    return response.data;
  }

  async activateConversation(id: string, autoCloseAt?: string): Promise<Conversation> {
    const response = await this.client.post<Conversation>(`/conversations/${id}/activate`, {
      auto_close_at: autoCloseAt,
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

  async generateInviteCodes(id: string, count: number): Promise<SuccessResponse> {
    const response = await this.client.post<SuccessResponse>(
      `/conversations/${id}/invite-codes`,
      { count }
    );
    return response.data;
  }

  // Response endpoints
  async validateInviteCode(inviteCode: string): Promise<InviteCodeValidation> {
    const response = await this.client.post<InviteCodeValidation>(
      `/conversations/${inviteCode}/validate`
    );
    return response.data;
  }

  async submitResponse(inviteCode: string, data: ResponseSubmit): Promise<SuccessResponse> {
    const response = await this.client.post<SuccessResponse>(
      `/conversations/${inviteCode}/responses`,
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
}

export const api = new ApiService();
