export type ShotData = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

function shot(
  name: string,
  width: number,
  height: number,
  alt: string,
): ShotData {
  return { src: `/landing/${name}.webp`, width, height, alt };
}

export const HERO_VIDEO = "/landing/hero-call.mp4";
export const HERO_POSTER = "/landing/hero-call-poster.webp";

