/** Extract a YouTube video id from any shared link format. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/(?:embed|v|shorts|live)\/([\w-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  // A bare id pasted on its own is still accepted as a fallback.
  if (/^[\w-]{11}$/.test(value)) return value;
  return null;
}

export function youTubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youTubeEmbed(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}
