// Event catalog. Each entry:
//  - name:    human label used in logs
//  - pattern: regex applied to every MC log line (capture groups → build)
//  - channel: webhook name (suffix after DISCORD_WEBHOOK_ lowercase), string
//             OR array for fan-out, OR omitted → falls back to
//             DISCORD_WEBHOOK_URL ("url" channel).
//  - build:   receives the regex match array, returns a Discord webhook
//             payload (usually `{ embeds: [...] }` or `{ content: "..." }`).
//
// To add a new event: append an object to EVENTS. No other code changes.

export const EVENTS = [
  {
    name: "player-join",
    pattern: /\[Server thread\/INFO\]: (\w+) joined the game/,
    channel: "players",
    build: ([, player]) => ({
      embeds: [
        {
          color: 0x22c55e,
          description: `🟢 **${player}** s'est connecté`,
        },
      ],
    }),
  },
  {
    name: "player-leave",
    pattern: /\[Server thread\/INFO\]: (\w+) left the game/,
    channel: "players",
    build: ([, player]) => ({
      embeds: [
        {
          color: 0x6b7280,
          description: `⚪ **${player}** s'est déconnecté`,
        },
      ],
    }),
  },
];

export function matchEvent(line) {
  for (const event of EVENTS) {
    const match = line.match(event.pattern);
    if (match) return { event, match };
  }
  return null;
}
