import {Request} from 'express';

const adminKey = process.env.API_KEY ?? '';
const vapiBearerToken = process.env.VAPI_BEARER_TOKEN ?? '';

export function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return false;
  }

  // Admin key check — exact match against the full header value
  if (adminKey && authHeader === adminKey) {
    return true;
  }

  // VAPI Bearer token check
  if (vapiBearerToken) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token === vapiBearerToken) {
      return true;
    }
  }

  return false;
}
