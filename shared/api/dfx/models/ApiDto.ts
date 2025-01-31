export interface ApiError {
  statusCode: number;
  message: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface SignMessageResponse {
  message: string;
}
