import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import worker from '../src';

describe('Hello World worker', () => {
	it('responds with Home Page (unit style)', async () => {
		// Mock global fetch for the stars
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ stargazers_count: 123 }),
		});

		const request = new Request('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		const text = await response.text();
		expect(text).toContain('<!DOCTYPE html>');
		expect(text).toContain('Readme Contribution Stats');
	});

	it('responds with Error SVG when type=repos and no username (integration style)', async () => {
		const response = await SELF.fetch('http://example.com/?type=repos');
		expect(await response.text()).toMatchInlineSnapshot(`
		"
		  <svg width="400" height="60" xmlns="http://www.w3.org/2000/svg">
		    <rect width="100%" height="100%" fill="#f8d7da" rx="5"/>
		    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#721c24">Missing parameter: ?type=repos&amp;username=yourname&amp;limit=6</text>
		  </svg>"
	`);
	});
});
