"use client";

import { useEffect, useState } from "react";

// img2.jpg (12 KB) removed — too small for full-screen background
const BACKGROUNDS = [
  "/auth_background/img1.jpg",
  "/auth_background/img3.jpg",
  "/auth_background/img4.jpg",
  "/auth_background/img5.jpg",
  "/auth_background/img6.jpg",
  "/auth_background/img7.jpg",
  "/auth_background/img8.jpg",
  "/auth_background/img9.jpg",
];

export function useLoginBackground(): { url: string } {
  const [url, setUrl] = useState(BACKGROUNDS[0]);

  useEffect(() => {
    setUrl(BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]);
  }, []);

  return { url };
}
