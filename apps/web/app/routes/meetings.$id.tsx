import { useParams } from "react-router";

import { MeetingPage } from "@/components/meetings/detail/MeetingPage";

export function meta() {
  return [{ title: "Meeting - Stand-in" }];
}

export default function MeetingRoute() {
  const { id } = useParams();
  return <MeetingPage key={id} id={id!} />;
}
