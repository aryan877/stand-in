import { LandingPage } from "@/components/landing/LandingPage";

export function meta() {
  const title = "Stand-in: an AI that attends your Google Meet when you can't";
  const description =
    "Stand-in joins your Google Meet from your own Chrome, says it's an AI, reads out only the answers you prepared, and you get the notes when the call ends.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
}

export default function LandingRoute() {
  return <LandingPage />;
}
