import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import LikedSongs from "./pages/LikedSongs";
import History from "./pages/History";
import Downloads from "./pages/Downloads";
import PlaylistDetail from "./pages/PlaylistDetail";
import { convertFileSrc } from "@tauri-apps/api/core";
import { setStreamResolver, usePlayer } from "./store/playerStore";
import { useLibrary } from "./store/libraryStore";
import { useUi } from "./store/uiStore";
import ProfileGate from "./components/ProfileGate";
import { resolveStream } from "./lib/api";
import "./styles.css";

// Resolve playback source: prefer a downloaded local file (offline),
// otherwise resolve a fresh stream URL via the Rust/yt-dlp backend.
setStreamResolver(async (videoId) => {
  const localPath = useLibrary.getState().downloadMap[videoId];
  if (localPath) return convertFileSrc(localPath);
  return resolveStream(videoId);
});

// Load the local library (likes, playlists, downloads) and theme on startup.
// Restore the last session after the library so downloaded paths are known
// before the user resumes playback.
void useLibrary
  .getState()
  .init()
  .then(() => usePlayer.getState().restore());
void useUi.getState().loadAccent();

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "search", element: <Search /> },
      { path: "library", element: <Library /> },
      { path: "library/liked", element: <LikedSongs /> },
      { path: "library/history", element: <History /> },
      { path: "library/downloads", element: <Downloads /> },
      { path: "library/playlist/:id", element: <PlaylistDetail /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ProfileGate>
      <RouterProvider router={router} />
    </ProfileGate>
  </React.StrictMode>,
);
