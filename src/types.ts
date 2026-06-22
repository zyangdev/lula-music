export interface Song {
  /** YouTube videoId */
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  /** duration in seconds */
  duration?: number;
}

export type RepeatMode = "off" | "all" | "one";
