import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src';

describe('Repo Card', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('respects subrequest limits when limit is high', async () => {
		const limit = 10;
		const username = 'testuser';

		// Mock Search Response
		const searchItems = Array.from({ length: 60 }, (_, i) => ({
			repository_url: `https://api.github.com/repos/owner${i}/repo${i}`,
			title: `PR ${i}`,
			labels: [],
			created_at: new Date().toISOString(),
		}));

		globalThis.fetch.mockImplementation(async (url) => {
			const urlStr = url.toString();
			if (urlStr.includes('users/testuser')) {
				return {
					ok: true,
					json: async () => ({ name: 'Test User' }),
				};
			}
			if (urlStr.includes('search/issues')) {
				return {
					ok: true,
					json: async () => ({ items: searchItems }),
				};
			}
			if (urlStr.includes('api.github.com/graphql')) {
				const data = {};
				for (let i = 0; i < 60; i++) {
					data[`repo${i}`] = {
						stargazerCount: 100 + i,
						owner: { avatarUrl: `https://avatars.githubusercontent.com/u/${i}?v=4` },
					};
				}
				return {
					ok: true,
					json: async () => ({ data }),
				};
			}
			if (urlStr.includes('.png')) {
				return {
					ok: true,
					arrayBuffer: async () => new ArrayBuffer(10),
				};
			}
			return { ok: false };
		});

		const request = new Request(`http://example.com/?type=repos&username=${username}&limit=${limit}`);
		const ctx = createExecutionContext();
		await worker.fetch(request, env, ctx);

		const calls = globalThis.fetch.mock.calls.length;
		console.log(`Total fetch calls: ${calls}`);

		// 1 (user) + 1 (search) + 1 (graphql) + limit (10) = 13
		expect(calls).toBeLessThanOrEqual(20);
	});
});
