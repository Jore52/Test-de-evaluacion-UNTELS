export class PublicError extends Error {
  constructor(public code: 'not_found' | 'not_available' | 'invalid' | 'forbidden', message: string) {
    super(message);
  }
}
