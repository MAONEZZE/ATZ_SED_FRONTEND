"use client";

import { useState } from "react";

const BACKGROUNDS = [
  "/auth_background/img1.jpg",
  "/auth_background/img2.jpg",
  "/auth_background/img3.jpg",
  "/auth_background/img4.jpg",
  "/auth_background/img5.jpg",
  "/auth_background/img6.jpg",
  "/auth_background/img7.jpg",
  "/auth_background/img8.jpg",
  "/auth_background/img9.jpg",
];

export function useLoginBackground(): { url: string } {
  const [url] = useState(
    () => BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)],
  );
  return { url };
}
