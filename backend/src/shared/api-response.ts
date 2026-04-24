export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
