import { makeErrorSvg } from '../common/utils.js';

export async function fetchDayCard(request, env) {
	const url = new URL(request.url);
	const username = url.searchParams.get('username');

	if (!username) {
		return new Response(makeErrorSvg('Missing parameter: ?username=yourname'), {
			headers: { 'Content-Type': 'image/svg+xml' },
		});
	}

	const headers = {
		'User-Agent': 'readme-contribution-stats',
		Authorization: `Bearer ${env.GITHUB_TOKEN}`,
		'Content-Type': 'application/json',
	};

	const now = new Date();
	const to = now.toISOString();
	const fromDate = new Date(now);
	fromDate.setFullYear(now.getFullYear() - 1);
	const from = fromDate.toISOString();

	const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          startedAt
          endedAt
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                weekday
              }
            }
          }
        }
      }
    }
  `;

	try {
		const response = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers,
			body: JSON.stringify({ query, variables: { username, from, to } }),
		});

		if (!response.ok) {
			throw new Error(`GitHub API Error: ${response.status}`);
		}

		const resJson = await response.json();
		if (resJson.errors) {
			throw new Error(`GitHub GraphQL Error: ${resJson.errors[0].message}`);
		}

		const data = resJson.data.user.contributionsCollection;
		const calendar = data.contributionCalendar;

		// 0=Sun, 1=Mon, ..., 6=Sat
		const dayCounts = [0, 0, 0, 0, 0, 0, 0];

		calendar.weeks.forEach((week) => {
			week.contributionDays.forEach((day) => {
				dayCounts[day.weekday] += day.contributionCount;
			});
		});

		// Rotate array so Monday is first
		// Old: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
		// New: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
		const sundayVal = dayCounts.shift();
		dayCounts.push(sundayVal);

		const maxVal = Math.max(...dayCounts);

		// Format Date Range
		const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		const dateRange = `${formatDate(data.startedAt)} - ${formatDate(data.endedAt)}`;

		const svg = generateBarChartSvg(dayCounts, maxVal, dateRange);

		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': 'public, max-age=14400',
			},
		});
	} catch (err) {
		return new Response(makeErrorSvg(err.message), { status: 500 });
	}
}

function generateBarChartSvg(counts, maxVal, footerText) {
	// Config
	const width = 400;
	const height = 300; // Increased from 180
	const chartHeight = 150; // Increased from 80
	const barWidth = 30;
	const gap = 15;
	const startX = (width - (barWidth * 7 + gap * 6)) / 2;
	const baselineY = 200; // Adjusted for new height

	const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

	const bars = counts
		.map((count, i) => {
			const percent = maxVal > 0 ? count / maxVal : 0;
			const bHeight = Math.max(percent * chartHeight, 4);

			const x = startX + i * (barWidth + gap);
			const y = baselineY - bHeight;

			const isMax = count === maxVal && maxVal > 0;
			const className = isMax ? 'bar-active' : 'bar-normal';

			return `
      <g class="fade-in" style="animation-delay: ${i * 100}ms">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${bHeight}" rx="4" class="${className}" />
        <text x="${x + barWidth / 2}" y="${baselineY + 20}" text-anchor="middle" class="day-label">${days[i]}</text>
      </g>
    `;
		})
		.join('');

	return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .bg { fill: #0d1117; stroke: #30363d; }
        .title { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; font-weight: 600; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; }
        .day-label { font-family: monospace; font-size: 12px; font-weight: 600; }
        
        /* Dark Mode (Default) */
        .bg { fill: #0d1117; stroke: #30363d; }
        .bar-normal { fill: #104C35; } 
        .bar-active { fill: #5FED83; } 
        .day-label { fill: #8b949e; }
        .title { fill: #e6edf3; } /* Shade of black/gray for dark mode (light text) */
        
        /* Light Mode */
        @media (prefers-color-scheme: light) {
          .bg { fill: #ffffff; stroke: #e1e4e8; }
          .bar-normal { fill: #BFFFD1; } 
          .bar-active { fill: #08872B; } 
          .day-label { fill: #57606a; }
          .title { fill: #24292f; } /* Shade of black for light mode */
        }

        .fade-in { opacity: 0; animation: fadeIn 0.6s forwards ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      </style>

      <rect width="100%" height="100%" rx="10" class="bg" />
      
      ${bars}

      <text x="50%" y="${baselineY + 50}" text-anchor="middle" class="title">Contribution Distribution</text>
      
      <text x="50%" y="${
				baselineY + 70
			}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#8b949e" opacity="0.6">${footerText}</text>

    </svg>
  `;
}
