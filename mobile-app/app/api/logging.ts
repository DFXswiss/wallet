/**
 * Centralize logging/error reporting for log abstraction
 */
export const Logging = {
  error (error: any): void {
    // eslint-disable-next-line
    if (__DEV__) {
      console.error(new Date().toISOString(), error);
    }
  },
  info (message: string): void {
    // eslint-disable-next-line
    if (__DEV__) {
      console.log(new Date().toISOString(), message);
    }
  },
};
