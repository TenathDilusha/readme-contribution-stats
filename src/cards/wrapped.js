import { makeErrorSvg } from '../common/utils.js';

export async function fetchWrappedCard(request, env) {
  return new Response(makeErrorSvg("Coming Soon: GitHub Wrapped!"), {
    headers: { "Content-Type": "image/svg+xml" }
  });
}