import { fetchRepoCard } from './cards/repos.js';
import { fetchDayCard } from './cards/day.js';
import { makeErrorSvg } from './common/utils.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "repos"; // Default to 'repos'

    // Route the traffic
    switch (type) {
      case 'repos':
        return await fetchRepoCard(request, env);
      
      case 'day':
        return await fetchDayCard(request, env);

      default:
        return new Response(makeErrorSvg("Invalid type parameter. Use ?type=repos or ?type=days"), {
          headers: { "Content-Type": "image/svg+xml" }
        });
    }
  }
};