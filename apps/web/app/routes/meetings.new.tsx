import { NewMeeting } from "@/components/meetings/new/NewMeeting";

export function meta() {
  return [{ title: "Schedule a call - Stand-in" }];
}

export default function NewMeetingRoute() {
  return <NewMeeting />;
}
